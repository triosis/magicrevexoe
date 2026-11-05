import {createHmac,timingSafeEqual} from 'node:crypto'
import {z} from 'zod'
import {HttpError} from '../middleware/error-handler.js'
const config=z.object({RAZORPAY_MODE:z.enum(['test','live']),RAZORPAY_KEY_ID:z.string().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/),RAZORPAY_KEY_SECRET:z.string().min(20).max(256),RAZORPAY_WEBHOOK_SECRET:z.string().min(32).max(256)})
const integer=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const providerSubscription=z.object({id:z.string().regex(/^sub_[A-Za-z0-9]+$/),plan_id:z.string().regex(/^plan_[A-Za-z0-9]+$/),status:z.enum(['created','authenticated','active','pending','halted','cancelled','completed','expired','paused']),current_start:integer.max(253402300799).nullable().optional(),current_end:integer.max(253402300799).nullable().optional(),short_url:z.string().nullable().optional()})
export const payment=z.object({id:z.string().regex(/^pay_[A-Za-z0-9]+$/),status:z.literal('captured'),amount:integer,currency:z.string().regex(/^[A-Z]{3}$/),invoice_id:z.string().regex(/^inv_[A-Za-z0-9]+$/)})
export class RazorpayProvider{
 constructor(private readonly settings:z.infer<typeof config>,private readonly transport:typeof fetch=fetch){}
 get mode(){return this.settings.RAZORPAY_MODE}
 signature(raw:Buffer,signature:string){if(!/^[a-f0-9]{64}$/i.test(signature))return false;return timingSafeEqual(createHmac('sha256',this.settings.RAZORPAY_WEBHOOK_SECRET).update(raw).digest(),Buffer.from(signature,'hex'))}
 async call(path:string,method='GET',body?:unknown):Promise<unknown>{
  if(!/^(?:plans\/plan_[A-Za-z0-9]+|subscriptions(?:\/sub_[A-Za-z0-9]+(?:\/cancel)?)?|payments\/pay_[A-Za-z0-9]+|invoices\/inv_[A-Za-z0-9]+)$/.test(path))throw new HttpError(400,'Invalid payment operation')
  try{
   const response=await this.transport('https://api.razorpay.com/v1/'+path,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Basic '+Buffer.from(this.settings.RAZORPAY_KEY_ID+':'+this.settings.RAZORPAY_KEY_SECRET).toString('base64'),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
   if(!response.ok||!response.body)throw Error()
   const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let result='',size=0
   try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>65536)throw Error();result+=decoder.decode(part.value,{stream:true})}result+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
   return JSON.parse(result)
  }catch{throw new HttpError(503,'Payment provider unavailable; the operation was not automatically retried')}
 }
}
export function configuredRazorpay(environment:NodeJS.ProcessEnv){
 if(!Object.keys(config.shape).some(k=>environment[k]!==undefined))return undefined
 const parsed=config.safeParse(environment)
 if(!parsed.success||!parsed.data.RAZORPAY_KEY_ID.startsWith('rzp_'+parsed.data.RAZORPAY_MODE+'_')||parsed.data.RAZORPAY_KEY_SECRET===parsed.data.RAZORPAY_WEBHOOK_SECRET)throw Error('Invalid Razorpay configuration')
 if(parsed.data.RAZORPAY_MODE==='live'&&environment.BILLING_LIVE_APPROVAL!=='OWNER_APPROVED_LIVE_BILLING')throw Error('Explicit owner live-billing approval required')
 return new RazorpayProvider(parsed.data)
}
