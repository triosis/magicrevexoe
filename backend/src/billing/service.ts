import {createHash,randomBytes} from 'node:crypto'
import {z} from 'zod'
import type {Pool,PoolConnection} from 'mysql2/promise'
import type {Principal} from '../auth/authorization.js'
import {select,transaction,lockPlatform} from '../auth/database.js'
import type {TenantService,TenantActor} from '../tenants/service.js'
import type {SubscriptionService} from '../subscriptions/service.js'
import {HttpError} from '../middleware/error-handler.js'
import {approvedTerms,minor,overage} from './terms.js'
import {RazorpayProvider,providerSubscription,payment} from './provider.js'
import {requireFinancialApproval,financialReadiness} from './approval.js'

const checkout=z.object({planId:z.string().regex(/^[1-9][0-9]{0,19}$/),requestKey:z.string().uuid()}).strict()
const key=(value:string)=>Buffer.from(value.replaceAll('-',''),'hex')
const conflict=(message:string):never=>{throw new HttpError(409,message)}
export class BillingService{
 constructor(private readonly pool:Pool,private readonly tenants:TenantService,private readonly subscriptions:SubscriptionService,private readonly provider?:RazorpayProvider){}
 private async owner(db:PoolConnection,actor:TenantActor,id:string){
  const account=await this.tenants.authorizedAccount(db,actor,id,'subscription.read')
  if(account.kind!=='merchant'||!Number(account.effective))throw new HttpError(403,'Active merchant required')
  if(!((actor.member.kind==='platform'&&actor.member.roleCode==='super_admin')||(actor.member.tenantId===id&&actor.member.roleCode==='merchant_admin')))throw new HttpError(403,'Access denied')
  return account
 }
 async history(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>{await this.owner(db,actor,id);return{financialReadiness,items:await select(db,'SELECT id,plan_id AS planId,status,last_period_end AS periodEnd,created_at AS createdAt FROM billing_agreements WHERE tenant_id=? ORDER BY id DESC LIMIT 50',[id])}},true)}
 async invoicePreparation(principal:Principal,id:string,agreementId:string){return this.tenants.withActor(principal,async(db,actor)=>{
  await this.owner(db,actor,id)
  const agreement=(await select(db,'SELECT a.id,a.plan_id,p.name,p.version,p.price,p.currency,p.interval_unit FROM billing_agreements a JOIN subscription_plans p ON p.id=a.plan_id WHERE a.tenant_id=? AND a.id=?',[id,agreementId]))[0]
  if(!agreement)throw new HttpError(404,'Billing agreement not found')
  const terms=await approvedTerms(db,agreement.plan_id)
  const receipts=await select(db,'SELECT id AS receiptId,payment_id AS paymentReference,created_at AS receivedAt FROM billing_events WHERE tenant_id=? AND agreement_id=? AND payment_id IS NOT NULL ORDER BY id DESC LIMIT 50',[id,agreementId])
  // Data preparation only: no invented recipient, tax split, sequence or financial document.
  return{status:'not_issuable',financialDocument:false,issued:false,agreementId:agreement.id,plan:{id:agreement.plan_id,name:agreement.name,version:agreement.version,configuredPrice:agreement.price,currency:agreement.currency,interval:agreement.interval_unit},configuredIssuer:terms.invoice,verifiedPaymentReceipts:receipts,recipient:null,invoiceNumber:null,taxBreakdown:null,amountDue:null,missingApprovals:['written_finance_reviewed_billing_settlement_gst_policy','merchant_legal_identity_and_billing_address','gstin_and_place_of_supply_determination','financial_year_and_entity_invoice_sequence','tax_treatment_and_rounding','refund_and_credit_note_policy'],settlement:'disabled'}
 },true)}
 async metering(principal:Principal,id:string){return this.tenants.withActor(principal,async(db,actor)=>{
  await this.owner(db,actor,id)
  const sub=(await select(db,'SELECT id,plan_id FROM subscriptions WHERE tenant_id=? AND current_slot=1',[id]))[0]
  if(!sub)return{availability:'no_subscription',settlement:'not_charged'}
  const terms=await approvedTerms(db,sub.plan_id),usage=(await select(db,"SELECT COALESCE(SUM(metric='scan'),0) AS views,COALESCE(SUM(metric='ai_draft' AND status='complete'),0) AS drafts,COALESCE(SUM(CASE WHEN metric='ai_draft' AND status='complete' THEN input_tokens+output_tokens ELSE 0 END),0) AS tokens,COALESCE(SUM(CASE WHEN metric='ai_draft' AND status IN ('reserved','unknown') THEN reserved_tokens ELSE 0 END),0) AS pending FROM billable_usage WHERE tenant_id=? AND subscription_id=?",[id,sub.id]))[0]!
  return{availability:'available',subscriptionId:sub.id,recordedViews:String(usage.views),completedDrafts:String(usage.drafts),completedTokens:String(usage.tokens),unresolvedTokenReservations:String(usage.pending),estimatedOverageMinor:{views:overage(BigInt(usage.views),terms.scanAllowance,terms.scanOveragePrice,terms.overageRounding).toString(),tokens:overage(BigInt(usage.tokens),terms.aiTokenAllowance,terms.aiTokenOveragePrice,terms.overageRounding).toString()},settlement:'not_charged',viewDefinition:'signed browser funnel-view receipt; not a verified physical QR scan'}
 },true)}
 async cancel(principal:Principal,id:string,agreementId:string,raw:unknown){
  const input=z.object({atCycleEnd:z.boolean()}).strict().safeParse(raw);if(!input.success)throw new HttpError(400,'Cancellation timing must be explicit')
  const provider=this.provider;if(!provider)throw new HttpError(503,'Payment provider is not configured')
  const agreement=await this.tenants.withActor(principal,async(db,actor)=>{
   await this.owner(db,actor,id)
   const row=(await select(db,'SELECT id,provider_id,status FROM billing_agreements WHERE tenant_id=? AND id=? FOR UPDATE',[id,agreementId]))[0]
   if(!row||!row.provider_id||!['ready','active','pending','halted'].includes(row.status))return conflict('Agreement cancellation requires reconciliation')
   // Reserve before network I/O. Ambiguous failure cannot issue a second cancellation.
   await db.execute("UPDATE billing_agreements SET status='unknown' WHERE tenant_id=? AND id=?",[id,agreementId])
   await this.tenants.auditChange(db,actor,id,'billing.cancellation_requested',{atCycleEnd:input.data.atCycleEnd},'billing_agreement',agreementId)
   return{providerId:String(row.provider_id)}
  })
  const result=providerSubscription.safeParse(await provider.call('subscriptions/'+agreement.providerId+'/cancel','POST',{cancel_at_cycle_end:input.data.atCycleEnd?1:0}))
  if(!result.success||result.data.id!==agreement.providerId)throw new HttpError(503,'Cancellation response requires reconciliation')
  return this.tenants.withActor(principal,async(db,actor)=>{await this.owner(db,actor,id)
   await db.execute("UPDATE billing_agreements SET status='canceled' WHERE tenant_id=? AND id=?",[id,agreementId])
   // Cancel renewal without silently discarding an already paid local allocation.
   await this.tenants.auditChange(db,actor,id,'billing.renewal_canceled',{atCycleEnd:input.data.atCycleEnd},'billing_agreement',agreementId)
   return{renewalCanceled:true,paidAccessEndsWithAllocatedPeriod:true}
  })
 }
 async checkout(principal:Principal,id:string,raw:unknown){
  if(!this.provider)throw new HttpError(503,'Payment provider is not configured')
  const parsed=checkout.safeParse(raw);if(!parsed.success)throw new HttpError(400,'Invalid checkout request')
  const input=parsed.data,provider=this.provider
  const reservation=await this.tenants.withActor(principal,async(db,actor)=>{
   await this.owner(db,actor,id)
   requireFinancialApproval()
   const existing=(await select(db,'SELECT id,plan_id,status,checkout_url FROM billing_agreements WHERE tenant_id=? AND request_key=?',[id,key(input.requestKey)]))[0]
   if(existing){if(existing.plan_id!==input.planId)conflict('Checkout key conflicts');if(existing.status==='ready'&&existing.checkout_url)return{existing:true as const,url:String(existing.checkout_url)};return conflict('Checkout requires reconciliation; no payment request was repeated')}
   if((await select(db,"SELECT id FROM billing_agreements WHERE tenant_id=? AND status NOT IN ('canceled','completed') LIMIT 1",[id])).length)conflict('An existing billing agreement requires resolution')
   if((await select(db,"SELECT id FROM subscriptions WHERE tenant_id=? AND current_slot=1 AND current_period_end>UTC_TIMESTAMP(6) AND (ends_at IS NULL OR ends_at>UTC_TIMESTAMP(6)) LIMIT 1",[id])).length)conflict('An allocated period already exists; resolve its renewal before a new checkout')
   const plan=(await select(db,"SELECT price,currency,interval_unit FROM subscription_plans WHERE id=? AND status='published'",[input.planId]))[0]
   if(!plan||minor(plan.price)===0n)return conflict('An approved paid plan is required')
   const terms=await approvedTerms(db,input.planId)
   // Tax-exclusive and overage settlement are not silently converted to a flat charge.
   if(!terms.invoice.priceIncludesTax)conflict('Tax-exclusive checkout requires an approved tax settlement workflow')
   await db.execute("INSERT INTO billing_agreements(tenant_id,plan_id,request_key,status) VALUES (?,?,?,'creating')",[id,input.planId,key(input.requestKey)])
   const row=(await select(db,'SELECT id FROM billing_agreements WHERE tenant_id=? AND request_key=?',[id,key(input.requestKey)]))[0]!
   await this.tenants.auditChange(db,actor,id,'billing.checkout_reserved',{},'billing_agreement',row.id)
   return{existing:false as const,id:String(row.id),plan,terms}
  })
  if(reservation.existing)return{checkoutUrl:reservation.url}
  try{
   const remote=z.object({id:z.string(),period:z.string(),interval:z.literal(1),item:z.object({amount:z.number().int().nonnegative(),currency:z.string()})}).parse(await provider.call('plans/'+reservation.terms.providerPlanId))
   if(remote.id!==reservation.terms.providerPlanId||remote.period!==(reservation.plan.interval_unit==='month'?'monthly':'yearly')||BigInt(remote.item.amount)!==minor(reservation.plan.price)||remote.item.currency!==reservation.plan.currency)conflict('Provider plan does not match approved commercial terms')
   const result=providerSubscription.parse(await provider.call('subscriptions','POST',{plan_id:remote.id,total_count:reservation.terms.cycles,quantity:1,customer_notify:false,notes:{agreement_id:reservation.id}}))
   if(result.plan_id!==remote.id||!result.short_url)throw new HttpError(503,'Payment response requires reconciliation')
   const url=new URL(result.short_url);if(url.protocol!=='https:'||url.hostname!=='rzp.io'||url.username||url.password||url.hash)throw new HttpError(503,'Invalid payment checkout destination')
   await this.tenants.withActor(principal,async(db,actor)=>{await this.owner(db,actor,id);await db.execute("UPDATE billing_agreements SET provider_id=?,checkout_url=?,status='ready' WHERE tenant_id=? AND id=? AND status='creating'",[result.id,url.href,id,reservation.id]);await this.tenants.auditChange(db,actor,id,'billing.checkout_ready',{},'billing_agreement',reservation.id)})
   return{checkoutUrl:url.href}
  }catch(error){await transaction(this.pool,async db=>{await lockPlatform(db);await db.execute("UPDATE billing_agreements SET status='unknown' WHERE tenant_id=? AND id=? AND status='creating'",[id,reservation.id])}).catch(()=>{});throw error instanceof HttpError?error:new HttpError(503,'Payment operation requires reconciliation; no automatic retry')}
 }
 async webhook(raw:Buffer,signature:string,eventId:string){
  const provider=this.provider;if(!provider)throw new HttpError(503,'Payment provider is not configured')
  if(!provider.signature(raw,signature))throw new HttpError(401,'Invalid payment signature')
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(eventId))throw new HttpError(400,'Invalid payment event identifier')
  let body:unknown;try{body=JSON.parse(raw.toString('utf8'))}catch{throw new HttpError(400,'Invalid payment event')}
  const event=z.object({event:z.string().max(64),payload:z.object({subscription:z.object({entity:providerSubscription}),payment:z.object({entity:payment}).optional()})}).safeParse(body)
  if(!event.success)throw new HttpError(400,'Invalid subscription event')
  const data=event.data,sub=data.payload.subscription.entity,digest=createHash('sha256').update(raw).digest()
  if(data.event!=='subscription.charged')return{accepted:true,allocation:false}
  const paid=data.payload.payment?.entity;if(!paid||!sub.current_start||!sub.current_end)throw new HttpError(400,'Captured payment period required')
  const verified=payment.parse(await provider.call('payments/'+paid.id))
  const invoice=z.object({id:z.string(),subscription_id:z.string(),payment_id:z.string(),status:z.literal('paid')}).parse(await provider.call('invoices/'+verified.invoice_id))
  if(invoice.id!==verified.invoice_id||invoice.subscription_id!==sub.id||invoice.payment_id!==verified.id||verified.id!==paid.id||verified.amount!==paid.amount||verified.currency!==paid.currency)throw new HttpError(400,'Payment binding mismatch')
  return transaction(this.pool,async db=>{
   await lockPlatform(db)
   const existing=(await select(db,'SELECT payload_sha256 FROM billing_events WHERE event_key=?',[eventId]))[0]
   if(existing){if(!Buffer.from(existing.payload_sha256).equals(digest))conflict('Event identifier conflicts');return{accepted:true,duplicate:true}}
   if((await select(db,'SELECT id FROM billing_events WHERE payment_id=?',[verified.id])).length)return{accepted:true,duplicate:true}
   const agreement=(await select(db,'SELECT a.*,p.price,p.currency FROM billing_agreements a JOIN subscription_plans p ON p.id=a.plan_id WHERE a.provider_id=? FOR UPDATE',[sub.id]))[0]
   if(!agreement)return conflict('Unknown payment agreement requires reconciliation')
   const terms=await approvedTerms(db,agreement.plan_id)
   if(sub.plan_id!==terms.providerPlanId||BigInt(verified.amount)!==minor(agreement.price)||verified.currency!==agreement.currency)conflict('Payment does not match approved plan')
   await db.query('SAVEPOINT allocation')
   let allocated=true
   try{await this.subscriptions.allocateVerifiedPayment(db,agreement.tenant_id,agreement.plan_id,new Date(sub.current_start!*1000),new Date(sub.current_end!*1000))}catch(error){if(!(error instanceof HttpError)||error.status!==409)throw error;await db.query('ROLLBACK TO SAVEPOINT allocation');allocated=false}
   await db.execute('INSERT INTO billing_events(tenant_id,agreement_id,event_key,payment_id,event_type,payload_sha256) VALUES (?,?,?,?,?,?)',[agreement.tenant_id,agreement.id,eventId,verified.id,data.event,digest])
   await db.execute("UPDATE billing_agreements SET status=?,last_period_end=GREATEST(COALESCE(last_period_end,'1000-01-01'),?) WHERE id=?",[allocated?'active':'unknown',new Date(sub.current_end!*1000),agreement.id])
   await db.execute("INSERT INTO audit_logs(event_id,tenant_id,action,resource_type,resource_id,request_id,outcome,safe_metadata) VALUES (?,?,'billing.payment_received','billing_agreement',?,?,'success',?)",[randomBytes(16),agreement.tenant_id,agreement.id,randomBytes(16),JSON.stringify({allocated,reconciliationRequired:!allocated})])
   return{accepted:true,allocation:allocated}
  })
 }
}
