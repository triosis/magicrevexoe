import type {PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise'
import {randomBytes} from 'node:crypto'
import {HttpError} from '../middleware/error-handler.js'
import {select} from '../auth/database.js'
import type {AuthService} from '../auth/service.js'
import type {Principal} from '../auth/authorization.js'
import {TenantService,tenantScopeSQL,type TenantActor,type Page,type CreateInput} from '../tenants/service.js'
import {canonicalTimezone,validTimezone,destinationInput} from './validation.js'

type Branch=RowDataPacket&{id:string;tenant_id:string;status:string;lock_version:number;industry_channel_id:string}
type BranchInput={code:string;name:string;timezone:string;address?:string|null|undefined}
type BranchPatch={code?:string|undefined;name?:string|undefined;timezone?:string|undefined;address?:string|null|undefined;lockVersion:number}
type Destination={placeId:string;reviewUrl?:string|undefined}
function conflict(message:string):never{throw new HttpError(409,message)}
function duplicate(error:unknown):never{
 if(typeof error==='object'&&error!==null&&'code'in error&&error.code==='ER_DUP_ENTRY')throw new HttpError(409,'Resource already exists')
 throw error
}
const json=(value:unknown)=>typeof value==='string'?JSON.parse(value):value
const publicCopy=(title:string)=>JSON.stringify({title,google_label:'Leave a Google review',private_label:'Share private feedback'})
const feedbackLabels=JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'})

export class BusinessService{
 constructor(private readonly tenants:TenantService,private readonly auth:AuthService){}
 onboard(principal:Principal,input:Omit<CreateInput,'kind'>){return this.tenants.create(principal,{...input,kind:'merchant'})}
 private async merchant(db:PoolConnection,actor:TenantActor,id:string,permission='tenant.read'){
  const merchant=await this.tenants.authorizedAccount(db,actor,id,permission)
  if(merchant.kind!=='merchant')throw new HttpError(404,'Merchant not found')
  await this.auth.authorization.ancestors(id,db)
  return merchant
 }
 private branchDto(b:Branch){return{id:b.id,publicId:(b.public_id as Buffer).toString('hex'),merchantId:b.tenant_id,industryChannelId:b.industry_channel_id,code:b.code,name:b.name,timezone:b.timezone,address:b.address,status:b.status,lockVersion:b.lock_version,createdAt:b.created_at,updatedAt:b.updated_at}}
 private destinationDto(d:RowDataPacket){return{id:d.id,merchantId:d.tenant_id,branchId:d.branch_id,provider:d.provider,placeId:d.place_id,reviewUrl:d.review_url,status:d.status,lockVersion:d.lock_version,createdAt:d.created_at,updatedAt:d.updated_at}}
 private channelDto(c:RowDataPacket){return{id:c.id,code:c.code,name:c.name,status:c.status,createdAt:c.created_at,updatedAt:c.updated_at}}
 private versionDto(v:RowDataPacket){return{id:v.id,industryChannelId:v.industry_channel_id,version:v.version,status:v.status,displayName:v.display_name,publicCopy:json(v.public_copy),feedbackLabels:json(v.feedback_labels),publishedAt:v.published_at}}
 private async branch(db:PoolConnection,actor:TenantActor,id:string,permission='tenant.read'){
  this.tenants.requirePermission(actor,permission)
  const row=(await select<Branch>(db,`${tenantScopeSQL} SELECT b.* FROM branches b JOIN scope s ON s.id=b.tenant_id WHERE b.id=?`,[actor.member.tenantId,id]))[0]
  if(!row)throw new HttpError(404,'Branch not found')
  await this.merchant(db,actor,row.tenant_id,permission)
  return row
 }
 private async destination(db:PoolConnection,b:Branch){
  const row=(await select(db,"SELECT * FROM review_destinations WHERE tenant_id=? AND branch_id=? AND provider='google'",[b.tenant_id,b.id]))[0]
  if(!row)throw new HttpError(404,'Review destination not found')
  return row
 }
 private async channel(db:PoolConnection,id:string){const c=(await select(db,'SELECT * FROM industry_channels WHERE id=?',[id]))[0];if(!c)throw new HttpError(404,'Industry channel not found');return c}
 private active(b:Branch){if(b.status!=='active')conflict('Branch is archived')}
 private async liveLinks(db:PoolConnection,b:Branch,destinationId?:string){
  const found=await select(db,`SELECT l.id FROM short_links l JOIN funnel_configurations f ON f.tenant_id=l.tenant_id AND f.branch_id=l.branch_id AND f.id=l.funnel_configuration_id
   WHERE l.tenant_id=? AND l.branch_id=? AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>UTC_TIMESTAMP(6)) ${destinationId?'AND f.review_destination_id=?':''} LIMIT 1`,[b.tenant_id,b.id,...(destinationId?[destinationId]:[])])
  if(found.length)conflict('Active short links must be disabled before this operation')
 }
 async profile(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>{
  const m=await this.merchant(db,actor,id),c=await this.channel(db,m.industry_channel_id)
  const admin=(await select(db,"SELECT m.id FROM tenant_memberships m JOIN roles r ON r.id=m.role_id JOIN users u ON u.id=m.user_id WHERE m.tenant_id=? AND m.status='active' AND r.code='merchant_admin' AND u.status='active' AND u.email_verified_at IS NOT NULL AND u.password_hash IS NOT NULL LIMIT 1",[id])).length>0
  const published=(await select(db,"SELECT id FROM channel_versions WHERE industry_channel_id=? AND status='published' LIMIT 1",[c.id])).length>0
  const zones=await select(db,"SELECT b.timezone,COUNT(*) AS n FROM branches b JOIN review_destinations d ON d.tenant_id=b.tenant_id AND d.branch_id=b.id AND d.provider='google' AND d.status='active' WHERE b.tenant_id=? AND b.status='active' GROUP BY b.timezone",[id])
  const ready=zones.reduce((n,z)=>validTimezone(z.timezone)?n+BigInt(z.n):n,0n)
  const checks={accountActive:m.status==='active',channelAssigned:true,channelActive:c.status==='active',administratorActive:admin,publishedChannelAvailable:published,readyBranch:ready>0n}
  return{id:m.id,publicId:(m.public_id as Buffer).toString('hex'),parentId:m.parent_id,name:m.name,status:m.status,lockVersion:m.lock_version,industryChannel:this.channelDto(c),createdAt:m.created_at,updatedAt:m.updated_at,onboarding:{scope:'merchant_business_setup',complete:Object.values(checks).every(Boolean),checks,readyBranchCount:ready.toString()}}
 },true)}
 async updateProfile(principal:Principal,id:string,input:{name:string;lockVersion:number}){return this.tenants.withActor(principal,async(db,actor)=>{
  const m=await this.merchant(db,actor,id,'tenant.manage')
  if(m.lock_version!==input.lockVersion)conflict('Merchant version conflict')
  const [result]=await db.execute<ResultSetHeader>('UPDATE tenants SET name=?,lock_version=lock_version+1 WHERE id=? AND kind=\'merchant\' AND parent_id<=>? AND lock_version=?',[input.name,id,m.parent_id,input.lockVersion])
  if(result.affectedRows!==1)conflict('Merchant version conflict')
  await this.tenants.auditChange(db,actor,id,'merchant.updated',{nameChanged:true},'tenant',id)
  return{id,name:input.name,lockVersion:input.lockVersion+1}
 })}
 async channels(principal:Principal){return this.tenants.withActor(principal,async(db,actor)=>{this.tenants.requirePermission(actor,'tenant.read');return{channels:(await select(db,"SELECT * FROM industry_channels WHERE status='active' ORDER BY id")).map(c=>this.channelDto(c))}},true)}
 async channelDetails(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>{this.tenants.requirePermission(actor,'tenant.read');return this.channelDto(await this.channel(db,id))},true)}
 async publishedVersions(principal:Principal,id:string,versionId?:string){return this.tenants.withActor(principal,async(db,actor)=>{
  this.tenants.requirePermission(actor,'tenant.read');await this.channel(db,id)
  const versions=await select(db,`SELECT * FROM channel_versions WHERE industry_channel_id=? AND status='published' ${versionId?'AND id=?':''} ORDER BY version DESC`,[id,...(versionId?[versionId]:[])])
  if(versionId&&!versions.length)throw new HttpError(404,'Published channel version not found')
  return{versions:versions.map(v=>this.versionDto(v))}
 },true)}
 async updateChannel(principal:Principal,id:string,input:{name?:string|undefined;status?:'active'|'retired'|undefined}){return this.tenants.withActor(principal,async(db,actor)=>{
  this.auth.authorization.platform(actor.member)
  const old=await this.channel(db,id)
  await db.execute('UPDATE industry_channels SET name=?,status=? WHERE id=?',[input.name??old.name,input.status??old.status,id])
  await this.tenants.auditChange(db,actor,actor.member.tenantId,'industry_channel.updated',{nameChanged:input.name!==undefined,statusChanged:input.status!==undefined},'industry_channel',id)
  return this.channelDto(await this.channel(db,id))
 })}
 async createVersion(principal:Principal,id:string,input:{version:number;displayName:string;title:string}){return this.tenants.withActor(principal,async(db,actor)=>{
  this.auth.authorization.platform(actor.member)
  if((await this.channel(db,id)).status!=='active')conflict('Industry channel is retired')
  try{await db.execute("INSERT INTO channel_versions(industry_channel_id,version,display_name,public_copy,feedback_labels) VALUES (?,?,?,?,?)",[id,input.version,input.displayName,publicCopy(input.title),feedbackLabels])}catch(error){duplicate(error)}
  const v=(await select(db,'SELECT * FROM channel_versions WHERE industry_channel_id=? AND version=?',[id,input.version]))[0]!
  await this.tenants.auditChange(db,actor,actor.member.tenantId,'channel_version.created',{},'channel_version',v.id)
  return this.versionDto(v)
 })}
 async editVersion(principal:Principal,id:string,versionId:string,input:{displayName?:string|undefined;title?:string|undefined},publish=false){return this.tenants.withActor(principal,async(db,actor)=>{
  this.auth.authorization.platform(actor.member)
  const c=await this.channel(db,id)
  const old=(await select(db,'SELECT * FROM channel_versions WHERE industry_channel_id=? AND id=?',[id,versionId]))[0]
  if(!old)throw new HttpError(404,'Channel version not found')
  if(old.status!=='draft')conflict('Published channel versions are immutable')
  if(c.status!=='active')conflict('Industry channel is retired')
  if(publish)await db.execute("UPDATE channel_versions SET status='published',published_at=UTC_TIMESTAMP(6) WHERE id=? AND industry_channel_id=? AND status='draft'",[versionId,id])
  else await db.execute("UPDATE channel_versions SET display_name=?,public_copy=? WHERE id=? AND industry_channel_id=? AND status='draft'",[input.displayName??old.display_name,input.title!==undefined?publicCopy(input.title):old.public_copy,versionId,id])
  await this.tenants.auditChange(db,actor,actor.member.tenantId,publish?'channel_version.published':'channel_version.updated',{},'channel_version',versionId)
  return this.versionDto((await select(db,'SELECT * FROM channel_versions WHERE industry_channel_id=? AND id=?',[id,versionId]))[0]!)
 })}
 async createBranch(principal:Principal,id:string,input:BranchInput){return this.tenants.withActor(principal,async(db,actor)=>{
  const m=await this.merchant(db,actor,id,'branch.manage')
  if((await this.channel(db,m.industry_channel_id)).status!=='active')conflict('Industry channel is retired')
  const timezone=canonicalTimezone(input.timezone)
  const publicId=randomBytes(16)
  try{await db.execute('INSERT INTO branches(public_id,tenant_id,industry_channel_id,code,name,timezone,address) VALUES (?,?,?,?,?,?,?)',[publicId,id,m.industry_channel_id,input.code,input.name,timezone,input.address??null])}catch(error){duplicate(error)}
  const b=(await select<Branch>(db,'SELECT * FROM branches WHERE tenant_id=? AND public_id=?',[id,publicId]))[0]!
  await this.tenants.auditChange(db,actor,id,'branch.created',{},'branch',b.id)
  return this.branchDto(b)
 })}
 async branches(principal:Principal,id:string,page:Page){return this.tenants.withActor(principal,async(db,actor)=>{
  await this.merchant(db,actor,id)
  const rows=await select<Branch>(db,'SELECT * FROM branches WHERE tenant_id=? AND id>? ORDER BY id LIMIT ?',[id,page.afterId??'0',page.limit])
  return{branches:rows.map(b=>this.branchDto(b)),nextCursor:rows.length===page.limit?rows.at(-1)!.id:null}
 },true)}
 async branchDetails(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>this.branchDto(await this.branch(db,actor,id)),true)}
 async updateBranch(principal:Principal,id:string,input:BranchPatch){return this.tenants.withActor(principal,async(db,actor)=>{
  const b=await this.branch(db,actor,id,'branch.manage');this.active(b)
  if(b.lock_version!==input.lockVersion)conflict('Branch version conflict')
  const timezone=input.timezone!==undefined?canonicalTimezone(input.timezone):b.timezone
  try{
   const [result]=await db.execute<ResultSetHeader>('UPDATE branches SET code=?,name=?,timezone=?,address=?,lock_version=lock_version+1 WHERE tenant_id=? AND id=? AND lock_version=?',[input.code??b.code,input.name??b.name,timezone,input.address!==undefined?input.address:b.address,b.tenant_id,id,input.lockVersion])
   if(result.affectedRows!==1)conflict('Branch version conflict')
  }catch(error){duplicate(error)}
  await this.tenants.auditChange(db,actor,b.tenant_id,'branch.updated',{},'branch',id)
  return this.branchDto(await this.branch(db,actor,id))
 })}
 async archiveBranch(principal:Principal,id:string,lockVersion:number){return this.tenants.withActor(principal,async(db,actor)=>{
  const b=await this.branch(db,actor,id,'branch.manage');this.active(b)
  if(b.lock_version!==lockVersion)conflict('Branch version conflict')
  await this.liveLinks(db,b)
  const [result]=await db.execute<ResultSetHeader>("UPDATE branches SET status='archived',lock_version=lock_version+1 WHERE tenant_id=? AND id=? AND lock_version=?",[b.tenant_id,id,lockVersion])
  if(result.affectedRows!==1)conflict('Branch version conflict')
  await this.tenants.auditChange(db,actor,b.tenant_id,'branch.archived',{},'branch',id)
  return this.branchDto(await this.branch(db,actor,id))
 })}
 async addDestination(principal:Principal,id:string,input:Destination){return this.tenants.withActor(principal,async(db,actor)=>{
  const b=await this.branch(db,actor,id,'destination.manage');this.active(b)
  const url=destinationInput(input.placeId,input.reviewUrl)
  try{await db.execute("INSERT INTO review_destinations(tenant_id,branch_id,provider,place_id,review_url) VALUES (?,?,'google',?,?)",[b.tenant_id,id,input.placeId,url])}catch(error){duplicate(error)}
  const d=await this.destination(db,b)
  await this.tenants.auditChange(db,actor,b.tenant_id,'destination.created',{},'review_destination',d.id)
  return this.destinationDto(d)
 })}
 async getDestination(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>this.destinationDto(await this.destination(db,await this.branch(db,actor,id))),true)}
 async updateDestination(principal:Principal,id:string,input:Destination&{lockVersion:number}){return this.tenants.withActor(principal,async(db,actor)=>{
  const b=await this.branch(db,actor,id,'destination.manage');this.active(b)
  const d=await this.destination(db,b)
  if(d.lock_version!==input.lockVersion)conflict('Destination version conflict')
  const url=destinationInput(input.placeId,input.reviewUrl)
  const [result]=await db.execute<ResultSetHeader>('UPDATE review_destinations SET place_id=?,review_url=?,lock_version=lock_version+1 WHERE tenant_id=? AND branch_id=? AND id=? AND lock_version=?',[input.placeId,url,b.tenant_id,id,d.id,input.lockVersion])
  if(result.affectedRows!==1)conflict('Destination version conflict')
  await this.tenants.auditChange(db,actor,b.tenant_id,'destination.updated',{},'review_destination',d.id)
  return this.destinationDto(await this.destination(db,b))
 })}
 async destinationStatus(principal:Principal,id:string,status:'active'|'disabled',lockVersion:number){return this.tenants.withActor(principal,async(db,actor)=>{
  const b=await this.branch(db,actor,id,'destination.manage');this.active(b)
  const d=await this.destination(db,b)
  if(d.lock_version!==lockVersion)conflict('Destination version conflict')
  if(d.status===status)conflict('Invalid destination status transition')
  if(status==='disabled')await this.liveLinks(db,b,d.id)
  const [result]=await db.execute<ResultSetHeader>('UPDATE review_destinations SET status=?,lock_version=lock_version+1 WHERE tenant_id=? AND branch_id=? AND id=? AND lock_version=?',[status,b.tenant_id,id,d.id,lockVersion])
  if(result.affectedRows!==1)conflict('Destination version conflict')
  await this.tenants.auditChange(db,actor,b.tenant_id,status==='active'?'destination.enabled':'destination.disabled',{},'review_destination',d.id)
  return this.destinationDto(await this.destination(db,b))
 })}
}

