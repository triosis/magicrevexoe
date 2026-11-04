import type { Pool, RowDataPacket } from 'mysql2/promise'
import type { RequestHandler } from 'express'
import { HttpError } from '../middleware/error-handler.js'
import { select, type Database } from './database.js'
import { identifier, type Identity } from './tokens.js'

export type Kind = 'platform' | 'reseller' | 'sub_reseller' | 'merchant'
type Tenant = RowDataPacket & { id: string; kind: Kind; parent_id: string | null; status: string; depth: number }
export type Membership = { membershipId: string; tenantId: string; kind: Kind; roleId: string; roleCode: string; permissions: string[] }
export type Principal = { identity: Identity; membership?: Membership }
function denied(): never { throw new HttpError(403, 'Access denied') }
const validEdge = new Set(['platform/reseller','platform/merchant','reseller/sub_reseller','reseller/merchant','sub_reseller/merchant'])

export class Authorization {
  constructor(private readonly pool: Pool) {}
  async ancestors(tenantId: string, db: Database = this.pool): Promise<Tenant[]> {
    const chain = await select<Tenant>(db, `WITH RECURSIVE ancestors AS (
      SELECT id,kind,parent_id,status,0 AS depth FROM tenants WHERE id=?
      UNION ALL SELECT t.id,t.kind,t.parent_id,t.status,a.depth+1 FROM tenants t JOIN ancestors a ON a.parent_id=t.id WHERE a.depth<4
    ) SELECT * FROM ancestors ORDER BY depth`, [tenantId])
    if (!chain.length || chain.length > 4 || chain.at(-1)?.kind !== 'platform'
      || chain.at(-1)?.parent_id !== null || chain.some(row => row.status !== 'active')) denied()
    for (let i = 0; i < chain.length - 1; i++) if (!validEdge.has(`${chain[i+1]!.kind}/${chain[i]!.kind}`)) denied()
    return chain
  }
  async membership(userId: string, membershipId: string, db: Database = this.pool): Promise<Membership> {
    const row = (await select(db, `SELECT m.id,m.tenant_id,m.role_id,m.tenant_kind,r.code AS role_code
      FROM tenant_memberships m JOIN roles r ON r.id=m.role_id AND r.tenant_kind=m.tenant_kind
      JOIN users u ON u.id=m.user_id WHERE m.id=? AND m.user_id=? AND m.status='active' AND u.status='active'`, [membershipId,userId]))[0]
    if (!row) denied()
    const chain = await this.ancestors(row.tenant_id, db)
    const permissions = await select(db, `SELECT p.code FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=?`, [row.role_id])
    return { membershipId: row.id, tenantId: row.tenant_id, kind: chain[0]!.kind, roleId: row.role_id, roleCode: row.role_code, permissions: permissions.map(row => row.code as string) }
  }
  requirePermission(member: Membership, permission: string): void { if (!member.permissions.includes(permission)) denied() }
  platform(member: Membership, permission = 'platform.manage'): void {
    if (member.kind !== 'platform' || member.roleCode !== 'super_admin') denied()
    this.requirePermission(member, permission)
  }
  async tenant(member: Membership, target: string, permission: string, merchantOnly = false): Promise<void> {
    // Platform power must be invoked through the separate audited platform path.
    if (member.kind === 'platform') denied()
    this.requirePermission(member, permission)
    const chain = await this.ancestors(target)
    if (merchantOnly && chain[0]!.kind !== 'merchant') denied()
    if (!chain.some(row => row.id === member.tenantId)) denied()
    if (member.kind === 'merchant' && target !== member.tenantId) denied()
  }
  async platformTarget(member: Membership, target: string, permission = 'platform.manage'): Promise<void> {
    this.platform(member, permission)
    await this.ancestors(target)
  }
  async provision(member: Membership, parent: string, child: Kind): Promise<void> {
    const chain = await this.ancestors(parent)
    if (!validEdge.has(`${chain[0]!.kind}/${child}`)) denied()
    if (member.kind === 'platform') { this.platform(member); return }
    if (member.kind === 'merchant' || child === 'reseller' || child === 'platform') denied()
    await this.tenant(member, parent, child === 'sub_reseller' ? 'sub_reseller.create' : 'merchant.create')
    if (member.kind === 'sub_reseller' && child !== 'merchant') denied()
  }
  async assignRole(member: Membership, target: string, roleId: string): Promise<void> {
    const chain = await this.ancestors(target)
    const role = (await select(this.pool, 'SELECT code,tenant_kind FROM roles WHERE id=?',[roleId]))[0]
    if (!role || role.tenant_kind !== chain[0]!.kind) denied()
    if (member.kind === 'platform') { this.platform(member); return }
    await this.tenant(member,target,'membership.manage')
    const allowed = member.kind === 'reseller' ? ['sub_reseller_admin','merchant_admin','merchant_staff'] : ['merchant_admin','merchant_staff']
    if (!allowed.includes(role.code)) denied()
    const grants=await select(this.pool,`SELECT p.code FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=?`,[roleId])
    if (grants.some(grant=>!member.permissions.includes(grant.code))) denied()
  }
}

export function principalFrom(locals: Record<string, unknown>): Principal {
  const principal = locals.auth as Principal | undefined
  if (!principal) throw new HttpError(401,'Authentication required')
  return principal
}
export function activeMembership(): RequestHandler {
  return (_request,response,next) => { if (!principalFrom(response.locals).membership) throw new HttpError(403,'Select an active tenant membership'); next() }
}
export function requirePermission(permission: string): RequestHandler {
  return (_request,response,next) => {
    const member = principalFrom(response.locals).membership
    if (!member || member.kind==='platform' || !member.permissions.includes(permission)) denied()
    next()
  }
}
export function platformOnly(): RequestHandler {
  return (_request,response,next) => {
    const member = principalFrom(response.locals).membership
    if (member?.kind !== 'platform' || member.roleCode !== 'super_admin' || !member.permissions.includes('platform.manage')) denied()
    next()
  }
}

// Selectors identify a target only; no client-supplied owner/role/permission is
// treated as authority. Business repositories must use this validated target in SQL.
export function tenantAccess(authorization: Authorization, target: (request: Parameters<RequestHandler>[0]) => unknown,
  permission: string, merchantOnly = false): RequestHandler {
  return async (request,response,next)=>{
    const member=principalFrom(response.locals).membership
    const id=identifier.safeParse(target(request))
    if (!member || !id.success) denied()
    await authorization.tenant(member,id.data,permission,merchantOnly)
    response.locals.authorizedTenantId=id.data
    next()
  }
}
