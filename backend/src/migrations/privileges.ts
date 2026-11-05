import type {PoolConnection,RowDataPacket} from 'mysql2/promise'
import {MigrationError} from './runner.js'
import {digest} from './schema.js'

export const runtimePrivileges:Record<string,string[]>={
 industry_channels:['SELECT','UPDATE'],users:['SELECT','INSERT','UPDATE'],tenants:['SELECT','INSERT','UPDATE'],
 roles:['SELECT'],permissions:['SELECT'],role_permissions:['SELECT'],tenant_memberships:['SELECT','INSERT','UPDATE'],
 auth_sessions:['SELECT','INSERT','UPDATE'],auth_tokens:['SELECT','INSERT','UPDATE'],channel_versions:['SELECT','INSERT','UPDATE'],
 branches:['SELECT','INSERT','UPDATE'],review_destinations:['SELECT','INSERT','UPDATE'],funnel_configurations:['SELECT','INSERT','UPDATE'],
 short_links:['SELECT','INSERT','UPDATE'],qr_assets:['SELECT','INSERT','UPDATE'],private_feedback:['SELECT','INSERT','UPDATE'],
 feedback_status_events:['SELECT','INSERT'],subscription_plans:['SELECT'],plan_limits:['SELECT'],subscriptions:['SELECT','INSERT','UPDATE'],
 usage_records:['SELECT','INSERT'],usage_counters:['SELECT','INSERT','UPDATE'],audit_logs:['SELECT','INSERT'],
 user_mfa:['SELECT','INSERT','UPDATE'],mfa_recovery_codes:['SELECT','INSERT','UPDATE'],
}
const migrationDml:Record<string,string[]>={schema_migrations:['INSERT','UPDATE'],industry_channels:['INSERT'],roles:['INSERT'],permissions:['INSERT'],role_permissions:['INSERT']}
// No inherited roles or column/routine/proxy grants are silently approximated.
// Reject unsupported grant syntax rather than overstate effective privileges.
export function inspectGrants(lines:string[],database:string,profile:'migration'|'runtime'){
 const schema=new Set<string>(),tables:Record<string,Set<string>>={}
 for(const line of lines){
  if(/ TO PUBLIC(?:\s|$)/i.test(line))throw new MigrationError('PUBLIC_GRANTS_REQUIRE_REVIEW')
  const match=/^GRANT (.+) ON (\*|`(?:``|[^`])+`)\.(\*|`(?:``|[^`])+`) TO /i.exec(line)
  if(!match||/ WITH GRANT OPTION/i.test(line))throw new MigrationError('UNSUPPORTED_OR_EXCESSIVE_GRANTS')
  const privs=match[1]!.split(',').map(p=>p.trim().toUpperCase())
  const unquote=(v:string)=>v==='*'?v:v.slice(1,-1).replaceAll('``','`')
  const rawDb=unquote(match[2]!),table=unquote(match[3]!)
  // Schema grants use LIKE patterns even inside backticks. Reject wildcard
  // grants and decode only explicit literal escapes; table grants are literal.
  if(table==='*'&&rawDb!=='*'&&/(^|[^\\])[_%]/.test(rawDb))throw new MigrationError('WILDCARD_DATABASE_GRANT_REQUIRES_REVIEW')
  const db=table==='*'?rawDb.replace(/\\([_%\\])/g,'$1'):rawDb
  if(db==='*'&&table==='*'&&privs.length===1&&privs[0]==='USAGE')continue
  if(db!==database)throw new MigrationError('UNSUPPORTED_OR_EXCESSIVE_GRANTS')
  const allowed=profile==='migration'?(table==='*'?['SELECT','CREATE','ALTER','TRIGGER']:migrationDml[table]?['CREATE',...migrationDml[table]]:[]):table==='*'?[]:runtimePrivileges[table]??[]
  if(privs.some(p=>!allowed.includes(p)))throw new MigrationError('UNSUPPORTED_OR_EXCESSIVE_GRANTS')
  const target=table==='*'?schema:tables[table]??=new Set();privs.forEach(p=>target.add(p))
 }
 if(profile==='migration'){
  if(['SELECT','CREATE','ALTER','TRIGGER'].some(p=>!schema.has(p))||Object.entries(migrationDml).some(([t,ps])=>ps.some(p=>!tables[t]?.has(p))))throw new MigrationError('MISSING_REQUIRED_PRIVILEGES')
 }else if(Object.entries(runtimePrivileges).some(([t,ps])=>ps.some(p=>!tables[t]?.has(p))))throw new MigrationError('MISSING_REQUIRED_PRIVILEGES')
 return digest({schema:[...schema].sort(),tables:Object.fromEntries(Object.keys(tables).sort().map(t=>[t,[...tables[t]!].sort()]))})
}
export async function verifyPrivileges(db:PoolConnection,database:string,profile:'migration'|'runtime'){
 const [[identity]] = await db.query<RowDataPacket[]>('SELECT CURRENT_USER() AS account,CURRENT_ROLE() AS role')
 if(identity?.role&&identity.role!=='NONE')throw new MigrationError('ROLE_PRIVILEGES_REQUIRE_REVIEW')
 const [rows]=await db.query<RowDataPacket[]>('SHOW GRANTS')
 return {account:String(identity?.account),fingerprint:inspectGrants(rows.map(row=>String(Object.values(row)[0])),database,profile)}
}
