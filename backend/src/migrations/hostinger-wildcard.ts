import {z} from 'zod'
import {readFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import type {PoolConnection,RowDataPacket} from 'mysql2/promise'
import {validLocalApprovalId} from '../config/database-transport.js'
import {MigrationError} from './runner.js'
import {digest} from './schema.js'

export const wildcardDatabase='u676472791_magicreview_db'
export const wildcardAccount='u676472791_magicrev_user@127.0.0.1'
export const wildcardAcknowledgement='I_ACCEPT_WILDCARD_SCHEMA_AUTHORITY_AND_SHARED_DEFINER_RISK'
const reference=z.string().refine(validLocalApprovalId)
export const hostingerWildcardPolicy=z.object({
 phase:z.enum(['initial','verify','bootstrap','runtime']),approvalId:reference,
 operatorReference:reference,recoveryReference:reference,runtimeApprovalReference:reference,
 grantFingerprint:z.string().regex(/^[a-f0-9]{64}$/),manifestFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
 releaseFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
 notBefore:z.string().datetime(),expiresAt:z.string().datetime(),
 riskAcknowledgement:z.literal(wildcardAcknowledgement),
}).strict().superRefine((p,c)=>{
 const duration=Date.parse(p.expiresAt)-Date.parse(p.notBefore)
 if(duration<=0||duration>(p.phase==='runtime'?30*86400000:3600000))c.addIssue({code:'custom',message:'Invalid wildcard authorization window'})
})
export type WildcardPolicy=z.infer<typeof hostingerWildcardPolicy>
type Target={environment:string;host:string;port:number;database:string;expectedAccount:string;transport?:string|undefined;hostingerWildcard?:WildcardPolicy|undefined}
export function checkWildcardApproval(target:Target,approvalId?:string,phase?:WildcardPolicy['phase'],now=Date.now()){
 const p=target.hostingerWildcard
 if(!p)return
 if(!hostingerWildcardPolicy.safeParse(p).success||target.environment!=='production'||target.transport!=='HOSTINGER_LOCAL'||target.host!=='127.0.0.1'||target.port!==3306||target.database!==wildcardDatabase||target.expectedAccount!==wildcardAccount||approvalId!==p.approvalId)throw new MigrationError('HOSTINGER_WILDCARD_APPROVAL_REQUIRED')
 if(phase&&p.phase!==phase)throw new MigrationError('HOSTINGER_WILDCARD_PHASE_MISMATCH')
 if(now<Date.parse(p.notBefore)||now>=Date.parse(p.expiresAt))throw new MigrationError('HOSTINGER_WILDCARD_APPROVAL_EXPIRED')
}

// Pin the installed compiled backend, SQL/verification bytes and manifest. No Git,
// dotenv, secrets, dependencies or production network access is used by this hash.
export async function wildcardReleaseFingerprint(){
 const hash=createHash('sha256')
 async function walk(root:URL,prefix:string){
  for(const entry of (await readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   if(entry.isSymbolicLink())throw new MigrationError('HOSTINGER_WILDCARD_RELEASE_SYMLINK')
   const file=new URL(entry.name+(entry.isDirectory()?'/':''),root),name=prefix+entry.name
   if(entry.isDirectory())await walk(file,name+'/')
   else if(entry.isFile()&&(name.endsWith('.js')||name.endsWith('.sql'))){const bytes=await readFile(file);hash.update(name+'\0'+bytes.length+'\0');hash.update(bytes)}
  }
 }
 await walk(new URL('../',import.meta.url),'dist/')
 await walk(new URL('../../migrations/',import.meta.url),'migrations/')
 hash.update(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url)))
 return hash.digest('hex')
}

