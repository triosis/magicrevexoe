import {z} from 'zod'
import {isIP} from 'node:net'
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise'
import {runMigrations,MigrationError,supportedVersion,type Migration} from './runner.js'
import {digest,validateManifest,verifySchema,type SchemaManifest} from './schema.js'
import {verifyPrivileges} from './privileges.js'
import {databaseTransport,validLocalApprovalId,type TransportSelection} from '../config/database-transport.js'
import {cloudStartupPolicy,checkCloudApproval,verifyCloudGrants,cloudRuntimeRisks} from './cloud-startup.js'

export const targetPolicy=z.object({
 environment:z.enum(['local','staging','production']),host:z.string().regex(/^[a-zA-Z0-9.:-]+$/),port:z.number().int().min(1).max(65535),
 database:z.string().regex(/^[a-zA-Z0-9_]{1,64}$/),serverHostname:z.string().min(1).max(255),expectedAccount:z.string().min(3).max(160),
 allowedTriggerDefiners:z.array(z.string().min(3).max(160)).default([]),tlsCaFile:z.string().min(1).optional(),tlsCaSha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),
 transport:z.literal('HOSTINGER_LOCAL').optional(),hostingerLocalApprovalId:z.string().refine(validLocalApprovalId).optional(),
 cloudStartup:cloudStartupPolicy.optional(),
}).strict().superRefine((p,c)=>{
 if(p.cloudStartup&&(p.environment!=='production'||p.transport!=='HOSTINGER_LOCAL'||p.host!=='127.0.0.1'||p.port!==3306))c.addIssue({code:'custom',message:'Cloud Startup requires explicit production loopback transport'})
 if(p.transport==='HOSTINGER_LOCAL'){
  if(p.environment!=='production'||p.host!=='127.0.0.1'||p.port!==3306||!p.hostingerLocalApprovalId||p.tlsCaFile!==undefined||p.tlsCaSha256!==undefined)c.addIssue({code:'custom',message:'Invalid explicitly approved Hostinger local target'})
  return
 }
 if(p.hostingerLocalApprovalId!==undefined)c.addIssue({code:'custom',message:'Local approval reference requires explicit local transport'})
 const local=['127.0.0.1','::1'].includes(p.host)
 if(p.environment==='local'&&(!local||!/^magicreview_migration_[a-z0-9_]+$/.test(p.database)))c.addIssue({code:'custom',message:'Invalid local target'})
 if(p.environment!=='local'&&(!p.tlsCaFile||!p.tlsCaSha256))c.addIssue({code:'custom',message:'Verified pinned TLS CA required'})
 if(p.environment!=='local'&&isIP(p.host))c.addIssue({code:'custom',message:'Verified TLS requires DNS hostname'})
})
export type TargetPolicy=z.infer<typeof targetPolicy>
export type LocalTransportApproval={acknowledgement?:string|undefined;approvalId?:string|undefined}
export function operatorTransport(policy:TargetPolicy,approval?:LocalTransportApproval):TransportSelection{
 if(policy.transport==='HOSTINGER_LOCAL'){
  // Validate even direct library calls that have not passed the JSON parser.
  if(policy.environment!=='production'||approval?.approvalId!==policy.hostingerLocalApprovalId)throw new MigrationError('HOSTINGER_LOCAL_APPROVAL_MISMATCH')
  try{return databaseTransport({NODE_ENV:'production',DB_HOST:policy.host,DB_PORT:policy.port,DB_TLS_MODE:'HOSTINGER_LOCAL',DB_TLS_CA_FILE:policy.tlsCaFile,DB_TLS_CA_SHA256:policy.tlsCaSha256,HOSTINGER_LOCAL_APPROVAL:approval?.acknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:approval?.approvalId})}
  catch{throw new MigrationError('INVALID_HOSTINGER_LOCAL_TRANSPORT_OR_APPROVAL')}
 }
 if(policy.hostingerLocalApprovalId!==undefined)throw new MigrationError('UNEXPECTED_LOCAL_APPROVAL_REFERENCE')
 return databaseTransport({NODE_ENV:policy.environment==='local'?'test':'production',DB_HOST:policy.host,DB_PORT:policy.port,DB_TLS_MODE:policy.environment==='local'?'disabled':'required',DB_TLS_CA_FILE:policy.tlsCaFile,DB_TLS_CA_SHA256:policy.tlsCaSha256})
}
export type Approval={digest:string;expiresAt:number}
export type AuditEvent={event:string;version?:string;code?:string;approvalDigest?:string;transport?:string;approvalReference?:string;cloudProfile?:string;cloudApprovalId?:string;expiresAt?:string}
export async function verifyTarget(db:PoolConnection,policy:TargetPolicy,localApproval?:LocalTransportApproval){
 const transport=operatorTransport(policy,localApproval)
 if(transport.mode==='HOSTINGER_LOCAL'&&(db.connection.config.host!=='127.0.0.1'||db.connection.config.port!==3306))throw new MigrationError('UNEXPECTED_LOCAL_DATABASE_CONNECTION')
 const [[server]]=await db.query<RowDataPacket[]>('SELECT VERSION() AS version,DATABASE() AS db,@@hostname AS hostname,CURRENT_USER() AS account')
 if(!server||server.db!==policy.database||server.hostname!==policy.serverHostname||server.account!==policy.expectedAccount)throw new MigrationError('UNEXPECTED_DATABASE_TARGET')
 if(!supportedVersion(String(server.version)))throw new MigrationError('UNSUPPORTED_DATABASE_VERSION')
 if(policy.environment!=='local'&&transport.mode==='required'){
  const [tls]=await db.query<RowDataPacket[]>("SHOW SESSION STATUS LIKE 'Ssl_cipher'")
  if(!tls[0]?.Value)throw new MigrationError('VERIFIED_DATABASE_TLS_REQUIRED')
 }
 return digest({version:server.version,db:server.db,hostname:server.hostname,account:server.account})
}
export async function operatorMigrations(pool:Pool,files:Migration[],manifest:SchemaManifest,policy:TargetPolicy,mode:'preflight'|'apply',options:{approval?:Approval;productionConfirmation?:string;audit?:(event:AuditEvent)=>Promise<void>;interrupted?:()=>boolean;localTransportApproval?:LocalTransportApproval;cloudApprovalId?:string}={}){
 if(!['preflight','apply'].includes(mode))throw new MigrationError('INVALID_OPERATOR_MODE')
 if(mode==='apply'&&policy.environment==='production'&&options.productionConfirmation!==`APPLY-PRODUCTION:${digest(policy)}`)throw new MigrationError('EXPLICIT_PRODUCTION_CONFIRMATION_REQUIRED')
 const transport=operatorTransport(policy,options.localTransportApproval)
 checkCloudApproval(policy,options.cloudApprovalId)
 if(policy.cloudStartup?.profile==='runtime-dbwide')throw new MigrationError('CLOUD_RUNTIME_PROFILE_CANNOT_MIGRATE')
 validateManifest(manifest,files)
 if(policy.cloudStartup&&policy.cloudStartup.manifestFingerprint!==digest(manifest))throw new MigrationError('CLOUD_STARTUP_MANIFEST_MISMATCH')
 const expiresAt=mode==='preflight'?Date.now()+15*60_000:options.approval?.expiresAt??0
 if(mode==='apply'&&(!options.audit||!Number.isSafeInteger(expiresAt)||expiresAt<Date.now()||expiresAt>Date.now()+15*60_000))throw new MigrationError('EXPLICIT_RECENT_APPROVAL_REQUIRED')
 let identity='',grants='',approval:Approval|undefined
 const boundary=()=>{checkCloudApproval(policy,options.cloudApprovalId);if(policy.cloudStartup&&mode==='apply'&&Date.now()>=expiresAt)throw new MigrationError('EXPLICIT_RECENT_APPROVAL_REQUIRED')}
 const result=await runMigrations(pool,files,mode==='preflight'?'status':'up',5,{
  beforeStep:boundary,
  validateConnection:async db=>{boundary();identity=await verifyTarget(db,policy,options.localTransportApproval);grants=(policy.cloudStartup?await verifyCloudGrants(db,policy.database,policy.cloudStartup):await verifyPrivileges(db,policy.database,'migration')).fingerprint},
  inspect:async(db,count)=>{
   if(policy.cloudStartup&&!approval){
    boundary()
    if(count!==0)throw new MigrationError('CLOUD_STARTUP_INITIAL_EMPTY_ONLY')
    const [objects]=await db.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE())+(SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE())+(SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()) AS n')
    if(Number(objects[0]?.n)!==0)throw new MigrationError('CLOUD_STARTUP_INITIAL_EMPTY_ONLY')
   }
   const shape=await verifySchema(db,manifest,files,count)
   const [triggers]=await db.query<RowDataPacket[]>('SELECT DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')
   if(triggers.some(t=>![policy.expectedAccount,...policy.allowedTriggerDefiners].includes(String(t.DEFINER))))throw new MigrationError('UNAPPROVED_TRIGGER_DEFINER')
   if(!approval){
    approval={digest:digest({policy,identity,grants,shape,manifest:digest(manifest),count,expiresAt}),expiresAt}
    if(mode==='apply'){
     if(approval.digest!==options.approval?.digest)throw new MigrationError('PREFLIGHT_APPROVAL_MISMATCH')
     await options.audit!({event:'approved_execution_started',approvalDigest:approval.digest,...(transport.mode==='HOSTINGER_LOCAL'?{transport:transport.mode,approvalReference:transport.approvalId}:{}),...(policy.cloudStartup?{cloudProfile:policy.cloudStartup.profile,cloudApprovalId:policy.cloudStartup.approvalId,expiresAt:policy.cloudStartup.expiresAt}:{})})
    }
   }
  },
  progress:async event=>{if(event.event==='step_started')boundary();await options.audit?.(event)},
  interrupted:()=>options.interrupted?.()??false,
 })
 return {mode,targetFingerprint:digest(policy),manifestFingerprint:digest(manifest),approval,...result,dryRunGuarantee:false,...(transport.mode==='HOSTINGER_LOCAL'?{transport:transport.mode,encrypted:false,approvalReference:transport.approvalId}:{}),...(policy.cloudStartup?{cloudProfile:policy.cloudStartup.profile,cloudApprovalId:policy.cloudStartup.approvalId,expiresAt:policy.cloudStartup.expiresAt,risks:cloudRuntimeRisks}:{})}
}
