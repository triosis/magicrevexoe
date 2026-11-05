import {randomBytes} from 'node:crypto'
import type {PoolConnection} from 'mysql2/promise'
import {select,lockPlatform} from '../auth/database.js'
import {HttpError} from '../middleware/error-handler.js'
import {periodKeys,periodState,type Metric} from './model.js'

export class QuotaError extends HttpError{
 constructor(public readonly code:string,public readonly metric:Metric,public readonly limit:string|null=null,public readonly used:string|null=null,public readonly remaining:string|null=null,public readonly limitMode='unavailable'){
  super(code==='QUOTA_EXCEEDED'?409:code==='SUBSCRIPTION_INACTIVE'?403:409,code==='QUOTA_EXCEEDED'?`Operation blocked: ${metric} quota exceeded`:`Operation blocked: ${metric} quota unavailable`)
 }
}
// Only caller-owned transactions may use this service, after resource authorization.
// Mutations are provisional until admission, ledger, counter and audit all commit.
export class QuotaService{
 async observed(db:PoolConnection,tenant:string,metric:Metric,start:string,end:string):Promise<string>{
  const sql:Record<Metric,string>={
   branches:"SELECT COUNT(*) AS n FROM branches WHERE tenant_id=? AND status='active'",
   staff_seats:"SELECT COUNT(*) AS n FROM tenant_memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=? AND m.status='active' AND u.status='active'",
   short_links:"SELECT COUNT(*) AS n FROM short_links l JOIN branches b ON b.tenant_id=l.tenant_id AND b.id=l.branch_id WHERE l.tenant_id=? AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>UTC_TIMESTAMP(6)) AND b.status='active'",
   qr_assets:"SELECT COUNT(*) AS n FROM qr_assets q JOIN short_links l ON l.tenant_id=q.tenant_id AND l.branch_id=q.branch_id AND l.id=q.short_link_id JOIN branches b ON b.tenant_id=q.tenant_id AND b.id=q.branch_id WHERE q.tenant_id=? AND q.status='ready' AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>UTC_TIMESTAMP(6)) AND b.status='active'",
   feedback_submissions:'SELECT COUNT(*) AS n FROM private_feedback WHERE tenant_id=? AND submitted_at>=? AND submitted_at<?',
  }
  return String((await select(db,sql[metric],[tenant,...(metric==='feedback_submissions'?[start,end]:[])]))[0]!.n)
 }
 private async state(db:PoolConnection,tenant:string,metric:Metric){
  await lockPlatform(db)
  const chain=await select(db,"WITH RECURSIVE chain AS (SELECT id,parent_id,status,kind,0 AS depth FROM tenants WHERE id=? UNION ALL SELECT t.id,t.parent_id,t.status,t.kind,c.depth+1 FROM tenants t JOIN chain c ON t.id=c.parent_id WHERE c.depth<3) SELECT * FROM chain",[tenant])
  if(!chain.length||chain[0]!.kind!=='merchant'||!chain.some(r=>r.kind==='platform')||chain.some(r=>r.status!=='active'))throw new QuotaError('SUBSCRIPTION_INACTIVE',metric)
  const s=(await select(db,`SELECT *,${periodKeys},${periodState} FROM subscriptions WHERE tenant_id=? ORDER BY (current_slot IS NOT NULL) DESC,id DESC LIMIT 1 FOR UPDATE`,[tenant]))[0]
  if(!s)throw new QuotaError('SUBSCRIPTION_MISSING',metric)
  if(!['active','trialing'].includes(s.status)||Number(s.period_elapsed)||Number(s.period_scheduled)||Number(s.period_ended))throw new QuotaError('SUBSCRIPTION_INACTIVE',metric)
  const l=(await select(db,'SELECT limit_value FROM plan_limits WHERE plan_id=? AND metric=?',[s.plan_id,metric]))[0]
  if(!l)throw new QuotaError('QUOTA_LIMIT_MISSING',metric)
  const limit=l.limit_value as string|null,mode=limit===null?'unlimited':'finite'
  const c=(await select(db,"SELECT used,DATE_FORMAT(period_end,'%Y-%m-%d %H:%i:%s.%f') AS end_key FROM usage_counters WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=? FOR UPDATE",[tenant,s.id,metric,s.period_start_key]))[0]
  if(!c)throw new QuotaError('QUOTA_COUNTER_MISSING',metric,limit,null,null,mode)
  const ledger=(await select(db,'SELECT COALESCE(SUM(quantity),0) AS used,COALESCE(SUM(period_end<>?),0) AS mismatch FROM usage_records WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=?',[s.period_end_key,tenant,s.id,metric,s.period_start_key]))[0]!
  if(c.end_key!==s.period_end_key||String(c.used)!==String(ledger.used)||Number(ledger.mismatch))throw new QuotaError('QUOTA_RECONCILIATION_REQUIRED',metric,limit,null,null,mode)
  return{s,c,limit,mode}
 }
 async consume(db:PoolConnection,tenant:string,metric:Metric,eventKey:string){
  const {s,c,limit,mode}=await this.state(db,tenant,metric)
  const after=metric==='feedback_submissions'?BigInt(c.used)+1n:BigInt(await this.observed(db,tenant,metric,s.period_start_key,s.period_end_key))
  const before=metric==='feedback_submissions'?BigInt(c.used):after-1n
  if(limit!==null&&after>BigInt(limit))throw new QuotaError('QUOTA_EXCEEDED',metric,limit,before.toString(),(BigInt(limit)>before?BigInt(limit)-before:0n).toString(),mode)
  await this.record(db,tenant,metric,s,c,after,eventKey)
 }
 private async record(db:PoolConnection,tenant:string,metric:Metric,s:Record<string,any>,c:Record<string,any>,after:bigint,eventKey:string){
  const delta=after-BigInt(c.used);if(delta===0n)return
  await db.execute('INSERT INTO usage_records(tenant_id,subscription_id,metric,quantity,period_start,period_end,source_event_key) VALUES (?,?,?,?,?,?,?)',[tenant,s.id,metric,delta.toString(),s.period_start_key,s.period_end_key,Buffer.from(`quota:${s.id}:${eventKey}:${randomBytes(12).toString('hex')}`)])
  await db.execute('UPDATE usage_counters SET used=? WHERE tenant_id=? AND subscription_id=? AND metric=? AND period_start=?',[after.toString(),tenant,s.id,metric,s.period_start_key])
 }
 // Releases never create accounting configuration or deny resource cleanup.
 async reconcile(db:PoolConnection,tenant:string,metric:Metric,eventKey:string){
  try{const {s,c}=await this.state(db,tenant,metric);await this.record(db,tenant,metric,s,c,BigInt(await this.observed(db,tenant,metric,s.period_start_key,s.period_end_key)),eventKey)}catch(error){if(!(error instanceof QuotaError))throw error}
 }
}
export const quotas=new QuotaService()
