import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {backup,restore,verify,localPolicy} from './utility.mjs'
import {RecoveryError} from './snapshot.mjs'
import {digest} from '../../dist/migrations/schema.js'

// No dotenv, app DB_* fallbacks, remote option, production mode or retry loop.
async function main(){
 const [command,...args]=process.argv.slice(2),flags={}
 if(!['backup','verify','restore','target-fingerprint'].includes(command))throw new RecoveryError('USAGE_RECOVERY_BACKUP_VERIFY_RESTORE')
 for(let i=0;i<args.length;i+=2){const flag=args[i],value=args[i+1];if(!['--target','--bin','--output','--manifest','--confirm'].includes(flag)||!value||flags[flag])throw new RecoveryError('INVALID_RECOVERY_ARGUMENTS');flags[flag]=value}
 const encryptionKey=process.env.BACKUP_ENCRYPTION_KEY
 if(command==='verify'){if(!flags['--manifest'])throw new RecoveryError('MANIFEST_REQUIRED');console.info(JSON.stringify(await verify({manifestFile:path.resolve(flags['--manifest']),encryptionKey})));return}
 if(!flags['--target'])throw new RecoveryError('EXPLICIT_LOCAL_TARGET_REQUIRED')
 const policy=localPolicy(JSON.parse(await readFile(flags['--target'],'utf8')))
 if(command==='target-fingerprint'){console.info(JSON.stringify({targetFingerprint:digest(policy),confirmation:'RESTORE-EMPTY:'+digest(policy)}));return}
 if(!flags['--bin']||!flags['--output'])throw new RecoveryError('EXPLICIT_BINARY_AND_PRIVATE_OUTPUT_REQUIRED')
 const controller=new AbortController(),interrupt=()=>controller.abort();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt)
 try{
  const options={policy,user:process.env.RECOVERY_DB_USER,password:process.env.RECOVERY_DB_PASSWORD,bin:path.resolve(flags['--bin']),outputRoot:path.resolve(flags['--output']),encryptionKey,signal:controller.signal,audit:async event=>console.info(JSON.stringify(event))}
  const result=command==='backup'?await backup({...options,keyId:process.env.BACKUP_KEY_ID}):await restore({...options,manifestFile:path.resolve(flags['--manifest']??''),confirmation:flags['--confirm']})
  console.info(JSON.stringify(result))
 }finally{process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt)}
}
main().catch(error=>{console.error(error instanceof RecoveryError?error.code:'INVALID_OR_FAILED_RECOVERY_OPERATION');process.exitCode=1})
