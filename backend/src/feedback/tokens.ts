import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto'
import {z} from 'zod'
import {HttpError} from '../middleware/error-handler.js'
import {shortCode} from '../funnels/validation.js'

const claims=z.object({code:shortCode,revision:z.number().int().positive(),nonce:z.string().regex(/^[A-Za-z0-9_-]{22}$/),expiresAt:z.number().int().positive()}).strict()
export class FeedbackTokens{
 private readonly key:Buffer
 constructor(key:Uint8Array,private readonly now=Date.now){this.key=createHmac('sha256',key).update('magicreview:private-feedback:v1').digest()}
 issue(code:string,revision:number){
  const value=claims.parse({code,revision,nonce:randomBytes(16).toString('base64url'),expiresAt:Math.floor(this.now()/1000)+900})
  const payload=Buffer.from(JSON.stringify(value)).toString('base64url')
  return{token:payload+'.'+this.mac(payload).toString('base64url'),expiresAt:new Date(value.expiresAt*1000).toISOString()}
 }
 private mac(payload:string){return createHmac('sha256',this.key).update(payload).digest()}
 verify(token:string,code:string,revision:number){
  try{
   if(token.length>512||!/^[-A-Za-z0-9_]+\.[-A-Za-z0-9_]{43}$/.test(token))throw Error()
   const [payload,signature]=token.split('.') as [string,string],actual=Buffer.from(signature,'base64url'),expected=this.mac(payload)
   if(actual.length!==expected.length||actual.toString('base64url')!==signature||!timingSafeEqual(actual,expected))throw Error()
   const value=claims.parse(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')))
   if(value.code!==code||value.revision!==revision||value.expiresAt<=Math.floor(this.now()/1000)||value.expiresAt>Math.floor(this.now()/1000)+900)throw Error()
   return value
  }catch{throw new HttpError(400,'Invalid or expired submission token')}
 }
}
