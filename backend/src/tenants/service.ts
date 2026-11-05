import { randomBytes } from 'node:crypto'
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { HttpError } from '../middleware/error-handler.js'
import { select,transaction } from '../auth/database.js'
import { AuthService,normalizeEmail } from '../auth/service.js'
import type { Membership,Principal,Kind } from '../auth/authorization.js'
import { opaqueToken,tokenDigest } from '../auth/tokens.js'
import type { InvitationDelivery } from './delivery.js'

export type Account = RowDataPacket & {id:string;kind:Kind;parent_id:string|null;status:string;lock_version:number;effective:number}
export type InviteInput={email:string;displayName:string;roleCode?:string|undefined;resend?:boolean|undefined}
export type CreateInput={parentId:string;kind:Exclude<Kind,'platform'>;name:string;industryChannelCode?:string|undefined;invitation:InviteInput}
export type Page={afterId?:string|undefined;limit:number}
export type TenantActor={member:Membership;principal:Principal}
type Actor=TenantActor
function denied():never{throw new HttpError(403,'Access denied')}
const adminRole:Record<Kind,string>={platform:'super_admin',reseller:'reseller_admin',sub_reseller:'sub_reseller_admin',merchant:'merchant_admin'}
export const tenantScopeSQL=`WITH RECURSIVE scope AS (
 SELECT id,0 AS depth,(status='active') AS effective FROM tenants WHERE id=?
 UNION ALL SELECT t.id,s.depth+1,(s.effective AND t.status='active') FROM tenants t JOIN scope s ON t.parent_id=s.id WHERE s.depth<3
)`
const scope=tenantScopeSQL
const fields='t.id,t.public_id,t.kind,t.parent_id,t.name,t.status,t.industry_channel_id,t.lock_version,t.created_at,t.updated_at,s.effective'

