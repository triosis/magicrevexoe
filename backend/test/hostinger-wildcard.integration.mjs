import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createPool} from 'mysql2/promise'
import {readFile,writeFile,unlink,rmdir} from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import {spawn,execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {once} from 'node:events'
import {join} from 'node:path'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {loadMigrations} from '../dist/migrations/runner.js'
import {targetPolicy,operatorMigrations} from '../dist/migrations/operator.js'
import {digest,verifySchema} from '../dist/migrations/schema.js'
import {inspectGrants} from '../dist/migrations/privileges.js'
import {inspectCloudGrants} from '../dist/migrations/cloud-startup.js'
import {wildcardDatabase as database,wildcardAccount as account,wildcardAcknowledgement,inspectWildcardGrants,wildcardReleaseFingerprint} from '../dist/migrations/hostinger-wildcard.js'
import {privateDirectory,clientConfiguration,nativeEnvironment} from '../scripts/recovery/files.mjs'
import {keys,encryptDump,writeManifest,decryptVerified} from '../scripts/recovery/archive.mjs'
import {snapshot} from '../scripts/recovery/snapshot.mjs'
import {triggerPrivilegeMap} from '../scripts/trigger-privilege-map.mjs'
import {seedCloudTriggers} from './cloud-startup-fixtures.mjs'
import {configuredAuth} from '../dist/auth/configuration.js'
const quote=s=>'`'+s.replaceAll('`','``')+'`',user=account.split('@')[0]
const files=await loadMigrations(new URL('../migrations/',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../docs/schema-manifest.json',import.meta.url))),releaseFingerprint=await wildcardReleaseFingerprint()
const context={wildcardApprovalId:'TEST-ONLY-WILDCARD',localTransportApproval:{acknowledgement:'I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT',approvalId:'TEST-ONLY-TRANSPORT'}}
async function owned(port){
 const fixture=await startDisposableMariaDB(undefined,port?{port}:{}),pools=[],sessions=new Set(),password=randomBytes(32).toString('hex')
 const [publicRows]=await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'");for(const row of publicRows)await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(row.Db)+'.* FROM PUBLIC')
 await fixture.admin.query('CREATE DATABASE '+quote(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 await fixture.admin.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?",[user,password])
 await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(database)+".* TO ?@'127.0.0.1'",[user])
 const pool=createPool({...fixture.options,user,password,database,connectionLimit:3,charset:'utf8mb4',timezone:'Z',supportBigNumbers:true,bigNumberStrings:true});pools.push(pool);pool.on('connection',c=>sessions.add(c))
 const [[id]]=await pool.query('SELECT CURRENT_USER() AS account,@@hostname AS hostname');assert.equal(id.account,account)
 const grants=async()=>(await pool.query('SHOW GRANTS'))[0].map(r=>String(Object.values(r)[0]))
 const phase=async phase=>targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,database,expectedAccount:account,serverHostname:id.hostname,transport:'HOSTINGER_LOCAL',hostingerLocalApprovalId:context.localTransportApproval.approvalId,hostingerWildcard:{phase,approvalId:context.wildcardApprovalId,operatorReference:'TEST-ONLY-OPERATOR',recoveryReference:'TEST-ONLY-RECOVERY',runtimeApprovalReference:'TEST-ONLY-RUNTIME',grantFingerprint:inspectWildcardGrants(await grants(),phase),manifestFingerprint:digest(manifest),releaseFingerprint,notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+1800000).toISOString(),riskAcknowledgement:wildcardAcknowledgement}})
 const transition=async privileges=>{for(const c of sessions)c.destroy();sessions.clear();await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(database)+".* FROM ?@'127.0.0.1'",[user]);await fixture.admin.query('GRANT '+privileges+' ON '+quote(database)+".* TO ?@'127.0.0.1'",[user])}
 return {fixture,pool,pools,password,phase,grants,transition,async close(){for(const c of sessions)c.destroy();for(const p of pools)await p.end();await fixture.close()}}
}
async function command(x,p,name,extra=[]){
 const dir=await privateDirectory(),target=join(dir,'target.json')
 try{
  await writeFile(target,JSON.stringify(p),{flag:'wx',mode:0o600})
  const env={...nativeEnvironment(),MIGRATION_DB_USER:user,MIGRATION_DB_PASSWORD:x.password,HOSTINGER_LOCAL_APPROVAL:context.localTransportApproval.acknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:context.localTransportApproval.approvalId,HOSTINGER_WILDCARD_APPROVAL_ID:context.wildcardApprovalId}
  return await promisify(execFile)(process.execPath,['dist/migrations/operator-cli.js',name,'--target',target,'--environment','production',...extra],{cwd:new URL('..',import.meta.url),env,timeout:30000})
 }finally{await unlink(target);await rmdir(dir)}
}
async function apply(x,cli=false){
 const p=await x.phase('initial'),audit=[]
 if(cli){
  const dir=await privateDirectory(),report=join(dir,'preflight.json'),log=join(dir,'apply.jsonl')
  try{
   await command(x,p,'preflight',['--report',report]);const r=JSON.parse(await readFile(report,'utf8'))
   await command(x,p,'apply',['--approval',report,'--audit',log,'--confirm-production','APPLY-PRODUCTION:'+digest(p)])
   audit.push(...(await readFile(log,'utf8')).trim().split('\n').map(line=>JSON.parse(line)));assert.equal(audit.at(-1).event,'execution_completed')
   return {p,r,audit,result:audit.at(-1).summary}
  }finally{await unlink(report);await unlink(log);await rmdir(dir)}
 }
 const r=await operatorMigrations(x.pool,files,manifest,p,'preflight',context),result=await operatorMigrations(x.pool,files,manifest,p,'apply',{...context,approval:r.approval,productionConfirmation:'APPLY-PRODUCTION:'+digest(p),audit:async e=>audit.push(e)});return {p,r,audit,result}
}

