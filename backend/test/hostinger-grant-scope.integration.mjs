import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {createPool} from 'mysql2/promise'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {inspectCloudGrants} from '../dist/migrations/cloud-startup.js'

const quote=s=>'`'+s.replaceAll('`','``')+'`'
test('MariaDB11.8.9 real database GRANT patterns and exact-scope provider remediation',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),pools=[]
 const suffix=randomBytes(5).toString('hex'),database='magicreview_migration_scope_'+suffix+'_db'
 const similar=database.replace('_db','Xdb'),unrelated=database+'_extra',user='scope_'+suffix,password=randomBytes(32).toString('hex')
 const account="'"+user+"'@'localhost'",literal=database.replaceAll('_','\\_')
 const pool=()=>{const p=createPool({...fixture.options,user,password,connectionLimit:1,multipleStatements:false});pools.push(p);return p}
 const create=async name=>{await fixture.admin.query('CREATE DATABASE '+quote(name));await fixture.admin.query('CREATE TABLE '+quote(name)+'.probe (id INT PRIMARY KEY)');await fixture.admin.query('INSERT INTO '+quote(name)+'.probe VALUES (1)')}
 const grants=async p=>(await p.query('SHOW GRANTS'))[0].map(r=>String(Object.values(r)[0]))
 const denied=async(p,name)=>{await assert.rejects(p.query('SELECT id FROM '+quote(name)+'.probe'),e=>['ER_DBACCESS_DENIED_ERROR','ER_TABLEACCESS_DENIED_ERROR'].includes(e.code))}
 const read=async(p,name)=>{assert.equal((await p.query('SELECT id FROM '+quote(name)+'.probe'))[0][0].id,1)}
 try{
  const [[version]]=await fixture.admin.query('SELECT VERSION() AS version')
  assert.match(version.version,/^11\.8\.9-MariaDB/)
  await fixture.admin.query('CREATE USER '+account+' IDENTIFIED BY ?',[password])
  // Fresh ZIP initialization may seed test-schema PUBLIC authority. Prove it
  // remains rejected, then remove only that synthetic fixture default so the
  // following cases isolate database-pattern semantics (as existing Cloud tests do).
  const [publicRows]=await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'")
  await t.test('fixture PUBLIC defaults remain rejected rather than silently ignored',async()=>{
   if(publicRows.length){const rows=await grants(pool());assert.throws(()=>inspectCloudGrants(rows,database,'initial-maintenance'),/CLOUD_STARTUP_UNSUPPORTED_GRANTS/)}
   for(const row of publicRows)await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(row.Db)+'.* FROM PUBLIC')
  })
  await create(database)
  await t.test('unescaped underscores stored as patterns and cover a future similar schema',async()=>{
   await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(database)+'.* TO '+account)
   const p=pool();await read(p,database)
   const rows=await grants(p)
   assert.throws(()=>inspectCloudGrants(rows,database,'initial-maintenance'),/CLOUD_STARTUP_GRANT_SCOPE_MISMATCH/)
   // Provision lookalike AFTER granting: an empty inventory is not a scope bound.
   await create(similar);await create(unrelated)
   await read(p,similar);await denied(p,unrelated)
   const [stored]=await fixture.admin.query('SELECT Db FROM mysql.db WHERE User=?',[user])
   assert.equal(stored.some(r=>r.Db===database),true)
  })
  await t.test('MariaDB has no partial_revokes setting to reinterpret these grants',async()=>{
   assert.equal((await fixture.admin.query("SHOW VARIABLES LIKE 'partial_revokes'"))[0].length,0)
   await assert.rejects(fixture.admin.query('SELECT @@partial_revokes'),e=>e.code==='ER_UNKNOWN_SYSTEM_VARIABLE')
  })
  await t.test('NO_BACKSLASH_ESCAPES does not remove wildcards; explicitly escaped scopes remain exact',async()=>{
   const [[settings]]=await fixture.admin.query('SELECT @@session.sql_mode AS mode')
   try{
    await fixture.admin.query("SET SESSION sql_mode='NO_BACKSLASH_ESCAPES'")
    await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(database)+'.* FROM '+account)
    await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(database)+'.* TO '+account)
    await read(pool(),similar)
    await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(database)+'.* FROM '+account)
    await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(literal)+'.* TO '+account)
    const p=pool();await read(p,database);await denied(p,similar)
    assert.ok(inspectCloudGrants(await grants(p),database,'initial-maintenance'))
    await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(literal)+'.* FROM '+account)
    await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(database)+'.* TO '+account)
   }finally{await fixture.admin.query('SET SESSION sql_mode=?',[settings.mode])}
  })
  await t.test('escaped exact schema grant supports ALL initially, denies similar schema and runtime ALL',async()=>{
   await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(database)+'.* FROM '+account)
   await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(literal)+'.* TO '+account)
   const p=pool();await read(p,database);await denied(p,similar);await denied(p,unrelated)
   const rows=await grants(p)
   assert.ok(inspectCloudGrants(rows,database,'initial-maintenance'))
   assert.throws(()=>inspectCloudGrants(rows,database,'runtime-dbwide'),/CLOUD_STARTUP_INVALID_PRIVILEGE_SET/)
  })
  await t.test('statement-time and native authentication tails do not change authority fingerprint',async()=>{
   const p=pool(),before=inspectCloudGrants(await grants(p),database,'initial-maintenance')
   await fixture.admin.query('GRANT USAGE ON *.* TO '+account+' WITH MAX_STATEMENT_TIME 5')
   const after=inspectCloudGrants(await grants(pool()),database,'initial-maintenance')
   assert.equal(before,after) // Never print/assert raw grant/authentication strings.
  })
  await t.test('exact runtime reduction preserves intended DML and cross-schema denial',async()=>{
   await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(literal)+'.* FROM '+account)
   await fixture.admin.query('GRANT SELECT, INSERT, UPDATE, TRIGGER ON '+quote(literal)+'.* TO '+account)
   const p=pool();await read(p,database);await denied(p,similar)
   assert.ok(inspectCloudGrants(await grants(p),database,'runtime-dbwide'))
  })
  await t.test('percent scope really exposes other schemas and remains rejected',async()=>{
   await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(literal)+'.* FROM '+account)
   await fixture.admin.query('GRANT SELECT ON '+quote(database+'%')+'.* TO '+account)
   const p=pool();await read(p,unrelated)
   const rows=await grants(p)
   assert.throws(()=>inspectCloudGrants(rows,database,'initial-maintenance'),/CLOUD_STARTUP_GRANT_SCOPE_MISMATCH/)
  })
 }finally{for(const p of pools)await p.end();await fixture.close()}
})
