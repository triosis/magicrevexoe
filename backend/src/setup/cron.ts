import {readFile} from 'node:fs/promises'
import {z} from 'zod'
import type {Pool,RowDataPacket} from 'mysql2/promise'
import {createDatabasePool} from '../db/pool.js'
import {targetPolicy,operatorTransport,operatorMigrations,verifyTarget,type Approval} from '../migrations/operator.js'
import {loadMigrations} from '../migrations/runner.js'
import {digest,type SchemaManifest} from '../migrations/schema.js'
import {wildcardReleaseFingerprint,checkWildcardApproval,verifyWildcardGrants} from '../migrations/hostinger-wildcard.js'
import {checkCloudApproval,verifyCloudGrants} from '../migrations/cloud-startup.js'
import {validLocalApprovalId} from '../config/database-transport.js'
import {platformOwnerEmail} from '../config/platform-owner.js'
import {bootstrapInput,bootstrapPlatform} from './bootstrap.js'
import {withDatabaseState} from './database-state.js'

export const cronJob=z.object({
 action:z.enum(['preflight','apply','verify-complete','bootstrap','check-runtime']),
 policy:targetPolicy,
 releaseFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
 operatorReference:z.string().refine(validLocalApprovalId),
 recoveryReference:z.string().refine(validLocalApprovalId),
 confirmation:z.string(),
}).strict()
export type CronJob=z.infer<typeof cronJob>

// No filesystem state, child process, HTTP endpoint, automatic phase advance or retry.
export async function executeCronJob(job:CronJob,pool:Pool,statePool:Pool,env:NodeJS.ProcessEnv){
 const p=job.policy,fingerprint=digest(p)
 if(job.confirmation!==`INITIALIZE:${job.action}:${fingerprint}`)throw Error('INITIALIZATION_CONFIRMATION_REQUIRED')
 if(job.releaseFingerprint!==await wildcardReleaseFingerprint())throw Error('INITIALIZATION_RELEASE_MISMATCH')
 if(p.hostingerWildcard&&(p.hostingerWildcard.operatorReference!==job.operatorReference||p.hostingerWildcard.recoveryReference!==job.recoveryReference))throw Error('INITIALIZATION_REFERENCE_MISMATCH')
 const context={localTransportApproval:{acknowledgement:env.HOSTINGER_LOCAL_APPROVAL,approvalId:env.HOSTINGER_LOCAL_APPROVAL_ID},...(env.HOSTINGER_WILDCARD_APPROVAL_ID?{wildcardApprovalId:env.HOSTINGER_WILDCARD_APPROVAL_ID}:{}),...(env.CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID?{cloudApprovalId:env.CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID}:{})}
 operatorTransport(p,context.localTransportApproval)
 checkCloudApproval(p,context.cloudApprovalId)
 checkWildcardApproval(p,context.wildcardApprovalId,job.action==='bootstrap'?'bootstrap':job.action==='verify-complete'?'verify':job.action==='check-runtime'?'runtime':'initial')
 const files=await loadMigrations(new URL('../../migrations/',import.meta.url))
 const manifest=JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8')) as SchemaManifest
 if(p.hostingerWildcard&&(p.hostingerWildcard.manifestFingerprint!==digest(manifest)||p.hostingerWildcard.releaseFingerprint!==job.releaseFingerprint))throw Error('INITIALIZATION_MANIFEST_OR_RELEASE_MISMATCH')
 if(p.cloudStartup&&p.cloudStartup.manifestFingerprint!==digest(manifest))throw Error('INITIALIZATION_MANIFEST_MISMATCH')
 const input=job.action==='bootstrap'?bootstrapInput.parse({platformName:env.BOOTSTRAP_PLATFORM_NAME,email:env.BOOTSTRAP_OWNER_EMAIL??platformOwnerEmail,displayName:env.BOOTSTRAP_OWNER_NAME,password:env.BOOTSTRAP_OWNER_PASSWORD}):undefined
 // Phases and releases share a target key: a redeploy cannot erase a failed attempt.
 const target=digest({host:p.host,port:p.port,database:p.database})
 const connection=await pool.getConnection()
 try{await verifyTarget(connection,p,context.localTransportApproval)}finally{connection.release()}
 return withDatabaseState(statePool,target,async state=>{
  const previous=await state.get(job.action+'.started')
  let reviewed=false
  if(previous){
   if(job.action!=='preflight'||env.INITIALIZATION_PREFLIGHT_REVIEW!=='OWNER_REVIEWED_FAILED_EMPTY_PREFLIGHT'||await state.get('preflight.reviewed')||await state.get('preflight.completed')||await state.get('apply.started')||await state.get('bootstrap.started')||!await state.failed('preflight'))throw Error('INITIALIZATION_ALREADY_ATTEMPTED_REVIEW_REQUIRED')
   // Only one explicit recovery of a failed read-only preflight. Never reset
   // markers, retry apply/bootstrap, or accept a nonempty application schema.
   const db=await pool.getConnection()
   try{
    const [[row]]=await db.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')
    if(Number(row?.n)!==0)throw Error('INITIALIZATION_PREFLIGHT_REVIEW_REQUIRES_EMPTY_SCHEMA')
   }finally{db.release()}
   reviewed=true
  }
  let approval:Approval|undefined
  if(job.action==='apply'){
   const prior=await state.get('preflight.completed') as {targetFingerprint?:string;releaseFingerprint?:string;result?:{approval?:Approval}}|undefined
   if(prior?.targetFingerprint!==fingerprint||prior.releaseFingerprint!==job.releaseFingerprint||!prior.result?.approval)throw Error('INITIALIZATION_PREFLIGHT_REQUIRED')
   approval=prior.result.approval
  }
  await state.put(reviewed?'preflight.reviewed':job.action+'.started',{at:new Date().toISOString(),targetFingerprint:fingerprint,releaseFingerprint:job.releaseFingerprint,operatorReference:job.operatorReference,recoveryReference:job.recoveryReference,...(reviewed?{previousAttempt:previous}:{})})
  let interrupted=false
  const stop=()=>{interrupted=true}
  process.on('SIGINT',stop);process.on('SIGTERM',stop)
  try{
   const result=input?await bootstrapPlatform(pool,input,async db=>{
    if(interrupted)throw Error('INITIALIZATION_INTERRUPTED')
    await state.owned()
    checkCloudApproval(p,context.cloudApprovalId);checkWildcardApproval(p,context.wildcardApprovalId,'bootstrap')
    if(db){
     await verifyTarget(db,p,context.localTransportApproval)
     if(p.hostingerWildcard)await verifyWildcardGrants(db,p.hostingerWildcard)
     if(p.cloudStartup)await verifyCloudGrants(db,p.database,p.cloudStartup)
     const [triggers]=await db.query<RowDataPacket[]>('SELECT DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')
     if(triggers.some(t=>![p.expectedAccount,...p.allowedTriggerDefiners].includes(String(t.DEFINER))))throw Error('INITIALIZATION_UNAPPROVED_DEFINER')
    }
   }):await operatorMigrations(pool,files,manifest,p,job.action as 'preflight'|'apply'|'verify-complete'|'check-runtime',{
    ...context,...(approval?{approval}:{}),productionConfirmation:`APPLY-PRODUCTION:${fingerprint}`,
    interrupted:()=>interrupted,
    audit:async event=>{await state.put('audit',{at:new Date().toISOString(),action:job.action,...event},true)},
   })
   await state.put(job.action+'.completed',{targetFingerprint:fingerprint,releaseFingerprint:job.releaseFingerprint,result})
   return {action:job.action,completed:true}
  }catch(error){
   await state.put('failure',{action:job.action,at:new Date().toISOString(),code:'INITIALIZATION_REVIEW_REQUIRED'},true).catch(()=>{})
   throw error
  }finally{process.off('SIGINT',stop);process.off('SIGTERM',stop)}
 })
}

