import {z} from 'zod'
import {identifier} from '../auth/tokens.js'
import {version} from '../business/validation.js'
export const status=z.enum(['new','in_progress','resolved','dismissed','archived'])
const rating=z.number().int().min(1).max(5)
export const submission=z.object({submissionToken:z.string().min(1).max(512),overallRating:rating,serviceRating:rating.optional(),cleanlinessRating:rating.optional(),waitingTimeRating:rating.optional(),language:z.enum(['en','hi','ml']).optional()}).strict()
export type Submission=z.infer<typeof submission>
const timestamp=z.string().datetime({offset:true}).transform(value=>new Date(value))
const filters={merchantId:identifier.optional(),branchId:identifier.optional(),status:status.optional(),from:timestamp.optional(),to:timestamp.optional()}
const validDates=(v:{from?:Date|undefined;to?:Date|undefined})=>!v.from||!v.to||v.from<v.to
export const filter=z.object(filters).strict().refine(validDates)
export type Filter=z.infer<typeof filter>
export const listInput=z.object({...filters,afterId:identifier.optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict().refine(validDates)
export const statusInput=z.object({status,reasonCode:z.enum(['triage','follow_up','completed','spam','duplicate','reopened']),lockVersion:version}).strict()
export type StatusInput=z.infer<typeof statusInput>
export function validTransition(from:string,to:string,reason:string){
 if(to==='archived')return from==='resolved'&&reason==='completed'
 if(from===to)return false
 if(to==='in_progress'&&(from==='new'||from==='resolved'||from==='dismissed'))return reason===(from==='new'?'triage':'reopened')
 if(from==='in_progress'&&to==='new')return reason==='follow_up'
 if((from==='new'||from==='in_progress')&&to==='resolved')return reason==='completed'
 if((from==='new'||from==='in_progress')&&to==='dismissed')return reason==='spam'||reason==='duplicate'
 return false
}
