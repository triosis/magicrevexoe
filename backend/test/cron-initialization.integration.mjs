import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {createPool} from 'mysql2/promise'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {cronJob,executeCronJob,runCronFromEnvironment} from '../dist/setup/cron.js'
import {withDatabaseState} from '../dist/setup/database-state.js'
import {targetPolicy} from '../dist/migrations/operator.js'
import {digest,verifySchema} from '../dist/migrations/schema.js'
import {loadMigrations} from '../dist/migrations/runner.js'
import {wildcardDatabase as database,wildcardAccount,inspectWildcardGrants,wildcardReleaseFingerprint,wildcardAcknowledgement} from '../dist/migrations/hostinger-wildcard.js'
import {verifyPassword} from '../dist/auth/passwords.js'
import {inspectCronTarget} from '../dist/setup/cron-inspect.js'
import {bootstrapPlatform} from '../dist/setup/bootstrap.js'

test('cron uses persistent database state through complete guarded migration/bootstrap and refuses repeat/failure/concurrent runs',{timeout:120000},async()=>{
 const fixture=await startDisposableMariaDB(undefined,{port:3306}),password=randomBytes(32).toString('hex'),ownerPassword=randomBytes(24).toString('base64url')
 const user=wildcardAccount.split('@')[0],stateName='magicreview_control_test',q=s=>'`'+s+'`'
 let pool,statePool
 try{
  for(const row of (await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'"))[0])await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+q(row.Db)+'.* FROM PUBLIC')
  await fixture.admin.query('CREATE DATABASE '+q(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  await fixture.admin.query('CREATE DATABASE '+q(stateName)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  await fixture.admin.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?",[user,password])
  await fixture.admin.query('GRANT ALL PRIVILEGES ON '+q(database)+".* TO ?@'127.0.0.1'",[user])
  pool=createPool({...fixture.options,user,password,database,connectionLimit:3,charset:'utf8mb4',timezone:'Z',supportBigNumbers:true,bigNumberStrings:true})
  const stateOptions={...fixture.options,database:stateName,connectionLimit:3}
  statePool=createPool(stateOptions)
  const [[identity]]=await pool.query('SELECT @@hostname AS hostname,CURRENT_USER() AS account')
  const grants=(await pool.query('SHOW GRANTS'))[0].map(r=>String(Object.values(r)[0]))
  const manifest=JSON.parse(await readFile(new URL('../docs/schema-manifest.json',import.meta.url)))
  const releaseFingerprint=await wildcardReleaseFingerprint()
  const env={HOSTINGER_LOCAL_APPROVAL:'I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT',HOSTINGER_LOCAL_APPROVAL_ID:'TEST-TRANSPORT-APPROVAL',HOSTINGER_WILDCARD_APPROVAL_ID:'TEST-WILDCARD-APPROVAL',BOOTSTRAP_PLATFORM_NAME:'Cron fixture',BOOTSTRAP_OWNER_NAME:'Cron owner',BOOTSTRAP_OWNER_PASSWORD:ownerPassword}
  const inspection=await inspectCronTarget({...env,NODE_ENV:'production',DB_HOST:'127.0.0.1',DB_PORT:'3306',DB_NAME:database,DB_USER:user,DB_PASSWORD:password,DB_TLS_MODE:'HOSTINGER_LOCAL',CORS_ORIGINS:'https://example.invalid'})
  assert.equal(inspection.tableCount,0);assert.equal(inspection.changesMade,false)
  assert.equal(inspection.releaseFingerprint,releaseFingerprint)
  const policy=phase=>targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,database,serverHostname:identity.hostname,expectedAccount:identity.account,transport:'HOSTINGER_LOCAL',hostingerLocalApprovalId:env.HOSTINGER_LOCAL_APPROVAL_ID,hostingerWildcard:{phase,approvalId:env.HOSTINGER_WILDCARD_APPROVAL_ID,operatorReference:'TEST-OPERATOR-APPROVAL',recoveryReference:'TEST-RECOVERY-APPROVAL',runtimeApprovalReference:'TEST-RUNTIME-APPROVAL',grantFingerprint:inspectWildcardGrants(grants,phase),manifestFingerprint:digest(manifest),releaseFingerprint,notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),riskAcknowledgement:wildcardAcknowledgement}})
  const initial=policy('initial')
  const job=(action,p=initial)=>cronJob.parse({action,policy:p,releaseFingerprint,operatorReference:'TEST-OPERATOR-APPROVAL',recoveryReference:'TEST-RECOVERY-APPROVAL',confirmation:`INITIALIZE:${action}:${digest(p)}`})
  await assert.rejects(executeCronJob({...job('preflight'),confirmation:'bad'},pool,statePool,env))
  await assert.rejects(executeCronJob(job('apply'),pool,statePool,env),/PREFLIGHT_REQUIRED/)
  await executeCronJob(job('preflight'),pool,statePool,env)
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()'))[0][0].n),0)
  // Restart/reconnect discards all process state; preflight survives in MariaDB.
  await statePool.end();statePool=createPool(stateOptions)
  await executeCronJob(job('apply'),pool,statePool,env)
  await assert.rejects(executeCronJob(job('apply'),pool,statePool,env),/ALREADY_ATTEMPTED/)
  await executeCronJob(job('verify-complete',policy('verify')),pool,statePool,env)
  let authorizations=0
  await assert.rejects(bootstrapPlatform(pool,{platformName:env.BOOTSTRAP_PLATFORM_NAME,email:'rxadmin@revexoe.com',displayName:env.BOOTSTRAP_OWNER_NAME,password:ownerPassword},async()=>{
   if(++authorizations===4){await Promise.resolve();throw Error('Synthetic final authorization rejection')}
  }),/final authorization rejection/)
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM users'))[0][0].n),0)
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM tenants'))[0][0].n),0)
  await executeCronJob(job('bootstrap',policy('bootstrap')),pool,statePool,env)
  await assert.rejects(executeCronJob(job('bootstrap',policy('bootstrap')),pool,statePool,env),/ALREADY_ATTEMPTED/)
  // A failure after reservation stays refused even after reconnecting the state pool.
  const runtime={...policy('bootstrap'),hostingerWildcard:{...policy('bootstrap').hostingerWildcard,phase:'runtime',grantFingerprint:'0'.repeat(64)}}
  await assert.rejects(executeCronJob(job('check-runtime',runtime),pool,statePool,env))
  await statePool.end();statePool=createPool(stateOptions)
  await assert.rejects(executeCronJob(job('check-runtime',runtime),pool,statePool,env),/ALREADY_ATTEMPTED/)
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM schema_migrations'))[0][0].n),85)
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'))[0][0].n),46)
  assert.equal(await verifyPassword((await pool.query('SELECT password_hash FROM users'))[0][0].password_hash,ownerPassword),true)
  await withDatabaseState(statePool,'c'.repeat(64),async state=>{
   await state.put('apply.started',{attempt:true})
   await assert.rejects(withDatabaseState(statePool,'c'.repeat(64),async()=>{}),/LOCK_UNAVAILABLE/)
  })
  await assert.rejects(withDatabaseState(statePool,'c'.repeat(64),async state=>{await state.put('apply.started',{attempt:true})}))
  for(const row of (await statePool.query('SELECT payload FROM initialization_records'))[0])assert.equal([password,ownerPassword,fixture.options.password].some(s=>JSON.stringify(row.payload).includes(s)),false)
  const db=await pool.getConnection();try{await verifySchema(db,manifest,await loadMigrations(new URL('../migrations/',import.meta.url)),85)}finally{db.release()}
  await assert.rejects(runCronFromEnvironment({INITIALIZATION_CRON_JOB:JSON.stringify(job('apply')),INITIALIZATION_STATE_DB_NAME:database}),/SEPARATE/)
  await assert.rejects(runCronFromEnvironment({INITIALIZATION_CRON_JOB:JSON.stringify(job('apply')),INITIALIZATION_STATE_DB_NAME:database.toUpperCase()}),/SEPARATE/)
  await statePool.query('ALTER TABLE initialization_records ADD COLUMN unexpected INT')
  await assert.rejects(withDatabaseState(statePool,'e'.repeat(64),async()=>{}),/STATE_SCHEMA_DRIFT/)
 }finally{await pool?.end();await statePool?.end();await fixture.close()}
})
