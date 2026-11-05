import {z} from 'zod'
import type {PoolConnection} from 'mysql2/promise'
import {select} from '../auth/database.js'
import {HttpError} from '../middleware/error-handler.js'

export const whole=z.string().regex(/^(0|[1-9][0-9]{0,15})$/)
const allowance=whole.nullable() // NULL is explicit unlimited; absent never is.
const rate=z.string().regex(/^(0|[1-9][0-9]{0,7})\.[0-9]{6}$/)
export const commercialTerms=z.object({
  provider:z.literal('razorpay'),providerPlanId:z.string().regex(/^plan_[A-Za-z0-9]{1,48}$/),
  cycles:z.number().int().min(1).max(1200),
  scanAllowance:allowance,scanOveragePrice:rate,
  aiDraftAllowance:allowance,aiTokenAllowance:allowance,aiTokenOveragePrice:rate,
  overageRounding:z.enum(['ceil_minor','half_up_minor']),
  features:z.object({aiDrafts:z.boolean(),languages:z.array(z.enum(['en','hi','ml'])).min(1).max(3).refine(v=>new Set(v).size===v.length)}).strict(),
  invoice:z.object({issuerName:z.string().trim().min(1).max(160),issuerAddress:z.string().trim().min(1).max(500),gstin:z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/),state:z.string().regex(/^[0-9]{2}$/),prefix:z.string().regex(/^[A-Z0-9]{1,4}$/),taxRateBps:z.number().int().min(0).max(10000),priceIncludesTax:z.boolean()}).strict(),
}).strict().refine(t=>t.invoice.gstin.startsWith(t.invoice.state))
export type CommercialTerms=z.infer<typeof commercialTerms>
export const approvalInput=z.object({reference:z.string().trim().min(1).max(120),terms:commercialTerms}).strict()
export async function approvedTerms(db:PoolConnection,planId:string):Promise<CommercialTerms>{
  const row=(await select(db,'SELECT terms FROM commercial_approvals WHERE plan_id=?',[planId]))[0]
  if(!row)throw new HttpError(409,'Commercial terms are not approved')
  const parsed=commercialTerms.safeParse(typeof row.terms==='string'?JSON.parse(row.terms):row.terms)
  if(!parsed.success)throw new HttpError(409,'Commercial configuration is unavailable')
  return parsed.data
}
export const minor=(price:string)=>{if(!/^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/.test(price))throw new HttpError(409,'Invalid configured monetary amount');return BigInt(price.replace('.',''))}

export function overage(quantity:bigint,allowanceValue:string|null,price:string,rounding:CommercialTerms['overageRounding']){
  if(allowanceValue===null||quantity<=BigInt(allowanceValue))return 0n
  const micro=BigInt(price.replace('.',''))*(quantity-BigInt(allowanceValue))
  return (micro+(rounding==='ceil_minor'?9999n:5000n))/10000n
}