test('raw Hostinger policy: complete migration, phases, guards, native encrypted recovery',{timeout:180000},async t=>{
 const x=await owned(3306),{fixture,pool}=x,map=await triggerPrivilegeMap()
 try{
  await t.test('raw authority remains rejected by strict and existing Cloud policies',async()=>{const rows=await x.grants();for(const p of ['migration','runtime'])assert.throws(()=>inspectGrants(rows,database,p));assert.throws(()=>inspectCloudGrants(rows,database,'initial-maintenance'))})
  await t.test('missing/expired approval, drift and interruption refuse without creating a ledger',async()=>{
   const p=await x.phase('initial');await assert.rejects(operatorMigrations(pool,files,manifest,p,'preflight'),/HOSTINGER_WILDCARD_APPROVAL_REQUIRED/)
   const pre=await operatorMigrations(pool,files,manifest,p,'preflight',context);assert.equal(pre.pending.length,85);assert.equal(pre.exactDatabaseIsolation,false)
   await assert.rejects(operatorMigrations(pool,files,manifest,p,'apply',{...context,approval:{...pre.approval,expiresAt:Date.now()-1},productionConfirmation:'APPLY-PRODUCTION:'+digest(p),audit:async()=>{}}),/RECENT_APPROVAL/)
   await assert.rejects(operatorMigrations(pool,files,manifest,p,'apply',{...context,approval:pre.approval,productionConfirmation:'APPLY-PRODUCTION:'+digest(p),interrupted:()=>true,audit:async()=>{}}),/INTERRUPTED/)
   await x.transition('SELECT,INSERT,UPDATE,CREATE,ALTER,TRIGGER');await assert.rejects(operatorMigrations(pool,files,manifest,p,'preflight',context),/PRIVILEGE_SET_MISMATCH/);await x.transition('ALL PRIVILEGES')
   assert.equal((await pool.query('SHOW TABLES'))[0].length,0)
  })
  await t.test('all85 raw-grant migrations retain ledger, manifest, disclosure and exact46 definers',async()=>{
   const {p,audit,result}=await apply(x,true);assert.equal(result.applied.length,85);assert.equal(result.exactDatabaseIsolation,false);assert.ok(audit.some(e=>e.permissionPolicy==='hostinger-wildcard'&&e.exactDatabaseIsolation===false))
   await assert.rejects(operatorMigrations(pool,files,manifest,p,'preflight',context),/INITIAL_EMPTY_ONLY/)
   const verified=await operatorMigrations(pool,files,manifest,await x.phase('verify'),'verify-complete',context);assert.equal(verified.applied.length,85);assert.equal(verified.permissionPolicyAccepted,true)
   const cli=JSON.parse((await command(x,await x.phase('verify'),'verify-complete')).stdout);assert.equal(cli.exactDatabaseIsolation,false);assert.equal(cli.permissionPolicyAccepted,true);assert.equal(cli.verified,undefined)
   const c=await pool.getConnection();try{await verifySchema(c,manifest,files,85)}finally{c.destroy()}
   const [triggers]=await pool.query('SELECT DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()');assert.equal(triggers.length,46);assert.ok(triggers.every(r=>r.DEFINER===account))
  })
  await t.test('reduced raw runtime still has broader scope, ledger and trigger authority but no ALTER/DELETE',async()=>{
   const lookalike=database.replace('_','X');await pool.query('CREATE DATABASE '+quote(lookalike));await pool.query('CREATE TABLE '+quote(lookalike)+'.probe(id INT)')
   await x.transition('SELECT,INSERT,UPDATE,TRIGGER');const p=await x.phase('runtime');const r=await operatorMigrations(pool,files,manifest,p,'check-runtime',context);assert.equal(r.exactDatabaseIsolation,false)
   const cli=JSON.parse((await command(x,p,'check-runtime')).stdout);assert.equal(cli.verified,undefined);assert.equal(cli.permissionPolicyAccepted,true)
   await pool.query('SELECT * FROM '+quote(lookalike)+'.probe');await pool.query("UPDATE schema_migrations SET status='applied' WHERE version='000000'")
   await pool.query("CREATE TRIGGER wildcard_capability BEFORE UPDATE ON roles FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test'");await pool.query('DROP TRIGGER wildcard_capability')
   await assert.rejects(pool.query('ALTER TABLE users ADD COLUMN forbidden INT'));await assert.rejects(pool.query('DELETE FROM users'))
   await x.transition('ALL PRIVILEGES');await assert.rejects(operatorMigrations(pool,files,manifest,p,'check-runtime',context),/PRIVILEGE_SET_MISMATCH/)
   await x.transition('SELECT,INSERT,UPDATE,TRIGGER');const c=await pool.getConnection();try{await seedCloudTriggers(c)}finally{c.destroy()}
   assert.equal(await probeAll(pool),46)
  })
  await t.test('native encrypted restoration to a second owned instance preserves raw-account definers and complete snapshot',async()=>{
   await x.transition('ALL PRIVILEGES');const source=await pool.getConnection();let captured;try{captured=await snapshot(source)}finally{source.destroy()}
   const dir=await privateDirectory(),key=keys(randomBytes(32).toString('base64')),archive='magicreview-wildcard.sql.aesgcm',manifestFile=join(dir,'backup.json'),plain=join(dir,'verified.sql')
   const cnf=await clientConfiguration({environment:'local',host:'127.0.0.1',port:3306},user,x.password,dir)
   const dump=spawn(join(process.env.MARIADB_TEST_BIN,'mariadb-dump.exe'),['--defaults-file='+cnf,'--single-transaction','--quick','--skip-lock-tables','--triggers','--hex-blob','--no-tablespaces','--skip-add-drop-table','--skip-add-drop-trigger','--skip-add-locks','--skip-disable-keys','--complete-insert','--skip-comments','--skip-dump-date',database],{windowsHide:true,env:nativeEnvironment(),stdio:['ignore','pipe','ignore']});const stopped=once(dump,'close')
   const encoded=await encryptDump(dump.stdout,join(dir,archive),key);assert.equal((await stopped)[0],0)
   await writeManifest(manifestFile,{format:1,complete:true,archive,...encoded,snapshot:captured},key)
   await assert.rejects(decryptVerified(manifestFile,keys(randomBytes(32).toString('base64'))),/AUTHENTICATION/);await decryptVerified(manifestFile,key,plain)
   const y=await owned();try{
    const destination=await privateDirectory(),client=await clientConfiguration({environment:'local',host:'127.0.0.1',port:y.fixture.options.port},user,y.password,destination)
    const child=spawn(join(process.env.MARIADB_TEST_BIN,'mariadb.exe'),['--defaults-file='+client,'--binary-mode',database],{windowsHide:true,env:nativeEnvironment(),stdio:['pipe','ignore','ignore']}),done=once(child,'close');createReadStream(plain).pipe(child.stdin);assert.equal((await done)[0],0)
    const c=await y.pool.getConnection();try{assert.equal((await snapshot(c)).snapshotDigest,captured.snapshotDigest)}finally{c.destroy()}
    await y.transition('SELECT,INSERT,UPDATE,TRIGGER');assert.equal(await probeAll(y.pool,y.fixture),46)
    await unlink(client);await rmdir(destination)
   }finally{await y.close()}
   for(const f of [cnf,plain,manifestFile,join(dir,archive)])await unlink(f);await rmdir(dir)
  })
 }finally{await x.close()}
 async function probeAll(p,ownedFixture=fixture){
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
   const admin=createPool({...ownedFixture.options,database:(await c.query('SELECT DATABASE() AS db'))[0][0].db})
   const a=await admin.getConnection();try{for(const item of map.filter(x=>x.event==='DELETE')){await a.beginTransaction();try{await assert.rejects(a.query('DELETE FROM '+quote(item.subject)+' LIMIT 1'),e=>e.code==='ER_SIGNAL_EXCEPTION');exercised.add(item.trigger)}finally{await a.rollback()}}}finally{a.destroy();await admin.end()}
   assert.equal(exercised.size,46)
  }finally{c.destroy()}
  return exercised.size
 }
})

