import {z} from 'zod'
import {readFile,realpath,stat,open,unlink} from 'node:fs/promises'
import {isAbsolute,relative,resolve,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'
import {targetPolicy} from '../migrations/operator.js'
import {digest} from '../migrations/schema.js'
import {wildcardReleaseFingerprint} from '../migrations/hostinger-wildcard.js'
import {validLocalApprovalId} from '../config/database-transport.js'

const absolute=z.string().refine(isAbsolute)
export const initializationJob=z.object({
 action:z.enum(['preflight','apply','verify-complete','bootstrap','check-runtime']),
 targetFile:absolute,stateDirectory:absolute,
 releaseFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
 operatorReference:z.string().refine(validLocalApprovalId),
 recoveryReference:z.string().refine(validLocalApprovalId),
 confirmation:z.string().min(1),
}).strict()
const inherited=['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','COMSPEC','USERPROFILE','APPDATA','LOCALAPPDATA']
const approvalInputs=['HOSTINGER_LOCAL_APPROVAL','HOSTINGER_LOCAL_APPROVAL_ID','CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID','HOSTINGER_WILDCARD_APPROVAL_ID']

// Explicit one-action operator job. Never imported by server/start/build/prepare.
// Approval references identify external evidence; syntax does not prove approval.
export async function runInitializationJob(jobFile:string,environment:NodeJS.ProcessEnv=process.env){
 if(!isAbsolute(jobFile))throw Error('Absolute job file required')
 const job=initializationJob.parse(JSON.parse(await readFile(jobFile,'utf8')))
 const policy=targetPolicy.parse(JSON.parse(await readFile(job.targetFile,'utf8')))
 const fingerprint=digest(policy)
 if(job.confirmation!==`INITIALIZE:${job.action}:${fingerprint}`)throw Error('Explicit action/target confirmation required')
 if(job.releaseFingerprint!==await wildcardReleaseFingerprint())throw Error('Reviewed release mismatch')
 if(policy.hostingerWildcard&&(policy.hostingerWildcard.operatorReference!==job.operatorReference||policy.hostingerWildcard.recoveryReference!==job.recoveryReference))throw Error('Review references mismatch')
 const backend=fileURLToPath(new URL('../../',import.meta.url)),state=await realpath(job.stateDirectory)
 const rel=relative(await realpath(backend),state)
 if(rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel)))throw Error('State must be outside release directory')
 if(state.split(/[\\/]/).some(p=>['public','public_html','www','htdocs','hbuilds'].includes(p.toLowerCase())))throw Error('State must not be in public or managed build directories')
 const info=await stat(state)
 if(!info.isDirectory()||(process.platform!=='win32'&&(info.mode&0o077)!==0))throw Error('Private state directory required')
 const env:NodeJS.ProcessEnv={}
 for(const key of [...inherited,...approvalInputs])if(environment[key]!==undefined)env[key]=environment[key]
 const bootstrap=job.action==='bootstrap'
 const secrets=bootstrap?['BOOTSTRAP_DB_USER','BOOTSTRAP_DB_PASSWORD','BOOTSTRAP_PLATFORM_NAME','BOOTSTRAP_OWNER_EMAIL','BOOTSTRAP_OWNER_NAME','BOOTSTRAP_OWNER_PASSWORD']:['MIGRATION_DB_USER','MIGRATION_DB_PASSWORD']
 for(const key of secrets){if(!environment[key])throw Error('Missing protected operator input');env[key]=environment[key]}
 // Reuse bootstrap's actual password rules before reserving a mutating attempt.
 if(bootstrap){
  const {bootstrapInput}=await import('./bootstrap.js')
  bootstrapInput.parse({platformName:env.BOOTSTRAP_PLATFORM_NAME,email:env.BOOTSTRAP_OWNER_EMAIL,displayName:env.BOOTSTRAP_OWNER_NAME,password:env.BOOTSTRAP_OWNER_PASSWORD})
 }
 const script=bootstrap?'dist/setup/cli.js':'dist/migrations/operator-cli.js'
 const args=bootstrap?['--target',job.targetFile,'--environment',policy.environment,'--approve',`BOOTSTRAP:${fingerprint}`]:[job.action,'--target',job.targetFile,'--environment',policy.environment]
 if(job.action==='preflight')args.push('--report',resolve(state,'preflight.json'))
 if(job.action==='apply'){
  const report=JSON.parse(await readFile(resolve(state,'preflight.json'),'utf8'))
  if(report.mode!=='preflight'||report.targetFingerprint!==fingerprint)throw Error('Reviewed preflight target mismatch')
  args.push('--approval',resolve(state,'preflight.json'),'--audit',resolve(state,'apply.jsonl'))
  if(policy.environment==='production')args.push('--confirm-production',`APPLY-PRODUCTION:${fingerprint}`)
 }
 const lock=await open(resolve(state,'job.lock'),'wx',0o600)
 try{
  if(job.action==='apply'||bootstrap){
   const marker=await open(resolve(state,job.action+'.started.json'),'wx',0o600)
   try{await marker.writeFile(JSON.stringify({action:job.action,targetFingerprint:fingerprint,releaseFingerprint:job.releaseFingerprint,operatorReference:job.operatorReference,recoveryReference:job.recoveryReference,at:new Date().toISOString()}));await marker.sync()}finally{await marker.close()}
  }
  await new Promise<void>((done,fail)=>{
   const child=spawn(process.execPath,[script,...args],{cwd:backend,env,stdio:'ignore',windowsHide:true})
   const stop=()=>{child.kill('SIGINT')}
   process.on('SIGINT',stop);process.on('SIGTERM',stop)
   const clean=()=>{process.off('SIGINT',stop);process.off('SIGTERM',stop)}
   child.once('error',()=>{clean();fail(Error('Operator job failed; inspect protected artifacts, do not retry automatically'))})
   child.once('exit',code=>{clean();if(code===0)done();else fail(Error('Operator job refused or failed; preserve state for review'))})
  })
  const result={action:job.action,targetFingerprint:fingerprint,releaseFingerprint:job.releaseFingerprint,completed:true}
  const output=await open(resolve(state,job.action+'.completed.json'),'wx',0o600)
  try{await output.writeFile(JSON.stringify(result)+'\n');await output.sync()}finally{await output.close()}
  return result
 }finally{await lock.close();await unlink(resolve(state,'job.lock'))}
}
