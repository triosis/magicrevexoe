import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {initializationJob,runInitializationJob} from '../dist/setup/job.js'
import {digest} from '../dist/migrations/schema.js'
import {targetPolicy} from '../dist/migrations/operator.js'
import {wildcardReleaseFingerprint} from '../dist/migrations/hostinger-wildcard.js'

test('initialization job denies missing/unknown actions, relative state and stray fields',()=>{
 assert.equal(initializationJob.safeParse({}).success,false)
 assert.equal(initializationJob.safeParse({action:'reset',targetFile:'target.json',stateDirectory:'.'}).success,false)
})
test('initialization job requires reviewed action and release before any operator access',async()=>{
 const state=await mkdtemp(join(tmpdir(),'magicreview-job-negative-'))
 const targetFile=join(state,'target.json'),file=join(state,'job.json')
 const policy=targetPolicy.parse({environment:'local',host:'127.0.0.1',port:1,database:'magicreview_migration_job_negative',serverHostname:'synthetic',expectedAccount:'synthetic@localhost'})
 await writeFile(targetFile,JSON.stringify(policy))
 const job={action:'apply',targetFile,stateDirectory:state,releaseFingerprint:await wildcardReleaseFingerprint(),operatorReference:'TEST-ONLY-OPERATOR',recoveryReference:'TEST-ONLY-RECOVERY',confirmation:'wrong'}
 await writeFile(file,JSON.stringify(job))
 await assert.rejects(runInitializationJob(file,{}),/confirmation/)
 await writeFile(file,JSON.stringify({...job,confirmation:'INITIALIZE:apply:'+digest(policy),releaseFingerprint:'0'.repeat(64)}))
 await assert.rejects(runInitializationJob(file,{}),/release mismatch/)
 assert.equal((await readdir(state)).includes('apply.started.json'),false)
 await writeFile(file,JSON.stringify({...job,confirmation:'INITIALIZE:apply:'+digest(policy)}))
 await assert.rejects(runInitializationJob(file,{}),/Missing protected operator input/)
})
