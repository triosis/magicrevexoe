import {z} from 'zod'
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise'
import {runMigrations,MigrationError,supportedVersion,type Migration} from './runner.js'
import {digest,validateManifest,verifySchema,type SchemaManifest} from './schema.js'
import {verifyPrivileges} from './privileges.js'

export const targetPolicy=z.object({
 environment:z.enum(['local','staging','production']),host:z.string().regex(/^[a-zA-Z0-9.:-]+$/),port:z.number().int().min(1).max(65535),
 database:z.string().regex(/^[a-zA-Z0-9_]{1,64}$/),serverHostname:z.string().min(1).max(255),expectedAccount:z.string().min(3).max(160),
 allowedTriggerDefiners:z.array(z.string().min(3).max(160)).default([]),tlsCaFile:z.string().min(1).optional(),tlsCaSha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict().superRefine((p,c)=>{
 const local=['127.0.0.1','::1'].includes(p.host)
 if(p.environment==='local'&&(!local||!/^magicreview_migration_[a-z0-9_]+$/.test(p.database)))c.addIssue({code:'custom',message:'Invalid local target'})
 if(p.environment!=='local'&&(!p.tlsCaFile||!p.tlsCaSha256))c.addIssue({code:'custom',message:'Verified pinned TLS CA required'})
})
export type TargetPolicy=z.infer<typeof targetPolicy>
export type Approval={digest:string;expiresAt:number}
export type AuditEvent={event:string;version?:string;code?:string;approvalDigest?:string}
export async function verifyTarget(db:PoolConnection,policy:TargetPolicy){
 const [[server]]=await db.query<RowDataPacket[]>('SELECT VERSION() AS version,DATABASE() AS db,@@hostname AS hostname,CURRENT_USER() AS account')
 if(!server||server.db!==policy.database||server.hostname!==policy.serverHostname||server.account!==policy.expectedAccount)throw new MigrationError('UNEXPECTED_DATABASE_TARGET')
 if(!supportedVersion(String(server.version)))throw new MigrationError('UNSUPPORTED_DATABASE_VERSION')
 if(policy.environment!=='local'){
  const [tls]=await db.query<RowDataPacket[]>("SHOW SESSION STATUS LIKE 'Ssl_cipher'")
  if(!tls[0]?.Value)throw new MigrationError('VERIFIED_DATABASE_TLS_REQUIRED')
 }
 return digest({version:server.version,db:server.db,hostname:server.hostname,account:server.account})
}
export async function operatorMigrations(pool:Pool,files:Migration[],manifest:SchemaManifest,policy:TargetPolicy,mode:'preflight'|'apply',options:{approval?:Approval;productionConfirmation?:string;audit?:(event:AuditEvent)=>Promise<void>;interrupted?:()=>boolean}={}){
 if(!['preflight','apply'].includes(mode))throw new MigrationError('INVALID_OPERATOR_MODE')
 if(mode==='apply'&&policy.environment==='production'&&options.productionConfirmation!==`APPLY-PRODUCTION:${digest(policy)}`)throw new MigrationError('EXPLICIT_PRODUCTION_CONFIRMATION_REQUIRED')
 validateManifest(manifest,files)
 const expiresAt=mode==='preflight'?Date.now()+15*60_000:options.approval?.expiresAt??0
 if(mode==='apply'&&(!options.audit||!Number.isSafeInteger(expiresAt)||expiresAt<Date.now()||expiresAt>Date.now()+15*60_000))throw new MigrationError('EXPLICIT_RECENT_APPROVAL_REQUIRED')
 let identity='',grants='',approval:Approval|undefined
 const result=await runMigrations(pool,files,mode==='preflight'?'status':'up',5,{
  validateConnection:async db=>{identity=await verifyTarget(db,policy);grants=(await verifyPrivileges(db,policy.database,'migration')).fingerprint},
  inspect:async(db,count)=>{
   const shape=await verifySchema(db,manifest,files,count)
   const [triggers]=await db.query<RowDataPacket[]>('SELECT DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')
   if(triggers.some(t=>![policy.expectedAccount,...policy.allowedTriggerDefiners].includes(String(t.DEFINER))))throw new MigrationError('UNAPPROVED_TRIGGER_DEFINER')
   if(!approval){
    approval={digest:digest({policy,identity,grants,shape,manifest:digest(manifest),count,expiresAt}),expiresAt}
    if(mode==='apply'){
     if(approval.digest!==options.approval?.digest)throw new MigrationError('PREFLIGHT_APPROVAL_MISMATCH')
     await options.audit!({event:'approved_execution_started',approvalDigest:approval.digest})
    }
   }
  },
  progress:async event=>{await options.audit?.(event)},
  interrupted:()=>options.interrupted?.()??false,
 })
 return {mode,targetFingerprint:digest(policy),manifestFingerprint:digest(manifest),approval,...result,dryRunGuarantee:false}
}
