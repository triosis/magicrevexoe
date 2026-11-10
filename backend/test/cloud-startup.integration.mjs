import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createPool} from 'mysql2/promise'
import {mkdtemp,readFile,writeFile} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {loadMigrations} from '../dist/migrations/runner.js'
import {targetPolicy,operatorMigrations} from '../dist/migrations/operator.js'
import {inspectGrants} from '../dist/migrations/privileges.js'
import {digest} from '../dist/migrations/schema.js'
import {checkCloudApproval,inspectCloudGrants,verifyCloudGrants,cloudRiskAcknowledgement} from '../dist/migrations/cloud-startup.js'
import {triggerPrivilegeMap} from '../scripts/trigger-privilege-map.mjs'
import {seedCloudTriggers} from './cloud-startup-fixtures.mjs'
import {bootstrapPlatform} from '../dist/setup/bootstrap.js'
import {backup,restore} from '../scripts/recovery/utility.mjs'
const quote=s=>'`'+s.replaceAll('`','``')+'`'
test('Cloud Startup single-account maintenance, reduced privileges, all triggers and recovery',{timeout:180000},async t=>{
 const fixture=await startDisposableMariaDB(undefined,{port:3306}),pools=[],sessions=new Set()
 const database='magicreview_migration_cloud_'+randomBytes(5).toString('hex'),restored=database+'_restored',user='cloud_single',password=randomBytes(32).toString('hex'),account=user+'@localhost',map=await triggerPrivilegeMap()
 const poolFor=name=>{const p=createPool({...fixture.options,user,password,database:name,connectionLimit:2,charset:'utf8mb4',timezone:'Z',supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false});p.on('connection',c=>sessions.add(c));pools.push(p);return p}
 const files=await loadMigrations(new URL('../migrations/',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../docs/schema-manifest.json',import.meta.url)))
 const scope=name=>quote(name.replaceAll('_','\\_'))+'.*'
 const ddl=sql=>fixture.admin.query(sql)
 const grants=async db=>(await db.query('SHOW GRANTS'))[0].map(row=>String(Object.values(row)[0]))
 const context={cloudApprovalId:'TEST-ONLY-CLOUD-APPROVAL',localTransportApproval:{acknowledgement:'I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT',approvalId:'TEST-ONLY-TRANSPORT'}}
 let pool,policy,report,events=[]
 const cloud=(fingerprint,profile='initial-maintenance')=>({profile,approvalId:context.cloudApprovalId,operatorReference:'TEST-ONLY-OPERATOR',recoveryReference:'TEST-ONLY-RESTORE-REHEARSAL',grantFingerprint:fingerprint,manifestFingerprint:digest(manifest),notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+1800000).toISOString(),riskAcknowledgement:cloudRiskAcknowledgement})
 const transition=async(name,privileges)=>{for(const c of sessions)c.destroy();sessions.clear();await ddl('REVOKE ALL PRIVILEGES ON '+scope(name)+" FROM '"+user+"'@'localhost'");await ddl('GRANT '+privileges+' ON '+scope(name)+" TO '"+user+"'@'localhost'")}
 async function probeAll(p){
  const c=await p.getConnection(),exercised=new Set()
  try{
   const [triggers]=await c.query('SELECT TRIGGER_NAME,EVENT_OBJECT_TABLE,EVENT_MANIPULATION,DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')
   assert.equal(triggers.length,46);assert.ok(triggers.every(row=>row.DEFINER===account))
   for(const table of [...new Set(map.filter(x=>x.event==='UPDATE').map(x=>x.subject))]){
    const [[row]]=await c.query('SELECT * FROM '+quote(table)+' LIMIT 1');assert.ok(row,'missing fixture '+table)
    const [columns]=await c.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND EXTRA NOT LIKE ?', [table,'%GENERATED%'])
    const column=columns[0].COLUMN_NAME
    try{await c.query('UPDATE '+quote(table)+' SET '+quote(column)+'='+quote(column)+' LIMIT 1')}catch(e){assert.equal(e.code,'ER_SIGNAL_EXCEPTION',table)}
    for(const item of map.filter(x=>x.subject===table&&x.event==='UPDATE'))exercised.add(item.trigger)
   }
   // Every INSERT guard was exercised by seedCloudTriggers with this exact reduced
   // account. Invoke again in a rolled-back copy; duplicate-key is after BEFORE.
   for(const table of [...new Set(map.filter(x=>x.event==='INSERT').map(x=>x.subject))]){
    const [cols]=await c.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND EXTRA NOT LIKE '%GENERATED%' ORDER BY ORDINAL_POSITION",[table]);const names=cols.map(x=>quote(x.COLUMN_NAME)).join(',')
    await c.beginTransaction();try{await c.query('INSERT INTO '+quote(table)+' ('+names+') SELECT '+names+' FROM '+quote(table)+' LIMIT 1')}catch(e){assert.ok(['ER_DUP_ENTRY','ER_SIGNAL_EXCEPTION'].includes(e.code),table+': '+e.code)}finally{await c.rollback()}
    for(const item of map.filter(x=>x.subject===table&&x.event==='INSERT'))exercised.add(item.trigger)
   }
   // Runtime has no DELETE. A harness-admin invoker exercises DELETE guards under
   // the reduced same-account DEFINER, always inside a rollback-only transaction.
   const admin=createPool({...fixture.options,database:(await c.query('SELECT DATABASE() AS db'))[0][0].db});pools.push(admin)
   const a=await admin.getConnection();try{for(const item of map.filter(x=>x.event==='DELETE')){await a.beginTransaction();try{await assert.rejects(a.query('DELETE FROM '+quote(item.subject)+' LIMIT 1'),e=>e.code==='ER_SIGNAL_EXCEPTION');exercised.add(item.trigger)}finally{await a.rollback()}}}finally{a.destroy()}
   assert.equal(exercised.size,46)
  }finally{c.destroy()}
  return exercised.size
 }
 try{
  for(const name of [database,restored])await ddl('CREATE DATABASE '+quote(name)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const [publicRows]=await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'");for(const r of publicRows)await ddl('REVOKE ALL PRIVILEGES ON '+quote(r.Db)+'.* FROM PUBLIC')
  await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[user,password]);await ddl('GRANT ALL PRIVILEGES ON '+scope(database)+" TO '"+user+"'@'localhost'");pool=poolFor(database)
  const c=await pool.getConnection();try{const [[server]]=await c.query('SELECT @@hostname AS name');policy=targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,database,serverHostname:server.name,expectedAccount:account,transport:'HOSTINGER_LOCAL',hostingerLocalApprovalId:context.localTransportApproval.approvalId,cloudStartup:cloud(inspectCloudGrants(await grants(c),database,'initial-maintenance'))})}finally{c.destroy()}
  await t.test('strict default rejects ALL; independent explicit profile preflight is read-only',async()=>{const c=await pool.getConnection();try{const awaitValue=await grants(c);for(const profile of ['migration','runtime'])assert.throws(()=>inspectGrants(awaitValue,database,profile))}finally{c.destroy()};await assert.rejects(operatorMigrations(pool,files,manifest,policy,'preflight'),/HOSTINGER_LOCAL|CLOUD_STARTUP/);report=await operatorMigrations(pool,files,manifest,policy,'preflight',context);assert.equal(report.pending.length,85);assert.equal(report.encrypted,false);assert.equal((await pool.query('SHOW TABLES'))[0].length,0)})
  await t.test('grant drift and changed approval invalidate apply before ledger',async()=>{await transition(database,'SELECT,INSERT,UPDATE,CREATE,ALTER,TRIGGER');await assert.rejects(operatorMigrations(pool,files,manifest,policy,'apply',{...context,approval:report.approval,productionConfirmation:'APPLY-PRODUCTION:'+digest(policy),audit:async()=>{}}),/GRANT_FINGERPRINT/);assert.equal((await pool.query('SHOW TABLES'))[0].length,0);await transition(database,'ALL PRIVILEGES')})
  await t.test('expiry between statements stops next DDL and initial-only mode refuses partial restart',async()=>{
   const name=database+'_expiry',u='cloud_expiry',p=randomBytes(32).toString('hex');await ddl('CREATE DATABASE '+quote(name)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[u,p]);await ddl('GRANT ALL PRIVILEGES ON '+scope(name)+" TO '"+u+"'@'localhost'")
   const owned=createPool({...fixture.options,user:u,password:p,database:name,supportBigNumbers:true,bigNumberStrings:true});pools.push(owned);owned.on('connection',c=>sessions.add(c));const c=await owned.getConnection();let ep;try{ep=targetPolicy.parse({...policy,database:name,expectedAccount:u+'@localhost',cloudStartup:cloud(inspectCloudGrants(await grants(c),name,'initial-maintenance'))})}finally{c.destroy()}
   const pre=await operatorMigrations(owned,files,manifest,ep,'preflight',context),now=Date.now
   try{await assert.rejects(operatorMigrations(owned,files,manifest,ep,'apply',{...context,approval:pre.approval,productionConfirmation:'APPLY-PRODUCTION:'+digest(ep),audit:async event=>{if(event.event==='step_applied'&&event.version==='000000')Date.now=()=>now()+3600000}}),/APPROVAL_EXPIRED|RECENT_APPROVAL/)}finally{Date.now=now}
   assert.equal((await owned.query('SELECT COUNT(*) AS n FROM schema_migrations'))[0][0].n,'1');await assert.rejects(operatorMigrations(owned,files,manifest,ep,'preflight',context),/INITIAL_EMPTY_ONLY/)
  })
  await t.test('approved initial migration produces full manifest and immutable SQL history',async()=>{report=await operatorMigrations(pool,files,manifest,policy,'preflight',context);const result=await operatorMigrations(pool,files,manifest,policy,'apply',{...context,approval:report.approval,productionConfirmation:'APPLY-PRODUCTION:'+digest(policy),audit:async e=>events.push(e)});assert.equal(result.applied.length,85);assert.ok(events.some(e=>e.cloudProfile==='initial-maintenance'));await assert.rejects(operatorMigrations(pool,files,manifest,policy,'preflight',context),/INITIAL_EMPTY_ONLY/)})
  await t.test('bootstrap retains independent approval semantics and shared account identity',async()=>{const result=await bootstrapPlatform(pool,{platformName:'Synthetic owner',email:'owner@example.invalid',displayName:'Synthetic owner',password:randomBytes(24).toString('hex')},()=>checkCloudApproval(policy,context.cloudApprovalId));assert.equal(result.created,true)})
  // Probe fixture needs a new identity store, so use a separate second owned schema
  // for full behavioral/recovery rehearsal, not deleting bootstrap state.
  await t.test('reduced database-wide profile supports application DML but refuses broad DDL and DELETE',async()=>{
   await transition(database,'SELECT,INSERT,UPDATE,TRIGGER');const c=await pool.getConnection();let runtimePolicy;try{const p=cloud(inspectCloudGrants(await grants(c),database,'runtime-dbwide'),'runtime-dbwide');runtimePolicy=targetPolicy.parse({...policy,cloudStartup:p});await verifyCloudGrants(c,database,p);await assert.rejects(c.query('ALTER TABLE users ADD COLUMN forbidden INT'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');await assert.rejects(c.query('DELETE FROM users'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');await c.beginTransaction();await c.query("UPDATE schema_migrations SET status='applied' WHERE version='000000'");await c.rollback();assert.ok((await c.query('SELECT COUNT(*) AS n FROM schema_migrations'))[0])}finally{c.destroy()}
   const dir=await mkdtemp(join(tmpdir(),'cloud-runtime-policy-')),file=join(dir,'target.json');await writeFile(file,JSON.stringify(runtimePolicy));const system=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase()))),env={...system,MIGRATION_DB_USER:user,MIGRATION_DB_PASSWORD:password,HOSTINGER_LOCAL_APPROVAL:context.localTransportApproval.acknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:context.localTransportApproval.approvalId,CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID:context.cloudApprovalId}
   const result=await promisify(execFile)(process.execPath,['dist/migrations/operator-cli.js','check-runtime','--target',file,'--environment','production'],{cwd:new URL('..',import.meta.url),env,timeout:15000}),verified=JSON.parse(result.stdout);assert.equal(verified.cloudProfile,'runtime-dbwide');assert.equal(verified.encrypted,false);assert.deepEqual(verified.retainedSchemaPrivileges,['SELECT','INSERT','UPDATE','TRIGGER']);assert.ok(verified.risks.some(r=>r.includes('ledger')))
  })
  // Seed without another root; harness owns bootstrap root/user, so use separate
  // fully migrated behavioral schema with the same account and exact grant profile.
  const behavior=database+'_behavior';await ddl('CREATE DATABASE '+quote(behavior)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await ddl('GRANT ALL PRIVILEGES ON '+scope(behavior)+" TO '"+user+"'@'localhost'");const behaviorPool=poolFor(behavior)
  const {runMigrations}=await import('../dist/migrations/runner.js');await runMigrations(behaviorPool,files,'up');await transition(behavior,'SELECT,INSERT,UPDATE,TRIGGER')
  await t.test('all 46 original trigger bodies activate with the reduced shared definer',async()=>{const c=await behaviorPool.getConnection();try{await seedCloudTriggers(c)}finally{c.destroy()};assert.equal(await probeAll(behaviorPool),46)})
  await t.test('retained database-wide rights really permit trigger management and ledger writes',async()=>{
   await behaviorPool.query("CREATE TRIGGER cloud_retained_capability BEFORE UPDATE ON roles FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic capability proof'");await assert.rejects(behaviorPool.query('UPDATE roles SET name=name LIMIT 1'),e=>e.code==='ER_SIGNAL_EXCEPTION');await behaviorPool.query('DROP TRIGGER cloud_retained_capability')
   const c=await behaviorPool.getConnection();try{await c.beginTransaction();await c.query("UPDATE schema_migrations SET failure_code='TEST_ONLY_CAPABILITY' WHERE version='000000'");assert.equal((await c.query("SELECT failure_code FROM schema_migrations WHERE version='000000'"))[0][0].failure_code,'TEST_ONLY_CAPABILITY');await c.rollback()}finally{c.destroy()}
  })
  await t.test('removing sole definer TRIGGER breaks guard activation; retention is a persistent risk',async()=>{await transition(behavior,'SELECT,INSERT,UPDATE');await assert.rejects(behaviorPool.query('UPDATE tenants SET name=name LIMIT 1'));await transition(behavior,'SELECT,INSERT,UPDATE,TRIGGER');await behaviorPool.query('UPDATE tenants SET name=name LIMIT 1')})
  await t.test('encrypted native dump/restore preserves all definer identities, schema and synthetic rows',async()=>{
   await transition(behavior,'ALL PRIVILEGES');await ddl('GRANT ALL PRIVILEGES ON '+scope(restored)+" TO '"+user+"'@'localhost'")
   const local=name=>({environment:'local',host:'127.0.0.1',port:3306,database:name,serverHostname:policy.serverHostname,expectedAccount:account})
   const out=await mkdtemp(join(tmpdir(),'revexoe-cloud-recovery-')),encryptionKey=randomBytes(32).toString('base64'),options={user,password,bin:process.env.MARIADB_TEST_BIN,encryptionKey}
   const saved=await backup({...options,policy:local(behavior),outputRoot:out,keyId:'TEST-ONLY-KEY'})
   const bad=JSON.parse(JSON.parse(await readFile(saved.manifestFile)).body);assert.equal(bad.snapshot.triggerDefiners.length,46)
   const result=await restore({...options,policy:local(restored),manifestFile:saved.manifestFile,confirmation:'RESTORE-EMPTY:'+digest(targetPolicy.parse(local(restored))),outputRoot:out});assert.equal(result.restoreVerified,true);assert.equal(result.triggerCount,46)
   await transition(restored,'SELECT,INSERT,UPDATE,TRIGGER');assert.equal(await probeAll(poolFor(restored)),46)
  })
 }finally{for(const c of sessions)c.destroy();for(const p of pools)await p.end();await fixture.close()}
})
