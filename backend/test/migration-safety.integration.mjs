import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes,createHash} from 'node:crypto'
import {readFile,writeFile,mkdtemp} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {operatorMigrations} from '../dist/migrations/operator.js'
import {verifyPrivileges,runtimePrivileges} from '../dist/migrations/privileges.js'
import {inspectSchema,digest} from '../dist/migrations/schema.js'

test('approved migration safety and least privilege on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set(),pools=[]
 const files=await loadMigrations(new URL('../migrations/',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../docs/schema-manifest.json',import.meta.url),'utf8'))
 const [[server]]=await fixture.admin.query('SELECT @@hostname AS hostname')
 let n=0,complete
 const quote=s=>'`'+s.replaceAll('`','``')+'`'
 async function database(){
  const database='magicreview_migration_safe_'+(++n),user='migration_'+n,password=randomBytes(24).toString('hex')
  await fixture.admin.query(`CREATE DATABASE ${quote(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await fixture.admin.query('CREATE USER ?@\'localhost\' IDENTIFIED BY ?',[user,password])
  await fixture.admin.query(`GRANT SELECT,CREATE,ALTER,TRIGGER ON ${quote(database.replaceAll('_','\\_'))}.* TO ?@'localhost'`,[user])
  for(const table of ['schema_migrations','industry_channels','roles','permissions','role_permissions'])await fixture.admin.query(`GRANT CREATE,INSERT${table==='schema_migrations'?',UPDATE':''} ON ${quote(database)}.${quote(table)} TO ?@'localhost'`,[user])
  function pool(who,credential){const pool=createDatabasePool({DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:database,DB_USER:who,DB_PASSWORD:credential,DB_CONNECTION_LIMIT:3});pool.on('connection',c=>sessions.add(c));pools.push(pool);return pool}
  const migration=pool(user,password),admin=pool('root',fixture.options.password);const policy={environment:'local',host:'127.0.0.1',port:fixture.options.port,database,serverHostname:server.hostname,expectedAccount:user+'@localhost',allowedTriggerDefiners:[]}
  return {migration,admin,policy,user,password,pool}
 }
 const query=async(pool,sql,args=[]) => (await pool.query(sql,args))[0]
 const pre=x=>operatorMigrations(x.migration,files,manifest,x.policy,'preflight')
 const apply=async(x,options={})=>{const report=await pre(x),events=[];const result=await operatorMigrations(x.migration,files,manifest,x.policy,'apply',{approval:report.approval,audit:async e=>events.push(e),...options});return {result,events}}
 try{
  await t.test('inherited PUBLIC test-schema privileges are detected rather than ignored',async()=>{
   const x=await database();await assert.rejects(pre(x),/PUBLIC_GRANTS_REQUIRE_REVIEW/);
   // Harness-owned instance only: remove installer PUBLIC test grants before
   // proving genuinely restricted accounts. No provider/global setting is touched.
   const [grants]=await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'");for(const row of grants)await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(row.Db)+'.* FROM PUBLIC')
  })
  await t.test('fresh read-only preflight creates no tables/ledger or seed data; scoped migration account succeeds',async()=>{
   complete=await database();const report=await pre(complete);assert.equal(report.initialized,false);assert.equal(report.pending.length,67)
   assert.equal((await query(complete.admin,'SHOW TABLES')).length,0)
   const {result,events}=await apply(complete);assert.equal(result.applied.length,67);assert.equal(events.filter(e=>e.event==='step_applied').length,67)
   assert.equal((await query(complete.admin,'SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'))[0].n,'35')
   const before=await query(complete.admin,'SELECT * FROM schema_migrations ORDER BY version');assert.deepEqual((await pre(complete)).pending,[]);assert.deepEqual(await query(complete.admin,'SELECT * FROM schema_migrations ORDER BY version'),before)
  })
  await t.test('restricted runtime account has exact application DML, no ledger access, no DDL and no append-only UPDATE',async()=>{
   const user='runtime_fixture',password=randomBytes(24).toString('hex');await fixture.admin.query('CREATE USER ?@\'localhost\' IDENTIFIED BY ?',[user,password])
   for(const [table,privs]of Object.entries(runtimePrivileges))await fixture.admin.query(`GRANT ${privs.join(',')} ON ${quote(complete.policy.database)}.${quote(table)} TO ?@'localhost'`,[user])
   const runtime=complete.pool(user,password),c=await runtime.getConnection();try{assert.ok((await verifyPrivileges(c,complete.policy.database,'runtime')).fingerprint)}finally{c.release()}
   await assert.rejects(query(runtime,'SELECT * FROM schema_migrations'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR')
   await assert.rejects(query(runtime,"UPDATE schema_migrations SET status='applied' WHERE version='000000'"),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR')
   await assert.rejects(query(runtime,'ALTER TABLE users ADD COLUMN forbidden_fixture INT'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR')
   await assert.rejects(query(runtime,"UPDATE audit_logs SET outcome='success' WHERE id=0"),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR')
   await assert.rejects(query(runtime,'CREATE TABLE forbidden_fixture(id INT)'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR')
   assert.equal((await query(runtime,'SELECT COUNT(*) AS n FROM permissions'))[0].n,'16')
   // A real trigger executes using the scoped migration definer, without runtime TRIGGER rights.
   const id=randomBytes(16);await query(runtime,"INSERT INTO tenants(public_id,kind,name) VALUES (?,'platform','Privilege fixture')",[id]);await assert.rejects(query(runtime,'UPDATE tenants SET public_id=? WHERE public_id=?',[randomBytes(16),id]),e=>e.code==='ER_SIGNAL_EXCEPTION')
  })
  await t.test('unexpected target, missing grants and excessive privileges fail before ledger writes',async()=>{
   const x=await database();await assert.rejects(operatorMigrations(x.migration,files,manifest,{...x.policy,database:'wrong'},'preflight'),/UNEXPECTED_DATABASE_TARGET/)
   await fixture.admin.query(`REVOKE TRIGGER ON ${quote(x.policy.database.replaceAll('_','\\_'))}.* FROM ?@'localhost'`,[x.user]);await assert.rejects(pre(x),/MISSING_REQUIRED_PRIVILEGES/);assert.equal((await query(x.admin,'SHOW TABLES')).length,0)
   await fixture.admin.query(`GRANT TRIGGER,DELETE ON ${quote(x.policy.database.replaceAll('_','\\_'))}.* TO ?@'localhost'`,[x.user]);await assert.rejects(pre(x),/EXCESSIVE_GRANTS/)
  })
  await t.test('untracked existing schema, checksum conflict and stale approval never baseline or overwrite',async()=>{
   const x=await database(),report=await pre(x);await query(x.admin,'CREATE TABLE unexpected_fixture(id INT) ENGINE=InnoDB');await assert.rejects(pre(x),/BASELINE_REVIEW/)
   const changed=structuredClone(manifest);changed.checksums[0]='00'.repeat(32);await assert.rejects(operatorMigrations(complete.migration,files,changed,complete.policy,'preflight'),/MANIFEST_MISMATCH/)
   await assert.rejects(operatorMigrations(complete.migration,files,manifest,complete.policy,'apply',{approval:report.approval,audit:async()=>{}}),/APPROVAL_MISMATCH/)
   await query(complete.admin,"UPDATE schema_migrations SET checksum=? WHERE version='000066'",[Buffer.alloc(32)]);await assert.rejects(pre(complete),/CHECKSUM_MISMATCH/);await query(complete.admin,"UPDATE schema_migrations SET checksum=? WHERE version='000066'",[files.at(-1).checksum])
  })
  await t.test('unexpected column/index/trigger and missing index/table are detected against exact applied prefix',async()=>{
   const x=await database();await runMigrations(x.migration,files.slice(0,4),'up')
   await query(x.admin,'ALTER TABLE users ADD COLUMN drift_fixture INT');await assert.rejects(pre(x),/SCHEMA_DRIFT/)
   const y=await database();await runMigrations(y.migration,files.slice(0,4),'up');await query(y.admin,'ALTER TABLE users DROP INDEX ix_user_status');await assert.rejects(pre(y),/SCHEMA_DRIFT/)
   const z=await database();await runMigrations(z.migration,files.slice(0,4),'up');await query(z.admin,'CREATE INDEX drift_fixture ON users(display_name)');await assert.rejects(pre(z),/SCHEMA_DRIFT/)
   const a=await database();await runMigrations(a.migration,files.slice(0,4),'up');await query(a.admin,"CREATE TRIGGER drift_fixture BEFORE UPDATE ON users FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture'");await assert.rejects(pre(a),/SCHEMA_DRIFT/)
   const body=await database();await runMigrations(body.migration,files.slice(0,25),'up');await query(body.migration,"CREATE OR REPLACE TRIGGER protect_tenants_owner BEFORE UPDATE ON tenants FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='stricter fixture guard'");await assert.rejects(pre(body),/SCHEMA_DRIFT/)
   // Simulate an interrupted CREATE that was incorrectly marked applied, without deleting tables.
   const b=await database();await runMigrations(b.migration,files.slice(0,3),'up');await query(b.admin,"INSERT INTO schema_migrations(version,name,checksum,status,runner_id) VALUES (?,?,?,'applied',?)",[files[3].version,files[3].name,files[3].checksum,randomBytes(16)]);await assert.rejects(pre(b),/SCHEMA_DRIFT/)
  })
  await t.test('same advisory lock excludes concurrent operator attempts',async()=>{
   const c=await complete.admin.getConnection(),key='magicreview:migrate:'+createHash('sha256').update(complete.policy.database).digest('hex').slice(0,40)
   try{await c.execute('SELECT GET_LOCK(?,0)',[key]);await assert.rejects(pre(complete),/LOCK_UNAVAILABLE/)}finally{await c.execute('SELECT RELEASE_LOCK(?)',[key]);c.release()}
  })
  await t.test('cooperative interruption stops at a verified boundary and requires fresh approval',async()=>{
   const x=await database();let stop=false;const report=await pre(x)
   await assert.rejects(operatorMigrations(x.migration,files,manifest,x.policy,'apply',{approval:report.approval,audit:async e=>{if(e.event==='step_applied'&&e.version==='000002')stop=true},interrupted:()=>stop}),/MIGRATION_INTERRUPTED/)
   const rows=await query(x.admin,'SELECT status FROM schema_migrations');assert.equal(rows.length,3);assert.ok(rows.every(r=>r.status==='applied'))
   await assert.rejects(operatorMigrations(x.migration,files,manifest,x.policy,'apply',{approval:report.approval,audit:async()=>{}}),/APPROVAL_MISMATCH/);await apply(x)
  })
  await t.test('connection loss during an applying statement leaves durable evidence and blocks rerun',async()=>{
   const x=await database(),sql='DO SLEEP(30)',verify='SELECT 1 AS satisfied',step={version:'000001',name:'interrupted_fixture',sql,verify,checksum:createHash('sha256').update(sql).update('\0').update(verify).digest()}
   let id;const wrapper={getConnection:async()=>{const c=await x.migration.getConnection();id=(await c.query('SELECT CONNECTION_ID() AS id'))[0][0].id;return c}}
   const outcome=runMigrations(wrapper,[files[0],step],'up').then(value=>({value}),error=>({error}))
   let sleeping=false;for(let i=0;i<100;i++){const rows=await query(x.admin,'SELECT ID FROM information_schema.PROCESSLIST WHERE ID=? AND INFO=?',[id??0,sql]);if(rows.length){sleeping=true;break}await new Promise(r=>setTimeout(r,20))}
   assert.ok(sleeping,'server observed applying statement');await query(x.admin,'KILL CONNECTION '+Number(id));assert.ok((await outcome).error)
   assert.equal((await query(x.admin,"SELECT status FROM schema_migrations WHERE version='000001'"))[0].status,'applying')
   await assert.rejects(runMigrations(x.migration,[files[0],step],'up'),/INCOMPLETE_MIGRATION/)
  })
  await t.test('actual operator CLI consumes a read-only approval artifact and durably records all progress',async()=>{
   const x=await database(),dir=await mkdtemp(path.join(tmpdir(),'magicreview-approval-')),target=path.join(dir,'target.json'),approvalFile=path.join(dir,'preflight.json'),audit=path.join(dir,'audit.jsonl')
   await writeFile(target,JSON.stringify(x.policy))
   async function cli(command,extra=[]){const child=spawn(process.execPath,[fileURLToPath(new URL('../dist/migrations/operator-cli.js',import.meta.url)),command,'--target',target,'--environment','local',...extra],{windowsHide:true,env:{...process.env,MIGRATION_DB_USER:x.user,MIGRATION_DB_PASSWORD:x.password}});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});assert.ok(!stdout.includes(x.password)&&!stderr.includes(x.password));return {code,stdout,stderr}}
   const report=await cli('preflight',['--report',approvalFile]);assert.equal(report.code,0);assert.deepEqual(JSON.parse(await readFile(approvalFile,'utf8')),JSON.parse(report.stdout));assert.equal((await query(x.admin,'SHOW TABLES')).length,0)
   assert.equal((await cli('preflight',['--report',approvalFile])).code,1)
   const result=await cli('apply',['--approval',approvalFile,'--audit',audit]);assert.equal(result.code,0,result.stderr)
   const records=(await readFile(audit,'utf8')).trim().split('\n').map(line=>JSON.parse(line));assert.equal(records.filter(e=>e.event==='step_applied').length,67);assert.equal(records.at(-1).event,'execution_completed');assert.ok(records[0].approvalDigest)
   assert.equal((await cli('apply',['--approval',approvalFile,'--audit',audit])).code,1)
  })
  await t.test('postcondition failure remains durable and explicit forward repair preserves checksums/history',async()=>{
   const x=await database(),original=files[1],sql='CREATE TABLE safety_fixture(id INT PRIMARY KEY)',verify="SELECT COUNT(*) AS satisfied FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='safety_fixture' AND COLUMN_NAME='repaired'",step={version:'000001',name:'safety_fixture',sql,verify,checksum:createHash('sha256').update(sql).update('\0').update(verify).digest()}
   await assert.rejects(runMigrations(x.migration,[files[0],step],'up'),/POSTCONDITION_FAILED/);await assert.rejects(runMigrations(x.migration,[files[0],step],'up'),/INCOMPLETE_MIGRATION/)
   await query(x.admin,'ALTER TABLE safety_fixture ADD COLUMN repaired INT');assert.equal(Number((await query(x.admin,verify))[0].satisfied),1)
   await query(x.admin,"UPDATE schema_migrations SET status='applied',last_verified_step=1 WHERE version=? AND checksum=? AND status='failed'",[step.version,step.checksum]);assert.equal((await runMigrations(x.migration,[files[0],step],'status')).pending.length,0);assert.ok(original)
  })
  await t.test('reference manifest matches the actual full schema and no production target was selected',async()=>{
   const c=await complete.admin.getConnection();try{assert.equal(digest(await inspectSchema(c)),digest(manifest.prefixes['000066']))}finally{c.release()}
  })
 }finally{for(const c of sessions)c.destroy();await new Promise(r=>setImmediate(r));for(const pool of pools)await pool.end();await fixture.close()}
})