// Intentionally weaker authority contract, never called by existing profiles.
// Require precisely one reviewed raw schema row and optional global USAGE only.
export function inspectWildcardGrants(lines:string[],phase:WildcardPolicy['phase']){
 let schema:string[]|undefined,usage=false,statementLimit:string|undefined
 for(const line of lines){
  const m=/^GRANT (.+) ON (\*|`[^`]+`)\.\* TO [`']([^`']+)[`']@[`']([^`']+)[`'](.*)$/.exec(line)
  if(!m||m[3]+'@'+m[4]!==wildcardAccount||/\bPUBLIC\b/i.test(line))throw new MigrationError('HOSTINGER_WILDCARD_UNEXPECTED_GRANTS')
  let tail=m[5]!
  const limited=tail.endsWith(' WITH MAX_STATEMENT_TIME 180.000000')
  if(limited){
   if(m[2]!=='*'||m[1]!=='USAGE')throw new MigrationError('HOSTINGER_WILDCARD_UNEXPECTED_GRANTS')
   tail=tail.slice(0,-' WITH MAX_STATEMENT_TIME 180.000000'.length);statementLimit='180.000000'
  }
  if(/\bWITH\b/i.test(tail)||!/^(?:| IDENTIFIED (?:BY PASSWORD|VIA) .*)$/.test(tail))throw new MigrationError('HOSTINGER_WILDCARD_UNEXPECTED_GRANTS')
  if(m[2]==='*'&&m[1]==='USAGE'&&!usage){usage=true;continue}
  if(m[2]!=='`'+wildcardDatabase+'`'||schema)throw new MigrationError('HOSTINGER_WILDCARD_PATTERN_MISMATCH')
  schema=m[1]!.split(',').map(x=>x.trim()).sort()
 }
 const expected=phase==='runtime'?['INSERT','SELECT','TRIGGER','UPDATE']:['ALL PRIVILEGES']
 if(!schema||JSON.stringify(schema)!==JSON.stringify(expected))throw new MigrationError('HOSTINGER_WILDCARD_PRIVILEGE_SET_MISMATCH')
 return digest({pattern:wildcardDatabase,account:wildcardAccount,authority:schema,...(statementLimit?{maxStatementTime:statementLimit}:{})})
}
export async function verifyWildcardGrants(db:PoolConnection,policy:WildcardPolicy){
 const [[identity]]=await db.query<RowDataPacket[]>('SELECT CURRENT_USER() AS account,CURRENT_ROLE() AS role,VERSION() AS version')
 if(identity?.account!==wildcardAccount||(identity?.role&&identity.role!=='NONE')||!/^(?:5\.5\.5-)?11\.8\.9-MariaDB(?:[-+].*)?$/.test(String(identity?.version)))throw new MigrationError('HOSTINGER_WILDCARD_IDENTITY_VERSION_OR_ROLE')
 const [rows]=await db.query<RowDataPacket[]>('SHOW GRANTS')
 const fingerprint=inspectWildcardGrants(rows.map(row=>String(Object.values(row)[0])),policy.phase)
 if(fingerprint!==policy.grantFingerprint)throw new MigrationError('HOSTINGER_WILDCARD_GRANT_DRIFT')
 return {fingerprint}
}
export const wildcardRisks=Object.freeze([
 'Raw underscores authorize matching other and future schemas; exact database isolation is false',
 'Shared database-wide DML includes identity, role and migration-ledger writes',
 'Retained TRIGGER permits replacing or dropping integrity guards',
 'Loopback transport is unencrypted and tenant isolation is unverified',
 'Approval expiry does not revoke SQL privileges; provider reduction is not established',
])
export function wildcardDisclosure(policy:WildcardPolicy){return {permissionPolicy:'hostinger-wildcard',phase:policy.phase,approvalReference:policy.approvalId,exactDatabaseIsolation:false,encrypted:false,rawGrantPattern:wildcardDatabase,retainedPrivileges:policy.phase==='runtime'?['SELECT','INSERT','UPDATE','TRIGGER']:['ALL PRIVILEGES'],releaseFingerprint:policy.releaseFingerprint,risks:wildcardRisks}}
