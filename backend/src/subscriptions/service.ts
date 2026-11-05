import type {PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise'
import {randomBytes} from 'node:crypto'
import type {Principal} from '../auth/authorization.js'
import {select,type Values} from '../auth/database.js'
import {TenantService,type TenantActor,type Account,type Page} from '../tenants/service.js'
import {HttpError} from '../middleware/error-handler.js'
import {quotas} from './quota.js'
import {approvedTerms} from '../billing/terms.js'
import {metrics,periodKeys,periodState,dateKey,quota,transition,type Metric,type Assignment,type Status,type HistoryInput} from './model.js'

type Sub=RowDataPacket&{id:string;tenant_id:string;plan_id:string;status:Status;lock_version:number;period_start_key:string;period_end_key:string}
type Plan=RowDataPacket&{id:string;code:string;version:number;name:string;price:string;currency:string;interval_unit:string;status:string}
const allocated=(s:string)=>['trialing','active','past_due'].includes(s)
function conflict(message:string):never{throw new HttpError(409,message)}
export class SubscriptionService{
 constructor(private readonly tenants:TenantService){}
 private async merchant(db:PoolConnection,actor:TenantActor,id:string,write=false){
  const owner=await this.tenants.authorizedAccount(db,actor,id,write?'subscription.manage':'subscription.read')
  if(owner.kind!=='merchant')throw new HttpError(404,'Merchant not found')
  if(write&&actor.member.kind==='merchant')throw new HttpError(403,'Access denied')
  return owner
 }
 private async clock(db:PoolConnection){return new Date((await select(db,'SELECT UTC_TIMESTAMP(3) AS now'))[0]!.now)}
 private async plan(db:PoolConnection,id:string,assign=false){
  const row=(await select<Plan>(db,`SELECT * FROM subscription_plans WHERE id=? AND status ${assign?"='published'":"IN ('published','retired')"}`,[id]))[0]
  if(!row)throw new HttpError(404,'Subscription plan not found')
  const limits=await select(db,'SELECT metric,limit_value FROM plan_limits WHERE plan_id=? ORDER BY metric',[id])
  return{...row,limits:limits.map(l=>({metric:l.metric as Metric,limit:l.limit_value as string|null})),limitsComplete:metrics.every(m=>limits.some(l=>l.metric===m))}
 }
 private planDto(p:Awaited<ReturnType<SubscriptionService['plan']>>){return{id:p.id,code:p.code,version:p.version,name:p.name,price:p.price,currency:p.currency,interval:p.interval_unit,status:p.status,limits:p.limits,limitsComplete:p.limitsComplete}}
 private async sub(db:PoolConnection,merchant:string,id:string){const row=(await select<Sub>(db,`SELECT *,${periodKeys},${periodState} FROM subscriptions WHERE tenant_id=? AND id=?`,[merchant,id]))[0];if(!row)throw new HttpError(404,'Subscription not found');return row}
 private async latest(db:PoolConnection,id:string){return(await select<Sub>(db,`SELECT *,${periodKeys},${periodState} FROM subscriptions WHERE tenant_id=? ORDER BY (current_slot IS NOT NULL) DESC,id DESC LIMIT 1`,[id]))[0]}
 private effective(sub:Sub,owner:Account,_now:Date){if(!Number(owner.effective))return'suspended';if(!allocated(sub.status))return sub.status;if(Number(sub.period_scheduled))return'scheduled';if(Number(sub.period_elapsed)||Number(sub.period_ended))return'expired';return sub.status}
 private async dto(db:PoolConnection,sub:Sub,owner:Account,now:Date){return{id:sub.id,merchantId:sub.tenant_id,status:sub.status,effectiveStatus:this.effective(sub,owner,now),lockVersion:sub.lock_version,startsAt:sub.starts_at,endsAt:sub.ends_at,periodStart:sub.period_start_key.replace(' ','T')+'Z',periodEnd:sub.period_end_key.replace(' ','T')+'Z',cancelAtPeriodEnd:!!sub.cancel_at_period_end,createdAt:sub.created_at,plan:this.planDto(await this.plan(db,sub.plan_id))}}
 async plans(principal:Principal,page:Page){return this.tenants.withActor(principal,async(db,actor)=>{this.tenants.requirePermission(actor,'subscription.read');const rows=await select(db,"SELECT id FROM subscription_plans WHERE status='published' AND id>? ORDER BY id LIMIT ?",[page.afterId??'0',page.limit]);return{plans:await Promise.all(rows.map(async r=>this.planDto(await this.plan(db,r.id)))),nextCursor:rows.length===page.limit?rows.at(-1)!.id:null}},true)}
 async planDetails(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>{this.tenants.requirePermission(actor,'subscription.read');return this.planDto(await this.plan(db,id))},true)}
 async current(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>{const owner=await this.merchant(db,actor,id),now=await this.clock(db),sub=await this.latest(db,id);return{subscription:sub?await this.dto(db,sub,owner,now):null,availability:sub?'available':'no_subscription',accountAccess:Number(owner.effective)?'active':'suspended',serverTime:now.toISOString()}},true)}
 async history(principal:Principal,id:string,page:Page){return this.tenants.withActor(principal,async(db,actor)=>{const owner=await this.merchant(db,actor,id),now=await this.clock(db),rows=await select<Sub>(db,`SELECT *,${periodKeys},${periodState} FROM subscriptions WHERE tenant_id=? AND id>? ORDER BY id LIMIT ?`,[id,page.afterId??'0',page.limit]);return{subscriptions:await Promise.all(rows.map(s=>this.dto(db,s,owner,now))),nextCursor:rows.length===page.limit?rows.at(-1)!.id:null}},true)}
 private async observed(db:PoolConnection,tenant:string,metric:Metric,start:string,end:string):Promise<string>{
  return quotas.observed(db,tenant,metric,start,end)
 }
 private async initialize(db:PoolConnection,actor:TenantActor|undefined,owner:Account,sub:Sub,now:Date){
  if(!Number(owner.effective)||!allocated(sub.status)||this.effective(sub,owner,now)==='expired'||this.effective(sub,owner,now)==='scheduled')conflict('Subscription period is not active')
  const plan=await this.plan(db,sub.plan_id);if(!plan.limitsComplete)conflict('Plan limits are not initialized')
  let created=0
  for(const metric of metrics){
   const existing=(await select(db,"SELECT used,DATE_FORMAT(period_end,'%Y-%m-%d %H:%i:%s.%f') AS end_key FROM usage_counters WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=? FOR UPDATE",[owner.id,sub.id,metric,sub.period_start_key]))[0]
   if(existing){
    if(existing.end_key!==sub.period_end_key)conflict('Usage period requires reconciliation')
    const recorded=(await select(db,'SELECT COALESCE(SUM(quantity),0) AS used FROM usage_records WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=? AND period_end=?',[owner.id,sub.id,metric,sub.period_start_key,sub.period_end_key]))[0]!
    if(String(recorded.used)!==String(existing.used))conflict('Usage counter requires reconciliation')
    continue
   }
   const ledger=(await select(db,'SELECT COUNT(*) AS n,COALESCE(SUM(quantity),0) AS used,SUM(period_end<>?) AS mismatch FROM usage_records WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=?',[sub.period_end_key,owner.id,sub.id,metric,sub.period_start_key]))[0]!
   if(BigInt(ledger.used)<0n||Number(ledger.mismatch)>0)conflict('Usage ledger requires reconciliation')
   let used=String(ledger.used)
   if(String(ledger.n)==='0'){
    used=await this.observed(db,owner.id,metric,sub.period_start_key,sub.period_end_key)
    if(BigInt(used)>0n)await db.execute('INSERT INTO usage_records(tenant_id,subscription_id,metric,quantity,period_start,period_end,source_event_key) VALUES (?,?,?,?,?,?,?)',[owner.id,sub.id,metric,used,sub.period_start_key,sub.period_end_key,Buffer.from(`init:${sub.id}:${metric}:${sub.period_start_key}`)])
   }
   await db.execute('INSERT INTO usage_counters(tenant_id,subscription_id,metric,period_start,period_end,used) VALUES (?,?,?,?,?,?)',[owner.id,sub.id,metric,sub.period_start_key,sub.period_end_key,used]);created++
  }
  if(actor)await this.tenants.auditChange(db,actor,owner.id,'subscription.usage_initialized',{createdCounters:String(created)},'subscription',sub.id)
  else await db.execute("INSERT INTO audit_logs(event_id,tenant_id,action,resource_type,resource_id,request_id,outcome,safe_metadata) VALUES (?,?,'subscription.usage_initialized','subscription',?,?,'success',?)",[randomBytes(16),owner.id,sub.id,randomBytes(16),JSON.stringify({createdCounters:String(created),source:'verified_payment'})])
  return{initialized:true,createdCounters:created}
 }
 async assign(principal:Principal,id:string,input:Assignment){return this.tenants.withActor(principal,async(db,actor)=>{
  const owner=await this.merchant(db,actor,id,true),now=await this.clock(db)
  if(!Number(owner.effective))conflict('Merchant account is suspended')
  const plan=await this.plan(db,input.planId,true);if(!plan.limitsComplete)conflict('Plan limits are not initialized')
  if(BigInt(plan.price.replace('.',''))>0n)await approvedTerms(db,input.planId)
  const start=input.periodStart??now
  if(start>now||input.periodEnd<=now||input.periodEnd<=start)conflict('Assignment must cover the current server time')
  const previous=await this.latest(db,id)
  if(previous&&allocated(previous.status)){
   if(!Number(previous.period_elapsed))conflict('End the current subscription before assigning another plan')
   await db.execute("UPDATE subscriptions SET status='expired',ends_at=current_period_end,lock_version=lock_version+1 WHERE tenant_id=? AND id=?",[id,previous.id])
   await this.tenants.auditChange(db,actor,id,'subscription.expired',{automatic:false},'subscription',previous.id)
  }
  const last=(await select(db,"SELECT DATE_FORMAT(MAX(COALESCE(ends_at,current_period_end)),'%Y-%m-%d %H:%i:%s.%f') AS ended_key FROM subscriptions WHERE tenant_id=?",[id]))[0]!
  if(last.ended_key&&dateKey(start)<last.ended_key)conflict('Subscription periods cannot overlap ended history')
  await db.execute('INSERT INTO subscriptions(tenant_id,plan_id,status,starts_at,current_period_start,current_period_end) VALUES (?,?,?,?,?,?)',[id,input.planId,input.status,start,start,input.periodEnd])
  const sub=await this.latest(db,id);if(!sub)throw Error('Missing assigned subscription')
  await this.initialize(db,actor,owner,sub,now)
  await this.tenants.auditChange(db,actor,id,'subscription.assigned',{planId:input.planId},'subscription',sub.id)
  return this.dto(db,sub,owner,now)
 })}
 async initializeUsage(principal:Principal,id:string,subscriptionId:string){return this.tenants.withActor(principal,async(db,actor)=>{const owner=await this.merchant(db,actor,id,true),sub=await this.sub(db,id,subscriptionId);return this.initialize(db,actor,owner,sub,await this.clock(db))})}
 // Backend-only boundary, called after verified provider binding under the root lock.
 async allocateVerifiedPayment(db:PoolConnection,merchant:string,planId:string,start:Date,end:Date){
  const chain=await select(db,"WITH RECURSIVE chain AS (SELECT id,parent_id,status,kind,0 AS depth FROM tenants WHERE id=? UNION ALL SELECT t.id,t.parent_id,t.status,t.kind,c.depth+1 FROM tenants t JOIN chain c ON t.id=c.parent_id WHERE c.depth<3) SELECT * FROM chain ORDER BY depth",[merchant])
  if(chain[0]?.kind!=='merchant'||chain.at(-1)?.kind!=='platform'||chain.some(r=>r.status!=='active'))conflict('Paid allocation requires active merchant ancestry')
  const now=await this.clock(db);if(start>now||end<=now||end<=start)conflict('Paid period requires reconciliation')
  await approvedTerms(db,planId);const plan=await this.plan(db,planId,true);if(!plan.limitsComplete)conflict('Paid plan limits are unavailable')
  const old=await this.latest(db,merchant)
  if(old&&allocated(old.status)){
   if(old.plan_id===planId&&old.period_start_key===dateKey(start)&&old.period_end_key===dateKey(end))return{id:old.id,created:false}
   if(!Number(old.period_elapsed)||old.period_end_key>dateKey(start))conflict('Paid period overlaps the current allocation')
   await db.execute("UPDATE subscriptions SET status='expired',ends_at=current_period_end,lock_version=lock_version+1 WHERE tenant_id=? AND id=?",[merchant,old.id])
  }
  const ended=(await select(db,"SELECT DATE_FORMAT(MAX(COALESCE(ends_at,current_period_end)),'%Y-%m-%d %H:%i:%s.%f') AS ended FROM subscriptions WHERE tenant_id=?",[merchant]))[0]!
  if(ended.ended&&ended.ended>dateKey(start))conflict('Paid period overlaps subscription history')
  await db.execute("INSERT INTO subscriptions(tenant_id,plan_id,status,starts_at,current_period_start,current_period_end) VALUES (?,?,'active',?,?,?)",[merchant,planId,start,start,end])
  const sub=(await this.latest(db,merchant))!,owner={...chain[0],id:merchant,effective:1} as Account
  await this.initialize(db,undefined,owner,sub,now)
  await db.execute("INSERT INTO audit_logs(event_id,tenant_id,action,resource_type,resource_id,request_id,outcome,safe_metadata) VALUES (?,?,'subscription.payment_allocated','subscription',?,?,'success','{}')",[randomBytes(16),merchant,sub.id,randomBytes(16)])
  return{id:sub.id,created:true}
 }
 async changeStatus(principal:Principal,id:string,subscriptionId:string,input:{status:Status;lockVersion:number}){return this.tenants.withActor(principal,async(db,actor)=>{
  const owner=await this.merchant(db,actor,id,true),sub=await this.sub(db,id,subscriptionId),now=await this.clock(db)
  if(sub.lock_version!==input.lockVersion||!transition(sub.status,input.status))conflict('Subscription version or status conflict')
    if(allocated(input.status)){const plan=await this.plan(db,sub.plan_id);if(BigInt(plan.price.replace('.',''))>0n)await approvedTerms(db,sub.plan_id)}
  if(input.status==='expired'&&!Number(sub.period_elapsed))conflict('Subscription period has not ended; use cancellation')
  if(allocated(input.status)&&(!Number(owner.effective)||this.effective(sub,owner,now)==='expired'||this.effective(sub,owner,now)==='scheduled'))conflict('Subscription period or merchant is inactive')
  let canceledAt=dateKey(now);if(canceledAt>sub.period_end_key)canceledAt=sub.period_end_key;if(canceledAt<sub.starts_key)canceledAt=sub.starts_key
  const end=input.status==='expired'?sub.period_end_key:input.status==='canceled'?canceledAt:null
  const [changed]=await db.execute<ResultSetHeader>('UPDATE subscriptions SET status=?,ends_at=?,lock_version=lock_version+1 WHERE tenant_id=? AND id=? AND lock_version=?',[input.status,end,id,subscriptionId,input.lockVersion])
  if(changed.affectedRows!==1)conflict('Subscription version or status conflict')
  const updated=await this.sub(db,id,subscriptionId)
  if(input.status==='active')await this.initialize(db,actor,owner,updated,now)
  await this.tenants.auditChange(db,actor,id,'subscription.status_changed',{fromStatus:sub.status,toStatus:input.status},'subscription',subscriptionId)
  return this.dto(db,updated,owner,now)
 })}
 async usage(principal:Principal,id:string,only?:Metric){return this.tenants.withActor(principal,async(db,actor)=>{
  const owner=await this.merchant(db,actor,id),now=await this.clock(db),sub=await this.latest(db,id)
  if(!sub)return{availability:'no_subscription',subscription:null,metrics:[]}
  const plan=await this.plan(db,sub.plan_id),effective=this.effective(sub,owner,now),active=['active','trialing'].includes(effective),rows=[]
  for(const metric of only?[only]:metrics){
   const limitRow=plan.limits.find(l=>l.metric===metric)
   const counter=(await select(db,"SELECT used,DATE_FORMAT(period_end,'%Y-%m-%d %H:%i:%s.%f') AS end_key FROM usage_counters WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=?",[id,sub.id,metric,sub.period_start_key]))[0]
   let availability=!active?'period_inactive':!counter?'counter_missing':counter.end_key!==sub.period_end_key?'period_mismatch':!limitRow?'limit_missing':'available'
   let used:string|null=null
   if(active&&counter&&counter.end_key===sub.period_end_key){
    if(metric==='feedback_submissions'){
     const ledger=(await select(db,'SELECT COALESCE(SUM(quantity),0) AS n FROM usage_records WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=? AND period_end=?',[id,sub.id,metric,sub.period_start_key,sub.period_end_key]))[0]!
     if(String(ledger.n)!==String(counter.used))availability='counter_inconsistent';else used=String(counter.used)
    }else used=await this.observed(db,id,metric,sub.period_start_key,sub.period_end_key)
   }
   rows.push({metric,availability,initialized:!!counter,used,limit:limitRow?.limit??null,limitMode:!limitRow?'missing':limitRow.limit===null?'unlimited':'finite',...quota(availability==='available'?used:null,limitRow?.limit),source:metric==='feedback_submissions'?'period_ledger':'live_resources'})
  }
  return{availability:rows.every(r=>r.availability==='available')?'available':'unavailable',subscription:await this.dto(db,sub,owner,now),metrics:rows}
 },true)}
 async usageHistory(principal:Principal,id:string,input:HistoryInput){return this.tenants.withActor(principal,async(db,actor)=>{
  await this.merchant(db,actor,id);if(input.subscriptionId)await this.sub(db,id,input.subscriptionId)
  const values:Values=[id,input.afterId??'0'],where=['tenant_id=?','id>?']
  if(input.metric){where.push('metric=?');values.push(input.metric)}
  if(input.subscriptionId){where.push('subscription_id=?');values.push(input.subscriptionId)}
  values.push(input.limit)
  const rows=await select(db,`SELECT id,subscription_id,metric,quantity,period_start,period_end,occurred_at,source_event_key FROM usage_records WHERE ${where.join(' AND ')} ORDER BY id LIMIT ?`,values)
  return{usageRecords:rows.map(r=>({id:r.id,subscriptionId:r.subscription_id,metric:r.metric,quantity:r.quantity,periodStart:r.period_start,periodEnd:r.period_end,occurredAt:r.occurred_at,kind:(r.source_event_key as Buffer).toString().startsWith('init:')?'initial_snapshot':'recorded_event'})),nextCursor:rows.length===input.limit?rows.at(-1)!.id:null,gaugeHistoryCoverage:'initialization_snapshots_and_reconciliation_events'}
 },true)}
}
