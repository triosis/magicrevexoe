import {randomBytes, createHash} from 'node:crypto'
import type {Pool} from 'mysql2/promise'
import {z} from 'zod'
import {select} from '../auth/database.js'
import {hashPassword} from '../auth/passwords.js'
import {loadMigrations, validateHistory} from '../migrations/runner.js'
import {HttpError} from '../middleware/error-handler.js'
import {readFile} from 'node:fs/promises'
import {verifySchema,validateManifest,type SchemaManifest} from '../migrations/schema.js'

export const bootstrapInput = z.object({
  platformName:z.string().trim().min(1).max(160),
  email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
  displayName:z.string().trim().min(1).max(120),
  password:z.string().min(16).max(128).refine(v=>new Set(v).size>=10),
}).strict()

// Operator-only entry point; never mounted as an unauthenticated HTTP route.
// It cannot reset passwords, adopt an existing identity, or add a second root.
export async function bootstrapPlatform(pool:Pool, raw:unknown) {
  const parsed=bootstrapInput.safeParse(raw)
  if(!parsed.success)throw new HttpError(400,'Invalid bootstrap input')
  const input=parsed.data, passwordHash=await hashPassword(input.password)
  const files=await loadMigrations(new URL('../../migrations/',import.meta.url))
  const db=await pool.getConnection()
  let lock=''
  let locked=false
  try {
    lock='magicreview:migrate:'+createHash('sha256').update(String((await select(db,'SELECT DATABASE() AS name'))[0]!.name)).digest('hex').slice(0,40)
    locked=Number((await select(db,'SELECT GET_LOCK(?,5) AS acquired',[lock]))[0]!.acquired)===1
    if(!locked)throw new HttpError(409,'Bootstrap already running')
    const ledger=await select(db,'SELECT version,name,checksum,status FROM schema_migrations ORDER BY version')
    validateHistory(files,ledger as Parameters<typeof validateHistory>[1])
    if(ledger.length!==files.length)throw new HttpError(409,'Apply all reviewed migrations before bootstrap')
    const manifest=JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8')) as SchemaManifest
    validateManifest(manifest,files)
    await verifySchema(db,manifest,files,files.length)
    await db.query("SET SESSION time_zone='+00:00'")
    await db.beginTransaction()
    const root=(await select(db,'SELECT id,name,status FROM tenants WHERE platform_slot=1 FOR UPDATE'))[0]
    if(root) {
      const existing=(await select(db,"SELECT u.id,u.display_name FROM users u JOIN tenant_memberships m ON m.user_id=u.id JOIN roles r ON r.id=m.role_id WHERE m.tenant_id=? AND r.code='super_admin' AND m.status='active' AND u.status='active' AND u.email_key=?",[root.id,Buffer.from(input.email)]))[0]
      if(!existing||root.name!==input.platformName||root.status!=='active'||existing.display_name!==input.displayName)throw new HttpError(409,'Bootstrap target is already initialized; no records were overwritten')
      await db.commit()
      return {initialized:true,created:false}
    }
    if((await select(db,'SELECT id FROM tenants LIMIT 1')).length||(await select(db,'SELECT id FROM users LIMIT 1')).length)throw new HttpError(409,'Bootstrap requires an uninitialized identity and tenant store')
    const role=(await select(db,"SELECT id FROM roles WHERE code='super_admin' AND tenant_kind='platform'"))[0]
    if(!role)throw new HttpError(409,'Bootstrap role unavailable')
    const platformId=randomBytes(16),userId=randomBytes(16)
    await db.execute("INSERT INTO tenants(public_id,kind,name) VALUES (?,'platform',?)",[platformId,input.platformName])
    const tenant=(await select(db,'SELECT id FROM tenants WHERE public_id=?',[platformId]))[0]!
    // The separately authenticated operator attests the initial owner's identity.
    // MFA is still mandatory at first login; no session or enrollment bypass issued.
    await db.execute("INSERT INTO users(public_id,email,email_key,display_name,password_hash,status,email_verified_at) VALUES (?,?,?,?,?,'active',UTC_TIMESTAMP(6))",[userId,input.email,Buffer.from(input.email),input.displayName,passwordHash])
    const user=(await select(db,'SELECT id FROM users WHERE public_id=?',[userId]))[0]!
    await db.execute("INSERT INTO tenant_memberships(tenant_id,tenant_kind,user_id,role_id,status) VALUES (?,'platform',?,?,'active')",[tenant.id,user.id,role.id])
    const membership=(await select(db,'SELECT id FROM tenant_memberships WHERE tenant_id=? AND user_id=?',[tenant.id,user.id]))[0]!
    await db.execute("INSERT INTO audit_logs(event_id,tenant_id,actor_user_id,actor_tenant_id,actor_membership_id,action,resource_type,resource_id,request_id,outcome,safe_metadata) VALUES (?,?,?,?,?,'platform.bootstrapped','tenant',?,?,'success','{}')",[randomBytes(16),tenant.id,user.id,tenant.id,membership.id,tenant.id,randomBytes(16)])
    await db.commit()
    return {initialized:true,created:true}
  } catch(error) {await db.rollback().catch(()=>{});throw error}
  finally {if(locked)await db.execute('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{});db.release()}
}
