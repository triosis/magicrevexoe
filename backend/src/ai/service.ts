import {createHash,randomBytes} from 'node:crypto'
import {z} from 'zod'
import {select} from '../auth/database.js'
import type {AuthService} from '../auth/service.js'
import type {FunnelService} from '../funnels/service.js'
import {HttpError} from '../middleware/error-handler.js'
import {approvedTerms} from '../billing/terms.js'
import {periodKeys,periodState} from '../subscriptions/model.js'
import type {ClaudeProvider,DraftPrompt} from './provider.js'

export const draftInput=z.object({submissionToken:z.string().min(32).max(2048),requestKey:z.string().uuid(),language:z.enum(['en','hi','ml']),rating:z.number().int().min(1).max(5),tags:z.array(z.enum(['friendly_team','clean_environment','short_wait','long_wait','helpful_service','service_could_improve'])).max(3).refine(v=>new Set(v).size===v.length),complex:z.boolean().default(false)}).strict()
const hash=(value:string)=>createHash('sha256').update(value).digest()
const key=(value:string)=>Buffer.from(value.replaceAll('-',''),'hex')

export class DraftService {
  constructor(private readonly funnels:FunnelService,private readonly auth:AuthService,private readonly provider?:ClaudeProvider){}
  async scan(code:string,raw:unknown){
    const parsed=z.object({submissionToken:z.string().min(32).max(2048),requestKey:z.string().uuid(),language:z.enum(['en','hi','ml'])}).strict().safeParse(raw)
    if(!parsed.success)throw new HttpError(400,'Invalid funnel-view receipt')
    const input=parsed.data
    return this.funnels.withPublicFunnel(code,async(db,f)=>{
      this.auth.feedbackTokens.verify(input.submissionToken,code,f.revision)
      const previous=(await select(db,"SELECT short_link_id,form_digest FROM billable_usage WHERE tenant_id=? AND metric='scan' AND request_key=?",[f.tenant_id,key(input.requestKey)]))[0]
      if(previous){if(previous.short_link_id!==f.link_id||!previous.form_digest.equals(hash(input.submissionToken)))throw new HttpError(409,'View receipt conflicts');return{recorded:true,created:false}}
      const sub=(await select(db,`SELECT *,${periodState} FROM subscriptions WHERE tenant_id=? AND current_slot=1 FOR UPDATE`,[f.tenant_id]))[0]
      if(!sub||!['active','trialing'].includes(sub.status)||Number(sub.period_elapsed)||Number(sub.period_scheduled)||Number(sub.period_ended))throw new HttpError(409,'Metering subscription unavailable')
      await approvedTerms(db,sub.plan_id)
      await db.execute("INSERT INTO billable_usage(tenant_id,subscription_id,branch_id,short_link_id,metric,request_key,form_digest,input_sha256,language,status,reserved_tokens,expires_at) VALUES (?,?,?,?,'scan',?,?,?,?,'complete',0,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 10 MINUTE))",[f.tenant_id,sub.id,f.branch_id,f.link_id,key(input.requestKey),hash(input.submissionToken),hash(code),input.language])
      return{recorded:true,created:true}
    })
  }
  async generate(code:string,raw:unknown){
    const parsed=draftInput.safeParse(raw);if(!parsed.success)throw new HttpError(400,'Invalid structured draft request')
    const input=parsed.data,provider=this.provider
    if(!provider)throw new HttpError(503,'AI generation is not configured; Google and private feedback remain independent')
    const inputHash=hash(JSON.stringify({language:input.language,rating:input.rating,tags:input.tags,complex:input.complex})),formHash=hash(input.submissionToken)
    const context=await this.funnels.withPublicFunnel(code,async(db,f)=>{
      this.auth.feedbackTokens.verify(input.submissionToken,code,f.revision)
      const old=(await select(db,'SELECT * FROM billable_usage WHERE tenant_id=? AND metric=\'ai_draft\' AND request_key=?',[f.tenant_id,key(input.requestKey)]))[0]
      if(old){if(!old.input_sha256.equals(inputHash)||!old.form_digest.equals(formHash)||old.short_link_id!==f.link_id)throw new HttpError(409,'Draft retry does not match its original request');if(old.status==='complete'&&new Date(old.expires_at)>new Date())return{cached:String(old.draft_text)};throw new HttpError(409,'Draft is pending, unavailable or requires reconciliation; it was not retried')}
      const subscription=(await select(db,`SELECT *,${periodKeys},${periodState} FROM subscriptions WHERE tenant_id=? AND current_slot=1 FOR UPDATE`,[f.tenant_id]))[0]
      if(!subscription||!['active','trialing'].includes(subscription.status)||Number(subscription.period_elapsed)||Number(subscription.period_scheduled)||Number(subscription.period_ended))throw new HttpError(409,'AI subscription is unavailable')
      const terms=await approvedTerms(db,subscription.plan_id)
      if(!terms.features.aiDrafts||!terms.features.languages.includes(input.language))throw new HttpError(403,'AI language is not enabled by the approved plan')
      const presentation=(await select(db,'SELECT seed_keywords FROM merchant_presentation WHERE tenant_id=?',[f.tenant_id]))[0]
      const seedKeywords=presentation?(typeof presentation.seed_keywords==='string'?JSON.parse(presentation.seed_keywords):presentation.seed_keywords):[]
      return{prompt:{language:input.language,rating:input.rating,tags:input.tags,merchant:f.merchant_name,industry:f.channel_code,complex:input.complex,seedKeywords} as DraftPrompt,subscriptionId:String(subscription.id)}
    })
    if('cached'in context)return{draft:context.cached,language:input.language,editable:true,posted:false}
    // Token counting and generation are outside every database transaction.
    const inputTokens=await provider.count(context.prompt),reservation=inputTokens+provider.maxOutput
    const id=await this.funnels.withPublicFunnel(code,async(db,f)=>{
      this.auth.feedbackTokens.verify(input.submissionToken,code,f.revision)
      const sub=(await select(db,`SELECT *,${periodState} FROM subscriptions WHERE tenant_id=? AND id=? AND current_slot=1 FOR UPDATE`,[f.tenant_id,context.subscriptionId]))[0]
      if(!sub||!['active','trialing'].includes(sub.status)||Number(sub.period_elapsed)||Number(sub.period_scheduled)||Number(sub.period_ended))throw new HttpError(409,'AI subscription changed before generation')
      if((await select(db,'SELECT id FROM billable_usage WHERE tenant_id=? AND metric=\'ai_draft\' AND request_key=?',[f.tenant_id,key(input.requestKey)])).length)throw new HttpError(409,'Draft already requested; retrieve the original request')
      const terms=await approvedTerms(db,sub.plan_id),usage=(await select(db,"SELECT COUNT(*) AS drafts,COALESCE(SUM(CASE WHEN status='complete' THEN input_tokens+output_tokens ELSE reserved_tokens END),0) AS tokens FROM billable_usage WHERE tenant_id=? AND subscription_id=? AND metric='ai_draft' AND status IN ('reserved','complete','unknown')",[f.tenant_id,sub.id]))[0]!
      if((terms.aiDraftAllowance!==null&&BigInt(usage.drafts)+1n>BigInt(terms.aiDraftAllowance))||(terms.aiTokenAllowance!==null&&BigInt(usage.tokens)+BigInt(reservation)>BigInt(terms.aiTokenAllowance)))throw new HttpError(409,'AI allowance unavailable for this request; Google and private feedback remain independent')
      await db.execute("INSERT INTO billable_usage(tenant_id,subscription_id,branch_id,short_link_id,metric,request_key,form_digest,input_sha256,language,status,reserved_tokens,expires_at) VALUES (?,?,?,?,'ai_draft',?,?,?,?,'reserved',?,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 10 MINUTE))",[f.tenant_id,sub.id,f.branch_id,f.link_id,key(input.requestKey),formHash,inputHash,input.language,String(reservation)])
      return String((await select(db,'SELECT id FROM billable_usage WHERE tenant_id=? AND metric=\'ai_draft\' AND request_key=?',[f.tenant_id,key(input.requestKey)]))[0]!.id)
    })
    let result:Awaited<ReturnType<ClaudeProvider['generate']>>
    try{result=await provider.generate(context.prompt)}catch(error){
      // Ambiguous provider failures retain the reservation. Never auto-replay a
      // request that may already have consumed provider tokens.
      await this.funnels.withPublicFunnel(code,async(db,f)=>{await db.execute("UPDATE billable_usage SET status='unknown' WHERE tenant_id=? AND id=? AND status='reserved'",[f.tenant_id,id])}).catch(()=>{})
      throw error
    }
    return this.funnels.withPublicFunnel(code,async(db,f)=>{
      this.auth.feedbackTokens.verify(input.submissionToken,code,f.revision)
      if(result.inputTokens+result.outputTokens>reservation)throw new HttpError(503,'AI usage exceeded its reservation; reconciliation is required')
      const row=(await select(db,"SELECT status FROM billable_usage WHERE tenant_id=? AND id=? FOR UPDATE",[f.tenant_id,id]))[0]
      if(!row||row.status!=='reserved')throw new HttpError(409,'Draft reservation unavailable')
      await db.execute("UPDATE billable_usage SET status='complete',input_tokens=?,output_tokens=?,draft_text=? WHERE tenant_id=? AND id=?",[String(result.inputTokens),String(result.outputTokens),result.text,f.tenant_id,id])
      await db.execute("INSERT INTO audit_logs(event_id,tenant_id,action,resource_type,resource_id,request_id,outcome,safe_metadata) VALUES (?,?,'ai.draft_generated','billable_usage',?,?,'success',?)",[randomBytes(16),f.tenant_id,id,randomBytes(16),JSON.stringify({language:input.language})])
      return{draft:result.text,language:input.language,editable:true,posted:false}
    })
  }
}
