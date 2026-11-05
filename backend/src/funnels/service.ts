import {randomBytes} from 'node:crypto'
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise'
import {select,transaction} from '../auth/database.js'
import type {AuthService} from '../auth/service.js'
import type {Principal} from '../auth/authorization.js'
import {TenantService,tenantScopeSQL,type TenantActor,type Page} from '../tenants/service.js'
import {HttpError} from '../middleware/error-handler.js'
import {destinationInput} from '../business/validation.js'
import {newShortCode,publicOrigin,shortCode} from './validation.js'
import {renderQr} from './qr.js'
import {quotas} from '../subscriptions/quota.js'

type Format='svg'|'png'
function unavailable():never{throw new HttpError(404,'Funnel unavailable')}
function conflict(message:string):never{throw new HttpError(409,message)}
const json=(v:unknown)=>typeof v==='string'?JSON.parse(v):v

export class FunnelService{
 private readonly origin:string|undefined
 private readonly webOrigin:string|undefined
 constructor(private readonly pool:Pool,private readonly tenants:TenantService,private readonly auth:AuthService,origin?:string,webOrigin?:string){this.origin=origin===undefined?undefined:publicOrigin(origin);try{this.webOrigin=webOrigin===undefined?undefined:publicOrigin(webOrigin)}catch{throw new Error('PUBLIC_WEB_ORIGIN must be an exact HTTPS origin')}}
 private url(code:string){if(!this.origin)throw new HttpError(503,'Public funnel origin not configured');return `${this.origin}/api/v1/public/funnels/${code}`}
 private async branch(db:PoolConnection,actor:TenantActor,id:string,permission:string){
  this.tenants.requirePermission(actor,permission)
  const b=(await select(db,`${tenantScopeSQL} SELECT b.*,t.name AS merchant_name FROM branches b JOIN scope s ON s.id=b.tenant_id JOIN tenants t ON t.id=b.tenant_id WHERE b.id=? AND t.kind='merchant'`,[actor.member.tenantId,id]))[0]
  if(!b)throw new HttpError(404,'Branch not found')
  await this.auth.authorization.ancestors(b.tenant_id,db)
  if(b.status!=='active')conflict('Branch is archived')
  return b
 }
 private async link(db:PoolConnection,b:RowDataPacket,id:string){const l=(await select(db,'SELECT * FROM short_links WHERE tenant_id=? AND branch_id=? AND id=?',[b.tenant_id,b.id,id]))[0];if(!l)throw new HttpError(404,'Short link not found');return l}
 private linkDto(l:RowDataPacket){return{id:l.id,branchId:l.branch_id,code:l.code,status:l.status,lockVersion:l.lock_version,publicUrl:this.url(l.code),createdAt:l.created_at}}
 private async validFunnel(db:PoolConnection,b:RowDataPacket,id:string){
  const f=(await select(db,`SELECT f.*,d.place_id,d.review_url FROM funnel_configurations f JOIN channel_versions v ON v.id=f.channel_version_id AND v.industry_channel_id=f.industry_channel_id JOIN industry_channels c ON c.id=f.industry_channel_id JOIN review_destinations d ON d.id=f.review_destination_id AND d.tenant_id=f.tenant_id AND d.branch_id=f.branch_id WHERE f.tenant_id=? AND f.branch_id=? AND f.id=? AND f.status='published' AND v.status='published' AND c.status='active' AND d.status='active'`,[b.tenant_id,b.id,id]))[0]
  if(!f)conflict('A published funnel with active parallel paths is required')
  destinationInput(f.place_id,f.review_url)
  return f
 }
 async publish(principal:Principal,branchId:string,input:{channelVersionId:string;brandTitle:string;accentHex:string;locale:string}){return this.tenants.withActor(principal,async(db,actor)=>{
  const b=await this.branch(db,actor,branchId,'funnel.manage')
  const v=(await select(db,"SELECT v.id FROM channel_versions v JOIN industry_channels c ON c.id=v.industry_channel_id WHERE v.id=? AND v.industry_channel_id=? AND v.status='published' AND c.status='active'",[input.channelVersionId,b.industry_channel_id]))[0]
  if(!v)conflict('Published channel version required')
  const d=(await select(db,"SELECT * FROM review_destinations WHERE tenant_id=? AND branch_id=? AND status='active' AND provider='google'",[b.tenant_id,branchId]))[0]
  if(!d)conflict('Active Google destination required')
  destinationInput(d.place_id,d.review_url)
  const revision=(await select(db,'SELECT COALESCE(MAX(revision),0)+1 AS revision FROM funnel_configurations WHERE tenant_id=? AND branch_id=?',[b.tenant_id,branchId]))[0]!.revision
  await db.execute("INSERT INTO funnel_configurations(tenant_id,branch_id,industry_channel_id,channel_version_id,review_destination_id,revision,status,brand_title,accent_hex,locale,published_at) VALUES (?,?,?,?,?,?,'published',?,?,?,UTC_TIMESTAMP(6))",[b.tenant_id,branchId,b.industry_channel_id,v.id,d.id,revision,input.brandTitle,input.accentHex,input.locale])
  const f=(await select(db,'SELECT id FROM funnel_configurations WHERE tenant_id=? AND branch_id=? AND revision=?',[b.tenant_id,branchId,revision]))[0]!
  await this.tenants.auditChange(db,actor,b.tenant_id,'funnel.published',{},'funnel_configuration',f.id)
  return{id:f.id,revision,status:'published'}
 })}
 async createLink(principal:Principal,branchId:string,funnelId:string,requestKey?:string){
  // Check configuration before any mutation; generated URLs never use Host headers.
  this.url('configuration-check')
  return this.tenants.withActor(principal,async(db,actor)=>{
   const b=await this.branch(db,actor,branchId,'funnel.manage');await this.validFunnel(db,b,funnelId)
   if(requestKey&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestKey))throw new HttpError(400,'Invalid request key')
   const requestId=requestKey?Buffer.from(requestKey.replaceAll('-',''),'hex'):undefined
   if(requestId){const previous=(await select(db,"SELECT l.* FROM audit_logs a JOIN short_links l ON l.tenant_id=a.tenant_id AND l.id=a.resource_id WHERE a.tenant_id=? AND a.request_id=? AND a.action='short_link.created' AND a.resource_type='short_link' LIMIT 1",[b.tenant_id,requestId]))[0];if(previous){if(previous.branch_id!==branchId||previous.funnel_configuration_id!==funnelId)conflict('Request key already used');return this.linkDto(previous)}}
   for(let attempt=0;attempt<5;attempt++){
    const code=newShortCode()
    try{await db.execute('INSERT INTO short_links(tenant_id,branch_id,funnel_configuration_id,code) VALUES (?,?,?,?)',[b.tenant_id,branchId,funnelId,code])}catch(error){if(typeof error==='object'&&error!==null&&'code'in error&&error.code==='ER_DUP_ENTRY')continue;throw error}
    const l=(await select(db,'SELECT * FROM short_links WHERE code=? AND tenant_id=?',[code,b.tenant_id]))[0]!
    await quotas.consume(db,b.tenant_id,'short_links',`link:${l.id}`)
    await this.tenants.auditChange(db,actor,b.tenant_id,'short_link.created',{},'short_link',l.id,requestId)
    return this.linkDto(l)
   }
   throw new HttpError(503,'Short link generation unavailable')
  })
 }
 async links(principal:Principal,branchId:string,page:Page){return this.tenants.withActor(principal,async(db,actor)=>{
  const b=await this.branch(db,actor,branchId,'tenant.read')
  const rows=await select(db,'SELECT * FROM short_links WHERE tenant_id=? AND branch_id=? AND id>? ORDER BY id LIMIT ?',[b.tenant_id,branchId,page.afterId??'0',page.limit])
  return{shortLinks:rows.map(l=>this.linkDto(l)),nextCursor:rows.length===page.limit?rows.at(-1)!.id:null}
 },true)}
 async disable(principal:Principal,id:string,lockVersion:number){return this.tenants.withActor(principal,async(db,actor)=>{
  this.tenants.requirePermission(actor,'funnel.manage')
  const row=(await select(db,`${tenantScopeSQL} SELECT l.branch_id FROM short_links l JOIN scope s ON s.id=l.tenant_id WHERE l.id=?`,[actor.member.tenantId,id]))[0]
  if(!row)throw new HttpError(404,'Short link not found')
  const b=await this.branch(db,actor,row.branch_id,'funnel.manage'),l=await this.link(db,b,id)
  if(l.lock_version!==lockVersion||l.status!=='active')conflict('Short link version or status conflict')
  await db.execute("UPDATE short_links SET status='disabled',lock_version=lock_version+1 WHERE id=? AND tenant_id=? AND branch_id=? AND lock_version=?",[id,b.tenant_id,b.id,lockVersion])
  await quotas.reconcile(db,b.tenant_id,'short_links',`disable:${id}`)
  await quotas.reconcile(db,b.tenant_id,'qr_assets',`disable:${id}`)
  await this.tenants.auditChange(db,actor,b.tenant_id,'short_link.disabled',{},'short_link',id)
  return{id,status:'disabled',lockVersion:lockVersion+1}
 })}
 private qrDto(q:RowDataPacket){return{id:q.id,branchId:q.branch_id,shortLinkId:q.short_link_id,format:q.format,status:q.status,sha256:q.content_sha256?(q.content_sha256 as Buffer).toString('hex'):null,contentUrl:`/api/v1/qr-assets/${q.id}/content`,createdAt:q.created_at}}
 async generateQr(principal:Principal,branchId:string,input:{shortLinkId:string;format:Format;regenerate:boolean}){
  // Rendering outside DB locks. The second transaction rechecks all ownership/state.
  const prepared=await this.tenants.withActor(principal,async(db,actor)=>{const b=await this.branch(db,actor,branchId,'qr.manage'),l=await this.link(db,b,input.shortLinkId);await this.validFunnel(db,b,l.funnel_configuration_id);if(l.status!=='active'||(l.expires_at&&new Date(l.expires_at).getTime()<=Date.now()))conflict('Short link unavailable');return this.url(l.code)},true)
  const rendered=await renderQr(prepared,input.format)
  return this.tenants.withActor(principal,async(db,actor)=>{
   const b=await this.branch(db,actor,branchId,'qr.manage'),l=await this.link(db,b,input.shortLinkId)
   await this.validFunnel(db,b,l.funnel_configuration_id)
   if(l.status!=='active'||(l.expires_at&&new Date(l.expires_at).getTime()<=Date.now())||this.url(l.code)!==prepared)conflict('Short link unavailable')
   let q=(await select(db,'SELECT * FROM qr_assets WHERE tenant_id=? AND branch_id=? AND short_link_id=? AND format=?',[b.tenant_id,b.id,l.id,input.format]))[0]
   if(q&&!input.regenerate){if(q.status!=='ready'||!(q.content_sha256 as Buffer).equals(rendered.digest))conflict('QR regeneration required');return this.qrDto(q)}
   if(q)await db.execute("UPDATE qr_assets SET status='ready',content_sha256=? WHERE id=? AND tenant_id=? AND branch_id=?",[rendered.digest,q.id,b.tenant_id,b.id])
   else{
    // Virtual content key: bytes are deterministically rendered, not written to disk.
    await db.execute("INSERT INTO qr_assets(tenant_id,branch_id,short_link_id,format,object_key,content_sha256,status) VALUES (?,?,?,?,?,?,'ready')",[b.tenant_id,b.id,l.id,input.format,`${b.tenant_id}/${randomBytes(16).toString('hex')}.${input.format}`,rendered.digest])
   }
   const regenerated=!!q
   const consumes=!q||q.status!=='ready'
   q=(await select(db,'SELECT * FROM qr_assets WHERE tenant_id=? AND branch_id=? AND short_link_id=? AND format=?',[b.tenant_id,b.id,l.id,input.format]))[0]!
   if(consumes)await quotas.consume(db,b.tenant_id,'qr_assets',`qr:${q.id}`)
   await this.tenants.auditChange(db,actor,b.tenant_id,regenerated?'qr.regenerated':'qr.generated',{},'qr_asset',q.id)
   return this.qrDto(q)
  })
 }
 async qrDetails(principal:Principal,branchId:string,page:Page){return this.tenants.withActor(principal,async(db,actor)=>{const b=await this.branch(db,actor,branchId,'tenant.read');const rows=await select(db,'SELECT * FROM qr_assets WHERE tenant_id=? AND branch_id=? AND id>? ORDER BY id LIMIT ?',[b.tenant_id,b.id,page.afterId??'0',page.limit]);return{qrAssets:rows.map(q=>this.qrDto(q)),nextCursor:rows.length===page.limit?rows.at(-1)!.id:null}},true)}
 async qrContent(principal:Principal,id:string){
  const value=await this.tenants.withActor(principal,async(db,actor)=>{
   this.tenants.requirePermission(actor,'tenant.read')
   const q=(await select(db,`${tenantScopeSQL} SELECT q.*,l.code,l.status AS link_status,l.expires_at,l.funnel_configuration_id FROM qr_assets q JOIN scope s ON s.id=q.tenant_id JOIN short_links l ON l.id=q.short_link_id AND l.tenant_id=q.tenant_id AND l.branch_id=q.branch_id WHERE q.id=?`,[actor.member.tenantId,id]))[0]
   if(!q)throw new HttpError(404,'QR asset not found')
   const b=await this.branch(db,actor,q.branch_id,'tenant.read');await this.validFunnel(db,b,q.funnel_configuration_id)
   if(q.status!=='ready'||q.link_status!=='active'||(q.expires_at&&new Date(q.expires_at).getTime()<=Date.now()))conflict('QR asset unavailable')
   return{url:this.url(q.code),format:q.format as Format,digest:q.content_sha256 as Buffer}
  },true)
  const rendered=await renderQr(value.url,value.format)
  if(!rendered.digest.equals(value.digest))conflict('QR regeneration required')
  return rendered
 }
 private async publicRecord(db:PoolConnection,code:string,write=false){
  if(!shortCode.safeParse(code).success)unavailable()
  // Shared root lock serializes these reads/events against existing manager writes.
  const root=(await select(db,`SELECT id FROM tenants WHERE kind='platform' AND status='active' ${write?'FOR UPDATE':'LOCK IN SHARE MODE'}`))[0];if(!root)unavailable()
  const f=(await select(db,`SELECT f.id AS funnel_id,f.industry_channel_id,l.id AS link_id,l.tenant_id,l.branch_id,t.name AS merchant_name,b.name AS branch_name,b.address,b.timezone,c.code AS channel_code,c.name AS channel_name,v.version,v.public_copy,v.feedback_labels,f.revision,f.brand_title,f.accent_hex,f.locale,d.place_id,d.review_url FROM short_links l JOIN tenants t ON t.id=l.tenant_id AND t.kind='merchant' JOIN branches b ON b.tenant_id=l.tenant_id AND b.id=l.branch_id JOIN funnel_configurations f ON f.tenant_id=l.tenant_id AND f.branch_id=l.branch_id AND f.id=l.funnel_configuration_id JOIN channel_versions v ON v.id=f.channel_version_id AND v.industry_channel_id=f.industry_channel_id JOIN industry_channels c ON c.id=f.industry_channel_id JOIN review_destinations d ON d.tenant_id=f.tenant_id AND d.branch_id=f.branch_id AND d.id=f.review_destination_id WHERE l.code=? AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>UTC_TIMESTAMP(6)) AND b.status='active' AND t.status='active' AND f.status='published' AND v.status='published' AND c.status='active' AND d.status='active'`,[code]))[0]
  if(!f)unavailable()
  try{await this.auth.authorization.ancestors(f.tenant_id,db);destinationInput(f.place_id,f.review_url)}catch(error){if(error instanceof HttpError)unavailable();throw error}
  return f
 }
 // Backend-only hook reusing public state validation and write locks.
 withPublicFunnel<T>(code:string,work:(db:PoolConnection,funnel:RowDataPacket)=>Promise<T>){return transaction(this.pool,async db=>work(db,await this.publicRecord(db,code,true)))}
 private async publicEvent(db:PoolConnection,f:RowDataPacket,event:string){
  await db.execute("INSERT INTO audit_logs(event_id,tenant_id,action,resource_type,resource_id,request_id,outcome,safe_metadata) VALUES (?, ?, ?, 'short_link', ?, ?, 'success', '{}')",[randomBytes(16),f.tenant_id,`public.${event}`,f.link_id,randomBytes(16)])
 }
 async publicPage(code:string){if(!this.webOrigin)return undefined;return transaction(this.pool,async db=>{await this.publicRecord(db,code);return this.webOrigin+'/r/'+code})}
 async resolve(code:string){return transaction(this.pool,async db=>{
  const f=await this.publicRecord(db,code),copy=json(f.public_copy)
  await this.publicEvent(db,f,'funnel_viewed')
  return{merchant:{name:f.merchant_name},branch:{name:f.branch_name,address:f.address,timezone:f.timezone},industryChannel:{code:f.channel_code,name:f.channel_name},channelVersion:{version:f.version,title:copy.title},funnel:{revision:f.revision,brandTitle:f.brand_title,accentHex:f.accent_hex,locale:f.locale},options:{googleReview:{label:'Leave a Google review',url:f.review_url,independent:true},privateFeedback:{label:'Share private feedback',independent:true,fields:[{name:'overallRating',type:'integer',minimum:1,maximum:5,required:true},...Object.entries(json(f.feedback_labels)).map(([key,label])=>({name:({service:'serviceRating',cleanliness:'cleanlinessRating',waiting_time:'waitingTimeRating'} as Record<string,string>)[key],label,type:'integer',minimum:1,maximum:5,required:false}))],submissionAvailable:true,submissionUrl:`/api/v1/public/funnels/${code}/feedback`,submissionToken:this.auth.feedbackTokens.issue(code,f.revision)}},feedbackPolicy:{structuredOnly:true,medicalDetailsAllowed:false}}
 })}
 async event(code:string,event:'google_option_selected'|'private_feedback_option_selected'){return transaction(this.pool,async db=>{const f=await this.publicRecord(db,code);await this.publicEvent(db,f,event);return{recorded:true}})}
}