export async function runCronFromEnvironment(env:NodeJS.ProcessEnv){
 const job=cronJob.parse(JSON.parse(env.INITIALIZATION_CRON_JOB??'')),p=job.policy
 const stateName=env.INITIALIZATION_STATE_DB_NAME
 if(!stateName||!/^[a-zA-Z0-9_]{1,64}$/.test(stateName)||stateName.toLowerCase()===p.database.toLowerCase())throw Error('SEPARATE_INITIALIZATION_STATE_DATABASE_REQUIRED')
 for(const key of ['INITIALIZATION_STATE_DB_USER','INITIALIZATION_STATE_DB_PASSWORD','MIGRATION_DB_USER','MIGRATION_DB_PASSWORD'])if(!env[key])throw Error('MISSING_INITIALIZATION_CREDENTIALS')
 const transport=operatorTransport(p,{acknowledgement:env.HOSTINGER_LOCAL_APPROVAL,approvalId:env.HOSTINGER_LOCAL_APPROVAL_ID})
 const common={NODE_ENV:p.environment==='local'?'test' as const:'production' as const,HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:p.host,DB_PORT:p.port,DB_CONNECTION_LIMIT:2,DB_TLS_MODE:transport.mode,HOSTINGER_LOCAL_APPROVAL:env.HOSTINGER_LOCAL_APPROVAL,HOSTINGER_LOCAL_APPROVAL_ID:env.HOSTINGER_LOCAL_APPROVAL_ID,...(p.tlsCaFile?{DB_TLS_CA_FILE:p.tlsCaFile,DB_TLS_CA_SHA256:p.tlsCaSha256!}:{})}
 const pool=createDatabasePool({...common,DB_NAME:p.database,DB_USER:env.MIGRATION_DB_USER!,DB_PASSWORD:env.MIGRATION_DB_PASSWORD!})
 const statePool=createDatabasePool({...common,DB_NAME:stateName,DB_USER:env.INITIALIZATION_STATE_DB_USER!,DB_PASSWORD:env.INITIALIZATION_STATE_DB_PASSWORD!})
 try{return await executeCronJob(job,pool,statePool,env)}finally{await Promise.all([pool.end(),statePool.end()])}
}
