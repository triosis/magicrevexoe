import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {localPolicy,restore} from '../scripts/recovery/utility.mjs'
import {nativeEnvironment,protectOutput,workspace} from '../scripts/recovery/files.mjs'
import {keys} from '../scripts/recovery/archive.mjs'
import {publish} from '../scripts/recovery/archive.mjs'
import {privateDirectory,cleanup} from '../scripts/recovery/files.mjs'
import {writeFile,readFile} from 'node:fs/promises'
import path from 'node:path'

test('recovery rejects production/remote policies, absent confirmation, weak keys and workspace output before execution',async()=>{
 const policy={environment:'local',host:'127.0.0.1',port:3306,database:'magicreview_migration_unit',serverHostname:'synthetic',expectedAccount:'fixture@localhost'}
 assert.ok(localPolicy(policy));assert.throws(()=>localPolicy({...policy,host:'remote.example.invalid'}))
 assert.throws(()=>localPolicy({...policy,environment:'production',tlsCaFile:'unused',tlsCaSha256:'0'.repeat(64)}),/DISPOSABLE_LOCAL/)
 await assert.rejects(restore({policy,encryptionKey:randomBytes(32).toString('base64'),confirmation:'wrong'}),/CONFIRMATION/)
 assert.throws(()=>keys(Buffer.alloc(32).toString('base64')),/INVALID_BACKUP_ENCRYPTION_KEY/)
 await assert.rejects(protectOutput(workspace),/OUTSIDE_PUBLIC_WORKSPACE/)
 await assert.rejects(protectOutput(path.join(workspace,'backend')),/OUTSIDE_PUBLIC_WORKSPACE/)
})
test('native process environment excludes database credentials, backup/MFA keys and unrelated application secrets',()=>{
 const env=nativeEnvironment({SystemRoot:'fixture',PATH:'fixture',BACKUP_ENCRYPTION_KEY:'excluded',RECOVERY_DB_PASSWORD:'excluded',RECOVERY_DB_USER:'excluded',AUTH_MFA_KEY:'excluded',AUTH_ACCESS_SECRET:'excluded'})
 assert.deepEqual(env,{SystemRoot:'fixture',PATH:'fixture'})
})
test('exclusive archive publication preserves an existing artifact instead of overwriting it',async()=>{
 const directory=await privateDirectory(),part=path.join(directory,'part'),final=path.join(directory,'archive')
 try{await writeFile(part,'new');await writeFile(final,'existing');await assert.rejects(publish(part,final),e=>e.code==='EEXIST');assert.equal(await readFile(final,'utf8'),'existing');assert.equal(await readFile(part,'utf8'),'new')}finally{await cleanup(directory,[part,final])}
})
