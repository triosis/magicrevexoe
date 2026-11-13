import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {executeCronJob,cronJob} from '../dist/setup/cron.js'
import {targetPolicy} from '../dist/migrations/operator.js'
import {digest} from '../dist/migrations/schema.js'
import {cronErrorCode} from '../dist/setup/cron-errors.js'
import {MigrationError} from '../dist/migrations/runner.js'
import {databaseFailureCode} from '../dist/migrations/failure-code.js'

const policy=targetPolicy.parse({environment:'local',host:'127.0.0.1',port:3306,database:'magicreview_migration_cron_unit',serverHostname:'synthetic',expectedAccount:'synthetic@localhost'})
const job={action:'preflight',policy,releaseFingerprint:'0'.repeat(64),operatorReference:'TEST-OPERATOR-ONLY',recoveryReference:'TEST-RECOVERY-ONLY',confirmation:`INITIALIZE:preflight:${digest(policy)}`}

test('cron refuses malformed actions, stray fields and missing review references',()=>{
 assert.ok(cronJob.safeParse(job).success)
 for(const value of [{...job,action:'initialize-all'},{...job,stateDirectory:'/tmp'},{...job,operatorReference:'fake'},{...job,recoveryReference:undefined}])assert.equal(cronJob.safeParse(value).success,false)
})

test('cron rejects mismatched confirmation and compiled release before database access',async()=>{
 const pool={getConnection(){throw Error('Unexpected database access')}}
 await assert.rejects(executeCronJob({...job,confirmation:'bad'},pool,pool,{}),/CONFIRMATION_REQUIRED/)
 await assert.rejects(executeCronJob(job,pool,pool,{}),/RELEASE_MISMATCH/)
})

test('cron CLI refuses arguments or absent job without printing protected environment inputs',()=>{
 for(const args of [[],['--run-all']]){
  const secret='synthetic-private-test-value'
  const result=spawnSync(process.execPath,['dist/setup/cron-cli.js',...args],{cwd:new URL('../',import.meta.url),encoding:'utf8',env:{...process.env,INITIALIZATION_CRON_JOB:'',DB_PASSWORD:secret,MIGRATION_DB_PASSWORD:secret}})
  assert.equal(result.status,1)
  assert.match(result.stderr,/INITIALIZATION_REFUSED_OR_FAILED/)
  assert.equal((result.stdout+result.stderr).includes(secret),false)
 }
})

test('cron diagnostics expose only allowlisted codes, never error details or SQL',()=>{
 assert.equal(cronErrorCode(new MigrationError('HOSTINGER_LOCAL_APPROVAL_MISMATCH')),'HOSTINGER_LOCAL_APPROVAL_MISMATCH')
 assert.equal(cronErrorCode(Object.assign(new Error('private-password SQL query'),{code:'ER_ACCESS_DENIED_ERROR'})),'ER_ACCESS_DENIED_ERROR')
 for(const error of [new Error('private-password'),new MigrationError('SECRET_UNREVIEWED_CODE'),{code:'PRIVATE_PASSWORD',sql:'secret'}])assert.equal(cronErrorCode(error),'INITIALIZATION_UNKNOWN_FAILURE')
})

test('database failure codes retain only a bounded numeric errno',()=>{
 assert.equal(databaseFailureCode({errno:1142,message:'private-password',sql:'secret'}),'DB_ERROR_1142')
 assert.equal(cronErrorCode(new MigrationError('DB_ERROR_1142')),'DB_ERROR_1142')
 for(const errno of ['1142',NaN,Infinity,999,10000,1142.1])assert.equal(databaseFailureCode({errno}),'EXECUTION_FAILED')
 assert.equal(cronErrorCode(new MigrationError('DB_ERROR_PRIVATE_PASSWORD')),'INITIALIZATION_UNKNOWN_FAILURE')
})