export class TenantService {
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly delivery?:InvitationDelivery){}
 // Backend-only transaction primitives shared by merchant business services.
 withActor<T>(principal:Principal,work:(db:PoolConnection,actor:TenantActor)=>Promise<T>,readOnly=false){return this.actor(principal,work,readOnly)}
 authorizedAccount(db:PoolConnection,actor:TenantActor,id:string,permission='tenant.read'){return this.account(db,actor,id,permission)}
 requirePermission(actor:TenantActor,permission:string){this.permission(actor,permission)}
 auditChange(db:PoolConnection,actor:TenantActor,target:string,action:string,metadata:Record<string,string|boolean>,resourceType='tenant',resourceId=target,requestId?:Buffer){return this.audit(db,actor,target,action,metadata,resourceType,resourceId,requestId)}
 private async actor<T>(principal:Principal,work:(db:PoolConnection,actor:Actor)=>Promise<T>,readOnly=false):Promise<T>{
  // One root lock serializes hierarchy/membership writes for this MVP. Bounded
  // deadlock retries contain ONLY DB work; SMTP is always outside the transaction.
  for(let attempt=0;;attempt++)try{
   return await transaction(this.pool,async db=>{
    const user=(await select(db,`SELECT status,auth_version,email_verified_at FROM users WHERE id=? ${readOnly?'LOCK IN SHARE MODE':'FOR UPDATE'}`,[principal.identity.sub]))[0]
    if(!user||user.status!=='active'||!user.email_verified_at||user.auth_version!==principal.identity.av)throw new HttpError(401,'Authentication required')
    const root=(await select(db,`SELECT id,status FROM tenants WHERE kind='platform' ${readOnly?'LOCK IN SHARE MODE':'FOR UPDATE'}`))[0]
    if(!root||root.status!=='active')denied()
    const session=(await select(db,'SELECT id FROM auth_sessions WHERE id=? AND user_id=? AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP(6) AND auth_version=?',[principal.identity.sid,principal.identity.sub,principal.identity.av]))[0]
    if(!session)throw new HttpError(401,'Authentication required')
    if(!principal.identity.mid)denied()
    const member=await this.auth.authorization.membership(principal.identity.sub,principal.identity.mid,db)
    return work(db,{member,principal})
   })
  }catch(error){
   if(typeof error==='object'&&error!==null&&'code'in error&&error.code==='ER_LOCK_DEADLOCK'&&attempt<2)continue
   if(typeof error==='object'&&error!==null&&'code'in error&&error.code==='ER_LOCK_DEADLOCK')throw new HttpError(409,'Concurrent account operation; retry')
   throw error
  }
 }
 private permission(actor:Actor,permission:string){
  if(actor.member.kind==='platform')this.auth.authorization.platform(actor.member)
  this.auth.authorization.requirePermission(actor.member,permission)
 }
 private dto(row:Account){return{id:row.id,publicId:(row.public_id as Buffer).toString('hex'),kind:row.kind,parentId:row.parent_id,name:row.name,status:row.status,industryChannelId:row.industry_channel_id,lockVersion:row.lock_version,createdAt:row.created_at,updatedAt:row.updated_at,effectiveStatus:Number(row.effective)?'active':'blocked'}}
 private async account(db:PoolConnection,actor:Actor,id:string,permission='tenant.read'):Promise<Account>{
  this.permission(actor,permission)
  const row=(await select<Account>(db,`${scope} SELECT ${fields} FROM tenants t JOIN scope s ON s.id=t.id WHERE t.id=?`,[actor.member.tenantId,id]))[0]
  if(!row)throw new HttpError(404,'Account not found')
  return row
 }
 private async audit(db:PoolConnection,actor:Actor,target:string,action:string,metadata:Record<string,string|boolean>,resourceType='tenant',resourceId=target,requestId?:Buffer){
  await db.execute(`INSERT INTO audit_logs(event_id,tenant_id,actor_user_id,actor_tenant_id,actor_membership_id,action,resource_type,resource_id,request_id,outcome,safe_metadata)
   VALUES (?,?,?,?,?,?,?,?,?,'success',?)`,[randomBytes(16),target,actor.principal.identity.sub,actor.member.tenantId,actor.member.membershipId,action,resourceType,resourceId,requestId??randomBytes(16),JSON.stringify(metadata)])
 }
 private async verifyDelivery(){
  if(!this.delivery)throw new HttpError(503,'Invitation delivery unavailable')
  try{await this.delivery.verify()}catch{throw new HttpError(503,'Invitation delivery unavailable')}
 }
 private async role(db:PoolConnection,actor:Actor,tenant:Account,code:string){
  this.permission(actor,'membership.manage')
  if(tenant.kind==='platform')denied() // no ordinary Super Admin invitation/bootstrap
  const row=(await select(db,'SELECT id,code FROM roles WHERE code=? AND tenant_kind=?',[code,tenant.kind]))[0]
  if(!row)denied()
  await this.auth.authorization.assignRole(actor.member,tenant.id,row.id,db)
  return row
 }
 private async invitation(db:PoolConnection,actor:Actor,tenant:Account,input:InviteInput){
  const role=await this.role(db,actor,tenant,input.roleCode??adminRole[tenant.kind])
  const email=normalizeEmail(input.email)
  let user=(await select(db,'SELECT id,email,status FROM users WHERE email_key=? FOR UPDATE',[Buffer.from(email)]))[0]
  if(!user){
   await db.execute('INSERT INTO users(public_id,email,email_key,display_name) VALUES (?,?,?,?)',[randomBytes(16),email,Buffer.from(email),input.displayName])
   user=(await select(db,'SELECT id,email,status FROM users WHERE email_key=?',[Buffer.from(email)]))[0]!
  }
  if(!['invited','active'].includes(user.status))throw new HttpError(409,'Invitation cannot be created')
  let membership=(await select(db,'SELECT id,role_id,status FROM tenant_memberships WHERE tenant_id=? AND user_id=? FOR UPDATE',[tenant.id,user.id]))[0]
  if(membership){
   // Never replace/demote/revoke an active member, including the last active admin.
   // Role changes need a separate future last-admin-safe membership API.
   if(membership.status==='active'||membership.role_id!==role.id)throw new HttpError(409,'Membership already exists')
   const pending=(await select(db,"SELECT id FROM auth_tokens WHERE tenant_id=? AND user_id=? AND purpose='invite' AND consumed_at IS NULL AND expires_at>UTC_TIMESTAMP(6)",[tenant.id,user.id]))[0]
   if(pending&&!input.resend)throw new HttpError(409,'Invitation already pending')
   await db.execute("UPDATE tenant_memberships SET status='invited' WHERE id=? AND tenant_id=? AND user_id=?",[membership.id,tenant.id,user.id])
  }else{
   await db.execute("INSERT INTO tenant_memberships(tenant_id,tenant_kind,user_id,role_id,status) VALUES (?,?,?,?,'invited')",[tenant.id,tenant.kind,user.id,role.id])
   membership=(await select(db,'SELECT id FROM tenant_memberships WHERE tenant_id=? AND user_id=?',[tenant.id,user.id]))[0]!
  }
  await db.execute("UPDATE auth_tokens SET consumed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND user_id=? AND purpose='invite' AND consumed_at IS NULL",[tenant.id,user.id])
  const token=opaqueToken()
  await db.execute("INSERT INTO auth_tokens(user_id,purpose,tenant_id,token_hash,expires_at) VALUES (?,'invite',?,?,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 24 HOUR))",[user.id,tenant.id,tokenDigest(token)])
  const saved=(await select(db,'SELECT id,expires_at FROM auth_tokens WHERE token_hash=?',[tokenDigest(token)]))[0]!
  await this.audit(db,actor,tenant.id,'tenant.invitation_created',{roleCode:role.code,resend:input.resend===true},'membership',membership.id)
  return{membershipId:membership.id as string,roleCode:role.code as string,expiresAt:saved.expires_at,token,email:user.email as string}
 }
 private async send(principal:Principal,tenantId:string,invite:Awaited<ReturnType<TenantService['invitation']>>){
  let deliveryStatus:'test_delivered'|'accepted_by_smtp'|'failed'='failed'
  try{
   await this.delivery!.send({email:invite.email,token:invite.token,purpose:'invite'})
   deliveryStatus=this.delivery!.kind==='test'?'test_delivered':'accepted_by_smtp'
  }catch{console.error('Invitation delivery failed; provider details withheld.')}
  // Delivery cannot share the DB transaction. Its result is best-effort audited;
  // never roll back/retry provisioning after a provider accepted a message.
  try{await this.actor(principal,(db,actor)=>this.audit(db,actor,tenantId,'tenant.invitation_delivery',{deliveryStatus},'membership',invite.membershipId))}
  catch{console.error('Invitation delivery audit failed; details withheld.')}
  return{membershipId:invite.membershipId,roleCode:invite.roleCode,expiresAt:invite.expiresAt,deliveryStatus}
 }
 async create(principal:Principal,input:CreateInput){
  await this.actor(principal,async(db,actor)=>{
   this.permission(actor,input.kind==='reseller'?'reseller.create':input.kind==='sub_reseller'?'sub_reseller.create':'merchant.create')
   await this.account(db,actor,input.parentId)
   await this.auth.authorization.provision(actor.member,input.parentId,input.kind,db)
  })
  await this.verifyDelivery()
  const result=await this.actor(principal,async(db,actor)=>{
   this.permission(actor,input.kind==='reseller'?'reseller.create':input.kind==='sub_reseller'?'sub_reseller.create':'merchant.create')
   const parent=await this.account(db,actor,input.parentId)
   await this.auth.authorization.provision(actor.member,parent.id,input.kind,db)
   let channelId:string|null=null
   if(input.kind==='merchant'){
    const channel=(await select(db,"SELECT id FROM industry_channels WHERE code=? AND status='active'",[input.industryChannelCode??'']))[0]
    if(!channel)throw new HttpError(400,'Invalid industry channel')
    channelId=channel.id
   }else if(input.industryChannelCode)throw new HttpError(400,'Invalid industry channel')
   const publicId=randomBytes(16)
   await db.execute('INSERT INTO tenants(public_id,kind,parent_id,parent_kind,name,industry_channel_id) VALUES (?,?,?,?,?,?)',[publicId,input.kind,parent.id,parent.kind,input.name,channelId])
   const tenant=(await select<Account>(db,'SELECT *,1 AS effective FROM tenants WHERE public_id=? AND parent_id=?',[publicId,parent.id]))[0]!
   await this.audit(db,actor,tenant.id,'tenant.created',{parentId:parent.id,kind:input.kind})
   // Initial role is derived from the child kind, not request-supplied permissions.
   const invite=await this.invitation(db,actor,tenant,{email:input.invitation.email,displayName:input.invitation.displayName})
   return{tenant:this.dto(tenant),invite}
  })
  return{tenant:result.tenant,invitation:await this.send(principal,result.tenant.id,result.invite)}
 }
 async list(principal:Principal,page:Page,target?:string){
  return this.actor(principal,async(db,actor)=>{
   this.permission(actor,'tenant.read')
   const anchor=target?(await this.account(db,actor,target)).id:actor.member.tenantId
   // Ancestor state is included even when an authorized manager lists a suspended subtree.
   const parentState=target?(await this.account(db,actor,target)).effective:1
   const result=await select<Account>(db,`${scope} SELECT ${fields} FROM tenants t JOIN scope s ON s.id=t.id WHERE t.id>? ${target?'AND t.id<>?':''} ORDER BY t.id LIMIT ?`,[anchor,page.afterId??'0',...(target?[anchor]:[]),page.limit])
   for(const row of result)if(!Number(parentState))row.effective=0
   return{accounts:result.map(row=>this.dto(row)),nextCursor:result.length===page.limit?result.at(-1)!.id:null}
  },true)
 }
 async get(principal:Principal,id:string){return this.actor(principal,async(db,actor)=>this.dto(await this.account(db,actor,id)),true)}
 async update(principal:Principal,id:string,input:{name:string;lockVersion:number}){
  return this.actor(principal,async(db,actor)=>{
   const row=await this.account(db,actor,id,'tenant.manage')
   await this.auth.authorization.ancestors(id,db)
   if(row.lock_version!==input.lockVersion)throw new HttpError(409,'Account version conflict')
   const [changed]=await db.execute<ResultSetHeader>('UPDATE tenants SET name=?,lock_version=lock_version+1 WHERE id=? AND parent_id<=>? AND lock_version=?',[input.name,id,row.parent_id,input.lockVersion])
   if(changed.affectedRows!==1)throw new HttpError(409,'Account version conflict')
   await this.audit(db,actor,id,'tenant.updated',{nameChanged:true})
   return this.dto(await this.account(db,actor,id))
  })
 }
 async status(principal:Principal,id:string,desired:'active'|'suspended',lockVersion:number){
  return this.actor(principal,async(db,actor)=>{
   const row=await this.account(db,actor,id,'tenant.manage')
   if(row.kind==='platform'||row.id===actor.member.tenantId)denied()
   // Only the target may be suspended; a still-suspended ancestor must be restored first.
   if(row.parent_id)await this.auth.authorization.ancestors(row.parent_id,db)
   if(row.lock_version!==lockVersion)throw new HttpError(409,'Account version conflict')
   if(row.status==='closed'||row.status===desired)throw new HttpError(409,'Invalid account status transition')
   const [changed]=await db.execute<ResultSetHeader>('UPDATE tenants SET status=?,lock_version=lock_version+1 WHERE id=? AND parent_id<=>? AND lock_version=?',[desired,id,row.parent_id,lockVersion])
   if(changed.affectedRows!==1)throw new HttpError(409,'Account version conflict')
   await this.audit(db,actor,id,desired==='active'?'tenant.reinstated':'tenant.suspended',{fromStatus:row.status,toStatus:desired})
   return this.dto(await this.account(db,actor,id))
  })
 }
 async invite(principal:Principal,id:string,input:InviteInput){
  await this.actor(principal,async(db,actor)=>{const tenant=await this.account(db,actor,id,'membership.manage');await this.role(db,actor,tenant,input.roleCode??adminRole[tenant.kind])})
  await this.verifyDelivery()
  const invite=await this.actor(principal,async(db,actor)=>{
   const tenant=await this.account(db,actor,id,'membership.manage')
   return this.invitation(db,actor,tenant,input)
  })
  return this.send(principal,id,invite)
 }
 async history(principal:Principal,id:string,page:Page){
  return this.actor(principal,async(db,actor)=>{
   await this.account(db,actor,id,'audit.read')
   const events=await select(db,"SELECT id,action,actor_tenant_id,actor_membership_id,occurred_at,safe_metadata FROM audit_logs WHERE tenant_id=? AND resource_type='tenant' AND resource_id=? AND id>? ORDER BY id LIMIT ?",[id,id,page.afterId??'0',page.limit])
   return{events:events.map(e=>({id:e.id,action:e.action,actorTenantId:e.actor_tenant_id,actorMembershipId:e.actor_membership_id,occurredAt:e.occurred_at,details:typeof e.safe_metadata==='string'?JSON.parse(e.safe_metadata):e.safe_metadata})),nextCursor:events.length===page.limit?events.at(-1)!.id:null}
  },true)
 }
}