test('wildcard bootstrap CLI is phase-bound and new owner remains MFA restricted',{timeout:90000},async()=>{
 const x=await owned(3306),dir=await privateDirectory()
 try{
  await apply(x);const policyFile=join(dir,'target.json'),password=randomBytes(32).toString('hex')
  const env={...nativeEnvironment(),BOOTSTRAP_DB_USER:user,BOOTSTRAP_DB_PASSWORD:x.password,BOOTSTRAP_PLATFORM_NAME:'Synthetic platform',BOOTSTRAP_OWNER_EMAIL:'owner@example.invalid',BOOTSTRAP_OWNER_NAME:'Synthetic owner',BOOTSTRAP_OWNER_PASSWORD:password,HOSTINGER_LOCAL_APPROVAL:context.localTransportApproval.acknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:context.localTransportApproval.approvalId,HOSTINGER_WILDCARD_APPROVAL_ID:context.wildcardApprovalId}
  const run=p=>promisify(execFile)(process.execPath,['dist/setup/cli.js','--target',policyFile,'--environment','production','--approve','BOOTSTRAP:'+digest(p)],{cwd:new URL('..',import.meta.url),env,timeout:20000})
  const initial=await x.phase('initial');await writeFile(policyFile,JSON.stringify(initial));await assert.rejects(run(initial))
  const p=await x.phase('bootstrap');await writeFile(policyFile,JSON.stringify(p));const result=await run(p);assert.match(result.stdout,/"created":true/);assert.ok(!result.stdout.includes(password))
  const auth=configuredAuth(x.pool,{NODE_ENV:'test',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64')})
  const challenge=await auth.login('owner@example.invalid',password);assert.equal(challenge.mfaRequired,true);assert.equal(challenge.accessToken,undefined)
  await x.transition('SELECT,INSERT,UPDATE,TRIGGER');assert.equal((await operatorMigrations(x.pool,files,manifest,await x.phase('runtime'),'check-runtime',context)).permissionPolicyAccepted,true)
  await unlink(policyFile)
 }finally{await x.close();await rmdir(dir)}
})

test('wildcard expiry after committed ledger step blocks further DDL and partial restart',{timeout:30000},async()=>{
 const x=await owned(3306),now=Date.now
 try{
  const p=await x.phase('initial'),pre=await operatorMigrations(x.pool,files,manifest,p,'preflight',context)
  try{await assert.rejects(operatorMigrations(x.pool,files,manifest,p,'apply',{...context,approval:pre.approval,productionConfirmation:'APPLY-PRODUCTION:'+digest(p),audit:async e=>{if(e.event==='step_applied'&&e.version==='000000')Date.now=()=>now()+3600000}}),/APPROVAL_EXPIRED|RECENT_APPROVAL/)}finally{Date.now=now}
  assert.equal((await x.pool.query('SELECT COUNT(*) AS n FROM schema_migrations'))[0][0].n,'1')
  await assert.rejects(operatorMigrations(x.pool,files,manifest,await x.phase('initial'),'preflight',context),/INITIAL_EMPTY_ONLY/)
  await assert.rejects(operatorMigrations(x.pool,files,manifest,await x.phase('verify'),'verify-complete',context),/INCOMPLETE_SCHEMA/)
 }finally{Date.now=now;await x.close()}
})
