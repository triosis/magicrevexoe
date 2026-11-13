import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
import {createPool} from 'mysql2/promise'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {targetPolicy} from '../dist/migrations/operator.js'
import {digest,verifySchema} from '../dist/migrations/schema.js'
import {wildcardAccount,wildcardDatabase,inspectWildcardGrants,wildcardReleaseFingerprint,wildcardAcknowledgement} from '../dist/migrations/hostinger-wildcard.js'
import {executeCronJob,cronJob} from '../dist/setup/cron.js'
import {withDatabaseState} from '../dist/setup/database-state.js'
import {repairFirstTrigger} from '../dist/setup/first-trigger-repair.js'
import {reviewMigrationState} from '../dist/setup/migration-review.js'

test('exact collation repair preserves history, rejects unrelated drift and resumes all remaining migrations',{timeout:90000},async()=>{
 const f=await startDisposableMariaDB(undefined,{port:3306}),database=wildcardDatabase,user=wildcardAccount.split('@')[0],password=randomBytes(32).toString('hex'),control='magicreview_repair_state'
 let pool,statePool
 try{
  for(const r of (await f.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'"))[0])await f.admin.query('REVOKE ALL PRIVILEGES ON `'+r.Db+'`.* FROM PUBLIC')
  await f.admin.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  await f.admin.query('CREATE DATABASE '+control)
  await f.admin.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?",[user,password])
  await f.admin.query('GRANT ALL PRIVILEGES ON `'+database+"`.* TO ?@'127.0.0.1'",[user])
  pool=createPool({...f.options,user,password,database,connectionLimit:3,charset:'utf8mb4',supportBigNumbers:true,bigNumberStrings:true})
  // Match the hosting handshake's collation. The new runner must override it.
  pool.on('connection',db=>db.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci'))
  statePool=createPool({...f.options,database:control,connectionLimit:2})
  const files=await loadMigrations(new URL('../migrations/',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../docs/schema-manifest.json',import.meta.url)))
  await runMigrations(pool,files.slice(0,24),'up')
  const db=await pool.getConnection()
  try{
   await db.query("SET SESSION sql_mode='IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'")
   await db.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci')
   await db.query(files[24].sql)
   await db.execute("INSERT INTO schema_migrations(version,name,checksum,status,runner_id,failure_code) VALUES (?,?,?,'failed',?,'EXECUTION_FAILED')",[files[24].version,files[24].name,files[24].checksum,randomBytes(16)])
  }finally{db.release()}
  const env={HOSTINGER_LOCAL_APPROVAL:'I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT',HOSTINGER_LOCAL_APPROVAL_ID:'TEST-ONLY-TRANSPORT',HOSTINGER_WILDCARD_APPROVAL_ID:'TEST-ONLY-WILDCARD'}
  const [[server]]=await pool.query('SELECT @@hostname AS h')
  const grants=(await pool.query('SHOW GRANTS'))[0].map(r=>String(Object.values(r)[0])),releaseFingerprint=await wildcardReleaseFingerprint()
  const policy=targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,database,serverHostname:server.h,expectedAccount:wildcardAccount,transport:'HOSTINGER_LOCAL',hostingerLocalApprovalId:env.HOSTINGER_LOCAL_APPROVAL_ID,hostingerWildcard:{phase:'initial',approvalId:env.HOSTINGER_WILDCARD_APPROVAL_ID,operatorReference:'TEST-ONLY-OPERATOR',recoveryReference:'TEST-ONLY-RECOVERY',runtimeApprovalReference:'TEST-ONLY-RUNTIME',grantFingerprint:inspectWildcardGrants(grants,'initial'),manifestFingerprint:digest(manifest),releaseFingerprint,notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),riskAcknowledgement:wildcardAcknowledgement}})
  const job=action=>cronJob.parse({action,policy,releaseFingerprint,operatorReference:'TEST-ONLY-OPERATOR',recoveryReference:'TEST-ONLY-RECOVERY',confirmation:`INITIALIZE:${action}:${digest(policy)}`})
  const target=digest({host:policy.host,port:3306,database})
  const read=await pool.getConnection();try{assert.equal((await reviewMigrationState(read)).firstTriggerCollationOnlyMismatch,true)}finally{read.release()}
  await withDatabaseState(statePool,target,async state=>{await state.put('apply.started',{previousAttempt:true});await state.put('failure',{action:'apply'},true)})
  await assert.rejects(executeCronJob(job('resume-preflight'),pool,statePool,env),/COMPLETION_REQUIRED/)
  await pool.query('ALTER TABLE tenants ADD COLUMN unrelated_test INT')
  const drift=await pool.getConnection();try{assert.equal((await reviewMigrationState(drift)).firstTriggerCollationOnlyMismatch,false)}finally{drift.release()}
  await assert.rejects(repairFirstTrigger(pool,files,manifest,async()=>{},async()=>{}),/UNRELATED_DRIFT/)
  assert.equal((await pool.query("SELECT status FROM schema_migrations WHERE version='000024'"))[0][0].status,'failed')
  await pool.query('ALTER TABLE tenants DROP COLUMN unrelated_test')
  await executeCronJob(job('repair-first-trigger'),pool,statePool,env)
  assert.equal((await pool.query("SELECT failure_code FROM schema_migrations WHERE version='000024'"))[0][0].failure_code,'EXECUTION_FAILED')
  await assert.rejects(executeCronJob(job('repair-first-trigger'),pool,statePool,env),/ALREADY_ATTEMPTED/)
  await executeCronJob(job('resume-preflight'),pool,statePool,env)
  await executeCronJob(job('resume-apply'),pool,statePool,env)
  await assert.rejects(executeCronJob(job('resume-apply'),pool,statePool,env),/ALREADY_ATTEMPTED/)
  const check=await pool.getConnection();try{await verifySchema(check,manifest,files,85)}finally{check.release()}
  assert.equal(Number((await pool.query("SELECT COUNT(*) AS n FROM schema_migrations WHERE status='applied'"))[0][0].n),85)
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'))[0][0].n),46)
  assert.equal((await statePool.query("SELECT COUNT(*) AS n FROM initialization_records WHERE kind='apply.started'"))[0][0].n,1)
 }finally{await pool?.end();await statePool?.end();await f.close()}
})
