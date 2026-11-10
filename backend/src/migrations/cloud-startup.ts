import {z} from 'zod'
import type {PoolConnection,RowDataPacket} from 'mysql2/promise'
import {MigrationError} from './runner.js'
import {digest} from './schema.js'
import {validLocalApprovalId} from '../config/database-transport.js'

export const cloudRiskAcknowledgement='I_ACCEPT_DATABASE_WIDE_DML_AND_TRIGGER_MANAGEMENT'
const reference=z.string().refine(validLocalApprovalId)
export const cloudStartupPolicy=z.object({
 profile:z.enum(['initial-maintenance','runtime-dbwide']),approvalId:reference,
 operatorReference:reference,recoveryReference:reference,
 grantFingerprint:z.string().regex(/^[a-f0-9]{64}$/),manifestFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
 notBefore:z.string().datetime(),expiresAt:z.string().datetime(),
 riskAcknowledgement:z.literal(cloudRiskAcknowledgement),
}).strict().superRefine((p,c)=>{
 const duration=Date.parse(p.expiresAt)-Date.parse(p.notBefore)
 if(duration<=0||duration>(p.profile==='initial-maintenance'?3600000:30*86400000))c.addIssue({code:'custom',message:'Invalid bounded Cloud Startup approval window'})
})
export type CloudStartupPolicy=z.infer<typeof cloudStartupPolicy>
type Target={environment:string;host:string;port:number;transport?:string|undefined;cloudStartup?:CloudStartupPolicy|undefined}
export function checkCloudApproval(policy:Target,approvalId?:string,now=Date.now()){
 const p=policy.cloudStartup
 if(!p)return
 if(!cloudStartupPolicy.safeParse(p).success||policy.environment!=='production'||policy.transport!=='HOSTINGER_LOCAL'||policy.host!=='127.0.0.1'||policy.port!==3306||approvalId!==p.approvalId)throw new MigrationError('CLOUD_STARTUP_APPROVAL_REQUIRED')
 if(now<Date.parse(p.notBefore)||now>=Date.parse(p.expiresAt))throw new MigrationError('CLOUD_STARTUP_APPROVAL_EXPIRED_OR_NOT_ACTIVE')
}

// Separate interpreter: existing strict profiles never call this or accept ALL.
// Fingerprint only normalized authority, never authentication clauses/hashes.
export function inspectCloudGrants(lines:string[],database:string,profile:CloudStartupPolicy['profile']){
 const authority=new Set<string>()
 for(const line of lines){
  if(/ TO PUBLIC(?:\s|$)| WITH (?:GRANT|ADMIN) OPTION/i.test(line))throw new MigrationError('CLOUD_STARTUP_UNSUPPORTED_GRANTS')
  const match=/^GRANT (.+) ON (\*|`(?:``|[^`])+`)\.(\*|`(?:``|[^`])+`) TO /i.exec(line)
  if(!match)throw new MigrationError('CLOUD_STARTUP_UNSUPPORTED_GRANTS')
  const unquote=(s:string)=>s==='*'?s:s.slice(1,-1).replaceAll('``','`')
  const raw=unquote(match[2]!),table=unquote(match[3]!),privs=match[1]!.split(',').map(p=>p.trim().toUpperCase())
  if(raw==='*'&&table==='*'&&privs.length===1&&privs[0]==='USAGE')continue
  if(table!=='*'||/(^|[^\\])[_%]/.test(raw)||/\\(?![_%\\])/.test(raw)||raw.replace(/\\([_%\\])/g,'$1')!==database)throw new MigrationError('CLOUD_STARTUP_GRANT_SCOPE_MISMATCH')
  for(const privilege of privs)authority.add(privilege)
 }
 const required=profile==='runtime-dbwide'?['SELECT','INSERT','UPDATE','TRIGGER']:['SELECT','INSERT','UPDATE','CREATE','ALTER','TRIGGER']
 // Initial explicit schema privileges can also be reduced by provider before apply;
 // reject unknown extras. ALL is an explicit, pinned MariaDB11.8.9 exception only.
 const allowed=profile==='runtime-dbwide'?required:[...required,'ALL PRIVILEGES','DROP','INDEX','REFERENCES','DELETE','CREATE VIEW','SHOW VIEW','CREATE ROUTINE','ALTER ROUTINE','EXECUTE','EVENT','DELETE HISTORY','LOCK TABLES','CREATE TEMPORARY TABLES']
 if([...authority].some(p=>!allowed.includes(p))||(!authority.has('ALL PRIVILEGES')&&required.some(p=>!authority.has(p)))||authority.size===0)throw new MigrationError('CLOUD_STARTUP_INVALID_PRIVILEGE_SET')
 return digest({database,profile,schema:[...authority].sort()})
}
export async function verifyCloudGrants(db:PoolConnection,database:string,p:CloudStartupPolicy){
 const [[identity]]=await db.query<RowDataPacket[]>('SELECT CURRENT_ROLE() AS role,VERSION() AS version')
 if(identity?.role&&identity.role!=='NONE')throw new MigrationError('ROLE_PRIVILEGES_REQUIRE_REVIEW')
 if(!/^(?:5\.5\.5-)?11\.8\.9-MariaDB(?:[-+].*)?$/i.test(String(identity?.version)))throw new MigrationError('CLOUD_STARTUP_MARIADB_11_8_9_REQUIRED')
 const [rows]=await db.query<RowDataPacket[]>('SHOW GRANTS')
 const fingerprint=inspectCloudGrants(rows.map(row=>String(Object.values(row)[0])),database,p.profile)
 if(fingerprint!==p.grantFingerprint)throw new MigrationError('CLOUD_STARTUP_GRANT_FINGERPRINT_MISMATCH')
 return {fingerprint}
}
export const cloudRuntimeRisks=Object.freeze([
 'Unencrypted loopback is not verified TLS or proven tenant isolation',
 'Database-wide INSERT/UPDATE includes ledger, identity, roles and append-only tables; SQL privilege separation is lost',
 'TRIGGER permits creating/replacing/dropping guards; append-only protections are not tamper-proof against credential compromise',
 'Approval expiry does not revoke database privileges or stop in-flight statements',
])
