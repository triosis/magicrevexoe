import {z} from 'zod'
import {identifier} from '../auth/tokens.js'
import {version} from '../business/validation.js'
export const metrics=['branches','staff_seats','feedback_submissions','short_links','qr_assets'] as const
export type Metric=typeof metrics[number]
export const metric=z.enum(metrics)
export const status=z.enum(['trialing','active','past_due','canceled','expired'])
export type Status=z.infer<typeof status>
const instant=z.string().datetime({offset:true}).refine(s=>!/[.]\d{4,}/.test(s)&&new Date(s).getUTCFullYear()>=1000).transform(s=>new Date(s))
export const assignment=z.object({planId:identifier,periodStart:instant.optional(),periodEnd:instant,status:z.enum(['trialing','active']).default('active')}).strict()
export type Assignment=z.infer<typeof assignment>
export const statusChange=z.object({status,lockVersion:version}).strict()
export const empty=z.object({}).strict()
export const historyInput=z.object({afterId:identifier.optional(),limit:z.coerce.number().int().min(1).max(100).default(50),metric:metric.optional(),subscriptionId:identifier.optional()}).strict()
export type HistoryInput=z.infer<typeof historyInput>
export const periodKeys="DATE_FORMAT(current_period_start,'%Y-%m-%d %H:%i:%s.%f') AS period_start_key,DATE_FORMAT(current_period_end,'%Y-%m-%d %H:%i:%s.%f') AS period_end_key"
export const periodState="current_period_end<=UTC_TIMESTAMP(6) AS period_elapsed,(current_period_start>UTC_TIMESTAMP(6) OR starts_at>UTC_TIMESTAMP(6)) AS period_scheduled,(ends_at IS NOT NULL AND ends_at<=UTC_TIMESTAMP(6)) AS period_ended,DATE_FORMAT(starts_at,'%Y-%m-%d %H:%i:%s.%f') AS starts_key"
export const dateKey=(date:Date)=>date.toISOString().replace('T',' ').replace('Z','')+'000'
export function transition(from:Status,to:Status){return from!==to&&!['canceled','expired'].includes(from)&&(['active','past_due','canceled','expired'].includes(to))&&(to!=='active'||from==='trialing'||from==='past_due')}
export function quota(used:string|null,limit:string|null|undefined){
 if(used===null||limit===undefined)return{remaining:null,overLimit:null}
 if(limit===null)return{remaining:null,overLimit:false}
 const difference=BigInt(limit)-BigInt(used)
 return{remaining:(difference>0n?difference:0n).toString(),overLimit:difference<0n}
}
