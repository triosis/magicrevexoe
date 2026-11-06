import {createHash,randomBytes} from 'node:crypto'
import type {PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise'
import {select,type Values} from '../auth/database.js'
import type {AuthService} from '../auth/service.js'
import type {Principal} from '../auth/authorization.js'
import {TenantService,tenantScopeSQL,type TenantActor} from '../tenants/service.js'
import type {FunnelService} from '../funnels/service.js'
import {HttpError} from '../middleware/error-handler.js'
import {submission,validTransition,type Submission,type Filter,type StatusInput} from './validation.js'
import {quotas} from '../subscriptions/quota.js'

const labels=(value:unknown)=>typeof value==='string'?JSON.parse(value):value
const confirmation=(row:RowDataPacket)=>({accepted:true,confirmationId:(row.public_id as Buffer).toString('hex')})
function notFound():never{throw new HttpError(404,'Feedback not found')}
function conflict():never{throw new HttpError(409,'Feedback version or status conflict')}

export class FeedbackService{
 constructor(private readonly tenants:TenantService,private readonly auth:AuthService,private readonly funnels:FunnelService){}
 async submit(code:string,raw:Submission){
  // Validate in service as well as HTTP boundary; never persist unknown payloads.
  const parsed=submission.safeParse(raw);if(!parsed.success)throw new HttpError(400,'Invalid request')
  const input=parsed.data
  return this.funnels.withPublicFunnel(code,async(db,f)=>{
   this.auth.feedbackTokens.verify(input.submissionToken,code,f.revision)
   const allowed=labels(f.feedback_labels)
   for(const [field,key]of [['serviceRating','service'],['cleanlinessRating','cleanliness'],['waitingTimeRating','waiting_time']] as const)if(input[field]!==undefined&&!Object.hasOwn(allowed,key))throw new HttpError(400,'Unsupported feedback field')
   const digest=createHash('sha256').update(input.submissionToken).digest()
   const existing=(await select(db,'SELECT public_id,overall_rating,service_rating,cleanliness_rating,waiting_time_rating,customer_language FROM private_feedback WHERE tenant_id=? AND submission_key_hash=?',[f.tenant_id,digest]))[0]
   if(existing){
    if(existing.overall_rating!==input.overallRating||existing.service_rating!==(input.serviceRating??null)||existing.cleanliness_rating!==(input.cleanlinessRating??null)||existing.waiting_time_rating!==(input.waitingTimeRating??null)||existing.customer_language!==(input.language??null))throw new HttpError(409,'Submission token already used')
    return confirmation(existing)
   }
   const publicId=randomBytes(16)
   await db.execute('INSERT INTO private_feedback(public_id,tenant_id,branch_id,funnel_configuration_id,industry_channel_id,short_link_id,submission_key_hash,overall_rating,service_rating,cleanliness_rating,waiting_time_rating,customer_language) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[publicId,f.tenant_id,f.branch_id,f.funnel_id,f.industry_channel_id,f.link_id,digest,input.overallRating,input.serviceRating??null,input.cleanlinessRating??null,input.waitingTimeRating??null,input.language??null])
   const saved=(await select(db,'SELECT id,public_id FROM private_feedback WHERE tenant_id=? AND public_id=?',[f.tenant_id,publicId]))[0]!
   await quotas.consume(db,f.tenant_id,'feedback_submissions',`feedback:${publicId.toString('hex')}`)
   await db.execute("INSERT INTO audit_logs(event_id,tenant_id,action,resource_type,resource_id,request_id,outcome,safe_metadata) VALUES (?,?,'public.feedback_submitted','private_feedback',?,?,'success','{}')",[randomBytes(16),f.tenant_id,saved.id,randomBytes(16)])
   return confirmation(saved)
  })
 }
 private dto(row:RowDataPacket){return{id:row.id,publicId:(row.public_id as Buffer).toString('hex'),merchantId:row.tenant_id,branchId:row.branch_id,language:row.customer_language,ratings:{overall:row.overall_rating,service:row.service_rating,cleanliness:row.cleanliness_rating,waitingTime:row.waiting_time_rating},status:row.archived_at?'archived':row.status,lockVersion:row.lock_version,submittedAt:row.submitted_at,resolvedAt:row.resolved_at}}
 private async scope(db:PoolConnection,actor:TenantActor,input:Filter){
  this.tenants.requirePermission(actor,'feedback.read')
  if(input.merchantId){const account=await this.tenants.authorizedAccount(db,actor,input.merchantId,'feedback.read');if(account.kind!=='merchant')notFound();await this.auth.authorization.ancestors(account.id,db)}
  if(input.branchId){
   const b=(await select(db,`${tenantScopeSQL} SELECT b.tenant_id FROM branches b JOIN scope s ON s.id=b.tenant_id AND s.effective=1 WHERE b.id=?`,[actor.member.tenantId,input.branchId]))[0]
   if(!b||(input.merchantId&&input.merchantId!==b.tenant_id))notFound()
   await this.auth.authorization.ancestors(b.tenant_id,db)
  }
  const predicates=['s.effective=1'],values:Values=[actor.member.tenantId]
  if(input.merchantId){predicates.push('f.tenant_id=?');values.push(input.merchantId)}
  if(input.branchId){predicates.push('f.branch_id=?');values.push(input.branchId)}
  if(input.status==='archived')predicates.push('a.feedback_id IS NOT NULL');else if(input.status){predicates.push('f.status=? AND a.feedback_id IS NULL');values.push(input.status)}
  if(input.from){predicates.push('f.submitted_at>=?');values.push(input.from)}
  if(input.to){predicates.push('f.submitted_at<?');values.push(input.to)}
  return{sql:`${tenantScopeSQL} SELECT f.*,a.archived_at FROM private_feedback f JOIN scope s ON s.id=f.tenant_id LEFT JOIN feedback_archives a ON a.tenant_id=f.tenant_id AND a.feedback_id=f.id WHERE ${predicates.join(' AND ')}`,values,predicates:predicates.join(' AND ')}
 }
 async list(principal:Principal,input:Filter&{afterId?:string|undefined;limit:number}){return this.tenants.withActor(principal,async(db,actor)=>{
  const scope=await this.scope(db,actor,input),rows=await select(db,scope.sql+' AND f.id>? ORDER BY f.id LIMIT ?',[...scope.values,input.afterId??'0',input.limit])
  await this.tenants.auditChange(db,actor,actor.member.tenantId,'feedback.list_viewed',{},'feedback_collection',actor.member.tenantId)
  return{feedback:rows.map(row=>this.dto(row)),nextCursor:rows.length===input.limit?rows.at(-1)!.id:null}
 },true)}
 private async record(db:PoolConnection,actor:TenantActor,id:string,permission:string){
  this.tenants.requirePermission(actor,permission)
  const row=(await select(db,`${tenantScopeSQL} SELECT f.*,a.archived_at FROM private_feedback f JOIN scope s ON s.id=f.tenant_id AND s.effective=1 LEFT JOIN feedback_archives a ON a.tenant_id=f.tenant_id AND a.feedback_id=f.id WHERE f.id=?`,[actor.member.tenantId,id]))[0]
  if(!row)notFound()
  await this.auth.authorization.ancestors(row.tenant_id,db)
  row.status=row.archived_at?'archived':row.status;return row
 }
 async details(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>{
  const row=await this.record(db,actor,id,'feedback.read')
  const history=await select(db,'SELECT from_status,to_status,reason_code,created_at FROM feedback_status_events WHERE tenant_id=? AND feedback_id=? ORDER BY id',[row.tenant_id,id])
  await this.tenants.auditChange(db,actor,row.tenant_id,'feedback.viewed',{},'private_feedback',id)
  return{...this.dto(row),history:[...history.map(e=>({fromStatus:e.from_status,toStatus:e.to_status,reasonCode:e.reason_code,createdAt:e.created_at})),...(row.archived_at?[{fromStatus:'resolved',toStatus:'archived',reasonCode:'completed',createdAt:row.archived_at}]:[])]}
 },true)}
 async statistics(principal:Principal,input:Filter){return this.tenants.withActor(principal,async(db,actor)=>{
  const scope=await this.scope(db,actor,input)
  const rows=await select(db,`${tenantScopeSQL} SELECT CASE WHEN a.feedback_id IS NULL THEN f.status ELSE 'archived' END AS status,COUNT(*) AS count,AVG(f.overall_rating) AS average_rating FROM private_feedback f JOIN scope s ON s.id=f.tenant_id LEFT JOIN feedback_archives a ON a.tenant_id=f.tenant_id AND a.feedback_id=f.id WHERE ${scope.predicates} GROUP BY status ORDER BY status`,scope.values)
  await this.tenants.auditChange(db,actor,actor.member.tenantId,'feedback.statistics_viewed',{},'feedback_collection',actor.member.tenantId)
  return{groups:rows.map(r=>({status:r.status,count:r.count,averageRating:r.average_rating}))}
 },true)}
 async analytics(principal:Principal,input:Filter){return this.tenants.withActor(principal,async(db,actor)=>{
  const lower=input.from??new Date(Date.now()-30*86400000),upper=input.to??new Date()
  if(lower>=upper||upper.getTime()-lower.getTime()>93*86400000)throw new HttpError(400,'Choose an analytics interval of at most 93 days')
  const bounded={...input,from:lower,to:upper},feedback=await this.scope(db,actor,bounded)
  const ratings=await select(db,`${tenantScopeSQL} SELECT f.overall_rating AS rating,COUNT(*) AS count FROM private_feedback f JOIN scope s ON s.id=f.tenant_id LEFT JOIN feedback_archives a ON a.tenant_id=f.tenant_id AND a.feedback_id=f.id WHERE ${feedback.predicates} GROUP BY f.overall_rating ORDER BY f.overall_rating`,feedback.values)
  const daily=await select(db,`${tenantScopeSQL} SELECT DATE_FORMAT(f.submitted_at,'%Y-%m-%d') AS day,COUNT(*) AS count FROM private_feedback f JOIN scope s ON s.id=f.tenant_id LEFT JOIN feedback_archives a ON a.tenant_id=f.tenant_id AND a.feedback_id=f.id WHERE ${feedback.predicates} GROUP BY day ORDER BY day`,feedback.values)
  const events=await select(db,`${tenantScopeSQL} SELECT a.action,COUNT(*) AS count FROM audit_logs a JOIN scope s ON s.id=a.tenant_id AND s.effective=1 LEFT JOIN short_links l ON a.resource_type='short_link' AND l.tenant_id=a.tenant_id AND l.id=a.resource_id WHERE a.action IN ('public.funnel_viewed','public.google_option_selected','public.private_feedback_option_selected') AND a.occurred_at>=? AND a.occurred_at<? ${input.merchantId?'AND a.tenant_id=?':''} ${input.branchId?'AND l.branch_id=?':''} GROUP BY a.action ORDER BY a.action`,[actor.member.tenantId,lower,upper,...(input.merchantId?[input.merchantId]:[]),...(input.branchId?[input.branchId]:[])])
  const languages=await select(db,`${tenantScopeSQL} SELECT u.language,u.metric,u.status,COUNT(*) AS count,COALESCE(SUM(CASE WHEN u.status='complete' AND u.metric='ai_draft' THEN u.input_tokens+u.output_tokens ELSE 0 END),0) AS tokens FROM billable_usage u JOIN scope s ON s.id=u.tenant_id AND s.effective=1 WHERE u.created_at>=? AND u.created_at<? ${input.merchantId?'AND u.tenant_id=?':''} ${input.branchId?'AND u.branch_id=?':''} GROUP BY u.language,u.metric,u.status ORDER BY u.language,u.metric,u.status`,[actor.member.tenantId,lower,upper,...(input.merchantId?[input.merchantId]:[]),...(input.branchId?[input.branchId]:[])])
  const publicActivity=await select(db,`${tenantScopeSQL} SELECT a.id,a.action AS event,l.branch_id AS branchId,a.occurred_at AS occurredAt FROM audit_logs a JOIN scope s ON s.id=a.tenant_id AND s.effective=1 JOIN short_links l ON a.resource_type='short_link' AND l.tenant_id=a.tenant_id AND l.id=a.resource_id WHERE a.action IN ('public.funnel_viewed','public.google_option_selected','public.private_feedback_option_selected') AND a.occurred_at>=? AND a.occurred_at<? ${input.merchantId?'AND a.tenant_id=?':''} ${input.branchId?'AND l.branch_id=?':''} ORDER BY a.occurred_at DESC,a.id DESC LIMIT 20`,[actor.member.tenantId,lower,upper,...(input.merchantId?[input.merchantId]:[]),...(input.branchId?[input.branchId]:[])])
  const activity=await select(db,`${tenantScopeSQL} SELECT f.id,f.tenant_id AS merchantId,f.branch_id AS branchId,f.overall_rating AS rating,CASE WHEN a.feedback_id IS NULL THEN f.status ELSE 'archived' END AS status,f.submitted_at AS occurredAt FROM private_feedback f JOIN scope s ON s.id=f.tenant_id LEFT JOIN feedback_archives a ON a.tenant_id=f.tenant_id AND a.feedback_id=f.id WHERE ${feedback.predicates} ORDER BY f.submitted_at DESC,f.id DESC LIMIT 20`,feedback.values)
  await this.tenants.auditChange(db,actor,actor.member.tenantId,'feedback.analytics_viewed',{},'feedback_collection',actor.member.tenantId)
  return{from:lower,to:upper,timeZone:'UTC',ratings,daily,events,languages,activity,publicActivity,googlePosts:null,googleReviewVelocity:null,conversionToGooglePosts:null,measurement:'recorded funnel views and clicks; not unique people, physical scans or verified posts',statusFilterAppliesTo:'feedback only'}
 },true)}
 async changeStatus(principal:Principal,id:string,input:StatusInput){return this.tenants.withActor(principal,async(db,actor)=>{
  const row=await this.record(db,actor,id,'feedback.change_status')
  if(row.lock_version!==input.lockVersion||!validTransition(row.status,input.status,input.reasonCode))conflict()
  if(input.status==='archived'){
   await db.execute('INSERT INTO feedback_archives(tenant_id,feedback_id,actor_user_id) VALUES (?,?,?)',[row.tenant_id,id,actor.principal.identity.sub])
   await db.execute('UPDATE private_feedback SET lock_version=lock_version+1 WHERE tenant_id=? AND id=? AND lock_version=?',[row.tenant_id,id,input.lockVersion])
   await this.tenants.auditChange(db,actor,row.tenant_id,'feedback.archived',{},'private_feedback',id)
   return{id,status:'archived',lockVersion:input.lockVersion+1}
  }
  const [result]=await db.execute<ResultSetHeader>("UPDATE private_feedback SET status=?,resolved_at=IF(?='resolved',UTC_TIMESTAMP(6),NULL),lock_version=lock_version+1 WHERE tenant_id=? AND id=? AND lock_version=?",[input.status,input.status,row.tenant_id,id,input.lockVersion])
  if(result.affectedRows!==1)conflict()
  await db.execute('INSERT INTO feedback_status_events(tenant_id,feedback_id,actor_user_id,from_status,to_status,reason_code) VALUES (?,?,?,?,?,?)',[row.tenant_id,id,actor.principal.identity.sub,row.status,input.status,input.reasonCode])
  await this.tenants.auditChange(db,actor,row.tenant_id,'feedback.status_changed',{fromStatus:row.status,toStatus:input.status,reasonCode:input.reasonCode},'private_feedback',id)
  return{id,status:input.status,lockVersion:input.lockVersion+1}
 })}
}
