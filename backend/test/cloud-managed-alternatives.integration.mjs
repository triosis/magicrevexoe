import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {createPool} from 'mysql2/promise'
import {certificate} from './tls-fixture.mjs'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {loadMigrations} from '../dist/migrations/runner.js'
import {operatorMigrations,targetPolicy} from '../dist/migrations/operator.js'
import {verifyPrivileges,runtimePrivileges} from '../dist/migrations/privileges.js'
import {inspectCloudGrants} from '../dist/migrations/cloud-startup.js'
import {verifySchema} from '../dist/migrations/schema.js'
const quote=s=>'`'+s.replaceAll('`','``')+'`'

test('managed-hosting alternatives: naming, initial table-only authority and strict separate accounts',{timeout:120000},async t=>{
 const cert=await certificate(),fixture=await startDisposableMariaDB(cert),pools=[]
 const suffix=randomBytes(5).toString('hex'),alpha='magicreview'+suffix,prefixed='u123456789_'+suffix,lookalike='u123456789X'+suffix
 const connect=(user,password,database)=>{const p=createPool({...fixture.options,host:'localhost',user,password,...(database?{database}:{}),ssl:{ca:cert.ca,rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2'},connectionLimit:1,multipleStatements:false,supportBigNumbers:true,bigNumberStrings:true,charset:'utf8mb4',timezone:'Z'});pools.push(p);return p}
 const account=async name=>{const user=name+suffix,password=randomBytes(32).toString('hex');await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[user,password]);return {user,password,sql:"'"+user+"'@'localhost'",identity:user+'@localhost'}}
 const grantRows=async p=>(await p.query('SHOW GRANTS'))[0].map(r=>String(Object.values(r)[0]))
 const denied=async promise=>assert.rejects(promise,e=>['ER_DBACCESS_DENIED_ERROR','ER_TABLEACCESS_DENIED_ERROR','ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(e.code))
 try{
  const [publicRows]=await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'")
  for(const r of publicRows)await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(r.Db)+'.* FROM PUBLIC')
  for(const name of [alpha,prefixed])await fixture.admin.query('CREATE DATABASE '+quote(name)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const files=await loadMigrations(new URL('../migrations/',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../docs/schema-manifest.json',import.meta.url)))
  const [[server]]=await fixture.admin.query('SELECT @@hostname AS hostname')
  await t.test('an all-alphanumeric full name is exact, but alphanumeric suffix retains prefix wildcard',async()=>{
   const x=await account('naming');await fixture.admin.query('GRANT SELECT ON '+quote(alpha)+'.* TO '+x.sql)
   await fixture.admin.query('GRANT SELECT ON '+quote(prefixed)+'.* TO '+x.sql)
   const p=connect(x.user,x.password)
   await fixture.admin.query('CREATE DATABASE '+quote(lookalike))
   for(const name of [alpha,prefixed,lookalike]){await fixture.admin.query('CREATE TABLE '+quote(name)+'.probe(id INT)');await p.query('SELECT * FROM '+quote(name)+'.probe')}
   await denied(p.query('SELECT * FROM '+quote(alpha+'x')+'.probe'))
   assert.throws(()=>inspectCloudGrants(['GRANT ALL PRIVILEGES ON '+quote(prefixed)+'.* TO '+x.sql],prefixed,'initial-maintenance'),/GRANT_SCOPE_MISMATCH/)
  })
  await t.test('database ALL can create a matching non-hPanel-style schema in the native engine',async()=>{
   const x=await account('initializer'),outsideUi=prefixed.replace('_','Y')
   await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(prefixed)+'.* TO '+x.sql)
   const p=connect(x.user,x.password)
   // No administrator CREATE here: a UI-only naming rule is not a SQL boundary.
   await p.query('CREATE DATABASE '+quote(outsideUi))
   await p.query('CREATE TABLE '+quote(outsideUi)+'.probe(id INT)')
   await p.query('SELECT * FROM '+quote(outsideUi)+'.probe')
   const rows=await grantRows(p)
   assert.throws(()=>inspectCloudGrants(rows,prefixed,'initial-maintenance'),/GRANT_SCOPE_MISMATCH/)
  })
  // The native-only probe above created a non-manifest table in alpha: use a fresh
  // exact alphanumeric schema for the approved complete migration workflow.
  const full='magicreviewfull'+suffix
  await fixture.admin.query('CREATE DATABASE '+quote(full)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const migration=await account('migration'),m=connect(migration.user,migration.password,full)
  const policy=targetPolicy.parse({environment:'staging',host:'localhost',port:fixture.options.port,database:full,serverHostname:server.hostname,expectedAccount:migration.identity,tlsCaFile:cert.cert,tlsCaSha256:cert.digest})
  await t.test('strict separate migration account runs all85 unchanged migrations on alphanumeric schema over TLS',async()=>{
   await fixture.admin.query('GRANT SELECT, CREATE, ALTER, TRIGGER ON '+quote(full)+'.* TO '+migration.sql)
   for(const table of ['schema_migrations','industry_channels','roles','permissions','role_permissions'])await fixture.admin.query('GRANT CREATE,INSERT'+(table==='schema_migrations'?',UPDATE':'')+' ON '+quote(full)+'.'+quote(table)+' TO '+migration.sql)
   const report=await operatorMigrations(m,files,manifest,policy,'preflight');assert.equal(report.pending.length,85)
   const events=[];const result=await operatorMigrations(m,files,manifest,policy,'apply',{approval:report.approval,audit:async e=>events.push(e)})
   assert.equal(result.applied.length,85);assert.equal(events.filter(e=>e.event==='step_applied').length,85)
   const [[shape]]=await m.query('SELECT (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()) AS tables,(SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()) AS triggers')
   assert.equal(Number(shape.tables),32);assert.equal(Number(shape.triggers),46)
  })
  await t.test('separate per-table runtime has no wildcard scope or definer-management authority',async()=>{
   const runtime=await account('runtime')
   for(const [table,privs] of Object.entries(runtimePrivileges))await fixture.admin.query('GRANT '+privs.join(',')+' ON '+quote(full)+'.'+quote(table)+' TO '+runtime.sql)
   const r=connect(runtime.user,runtime.password,full),c=await r.getConnection();try{await verifyPrivileges(c,full,'runtime')}finally{c.release()}
   await denied(r.query('SELECT * FROM schema_migrations'));await denied(r.query('ALTER TABLE users ADD forbidden INT'));await denied(r.query('DELETE FROM users'))
   await denied(r.query('SELECT * FROM '+quote(prefixed)+'.probe'))
   // Real definer guard still activates although this invoker lacks TRIGGER.
   const id=randomBytes(16);await r.execute("INSERT INTO tenants(public_id,kind,name) VALUES (?,'platform','Synthetic runtime root')",[id])
   await assert.rejects(r.execute('UPDATE tenants SET public_id=? WHERE public_id=?',[randomBytes(16),id]),e=>e.code==='ER_SIGNAL_EXCEPTION')
  })
  await t.test('bootstrap metadata prerequisites require protected TRIGGER visibility beyond SELECT and four INSERT grants',async()=>{
   const bootstrap=await account('bootstrap')
   await fixture.admin.query('GRANT SELECT ON '+quote(full)+'.* TO '+bootstrap.sql)
   for(const table of ['tenants','users','tenant_memberships','audit_logs'])await fixture.admin.query('GRANT INSERT ON '+quote(full)+'.'+quote(table)+' TO '+bootstrap.sql)
   const b=connect(bootstrap.user,bootstrap.password,full)
   const partial=(await b.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'))[0]
   assert.ok(partial.length<46);t.diagnostic('Limited bootstrap account sees '+partial.length+'/46 trigger rows')
   const limited=await b.getConnection();try{await assert.rejects(verifySchema(limited,manifest,files,files.length),/SCHEMA_DRIFT_REQUIRES_REVIEW/)}finally{limited.release()}
   await fixture.admin.query('GRANT TRIGGER ON '+quote(full)+'.* TO '+bootstrap.sql)
   const visible=connect(bootstrap.user,bootstrap.password,full)
   assert.equal((await visible.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'))[0].length,46)
   const complete=await visible.getConnection();try{await verifySchema(complete,manifest,files,files.length)}finally{complete.release()}
   await fixture.admin.query('REVOKE TRIGGER ON '+quote(full)+'.* FROM '+bootstrap.sql)
   // Visibility experiment only; no owner bootstrap/account creation is invoked.
  })
  await t.test('table-only CREATE pregrant can create a first table/trigger, but strict initial operator still refuses that profile',async()=>{
   const name='magicreview_migration_table_'+suffix,tableUser=await account('table')
   await fixture.admin.query('CREATE DATABASE '+quote(name))
   await fixture.admin.query('GRANT SELECT, CREATE, ALTER, TRIGGER, INSERT, UPDATE ON '+quote(name)+'.probe TO '+tableUser.sql)
   const p=connect(tableUser.user,tableUser.password,name)
   await p.query('CREATE TABLE probe(id INT PRIMARY KEY)')
   await p.query("CREATE TRIGGER probe_guard BEFORE UPDATE ON probe FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic guard'")
   await p.query('INSERT INTO probe VALUES (1)');await assert.rejects(p.query('UPDATE probe SET id=2'),e=>e.code==='ER_SIGNAL_EXCEPTION')
   await denied(p.query('CREATE TABLE unapproved(id INT)'));await denied(p.query('SELECT * FROM '+quote(prefixed)+'.probe'))
   const c=await p.getConnection();try{await assert.rejects(verifyPrivileges(c,name,'migration'),/UNSUPPORTED_OR_EXCESSIVE_GRANTS|MISSING_REQUIRED_PRIVILEGES/)}finally{c.release()}
   // No legacy runner/import fallback: full85 table-only initialization is unproven.
  })
  await t.test('simulated grant regeneration reintroduces wildcard scope and fails closed',async()=>{
   const x=await account('regen'),escaped=prefixed.replaceAll('_','\\_')
   await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(escaped)+'.* TO '+x.sql)
   const p=connect(x.user,x.password);assert.ok(inspectCloudGrants(await grantRows(p),prefixed,'initial-maintenance'))
   await denied(p.query('SELECT * FROM '+quote(lookalike)+'.probe'))
   await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(escaped)+'.* FROM '+x.sql)
   await fixture.admin.query('GRANT ALL PRIVILEGES ON '+quote(prefixed)+'.* TO '+x.sql)
   const changed=connect(x.user,x.password);await changed.query('SELECT * FROM '+quote(lookalike)+'.probe')
   const rows=await grantRows(changed)
   assert.throws(()=>inspectCloudGrants(rows,prefixed,'initial-maintenance'),/GRANT_SCOPE_MISMATCH/)
  })
 }finally{for(const p of pools)await p.end();await fixture.close()}
})
