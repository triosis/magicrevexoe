import {z} from 'zod'
import {HttpError} from '../middleware/error-handler.js'
import {identifier} from '../auth/tokens.js'

export function validTimezone(value:string):boolean{
 if(!/^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)$/.test(value))return false
 try{new Intl.DateTimeFormat('en-US',{timeZone:value});return true}catch{return false}
}
export function canonicalTimezone(value:string):string{
 if(!validTimezone(value))throw new HttpError(400,'Invalid branch timezone')
 return new Intl.DateTimeFormat('en-US',{timeZone:value}).resolvedOptions().timeZone
}
export function googleReviewUrl(placeId:string):string{
 if(!/^[A-Za-z0-9_-]{1,255}$/.test(placeId))throw new HttpError(400,'Invalid Google destination')
 return 'https://search.google.com/local/writereview?placeid='+placeId
}
export function destinationInput(placeId:string,reviewUrl?:string):string{
 const canonical=googleReviewUrl(placeId)
 if(reviewUrl!==undefined&&reviewUrl!==canonical)throw new HttpError(400,'Invalid Google destination')
 return canonical
}
export const version=z.number().int().positive().max(4294967294)
export const page=z.object({afterId:identifier.optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict()
const timezone=z.string().max(64).refine(validTimezone)
const code=z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const name=z.string().trim().min(1).max(160)
export const branchCreate=z.object({code,name,timezone,address:z.string().trim().max(500).nullable().optional()}).strict()
export const branchUpdate=branchCreate.partial().extend({lockVersion:version}).strict().refine(v=>Object.keys(v).some(k=>k!=='lockVersion'))
export const statusInput=z.object({lockVersion:version}).strict()
const destinationFields=z.object({placeId:z.string().regex(/^[A-Za-z0-9_-]{1,255}$/),reviewUrl:z.string().max(2048).optional()}).strict()
const validDestination=(v:{placeId:string;reviewUrl?:string|undefined})=>v.reviewUrl===undefined||(/^[A-Za-z0-9_-]{1,255}$/.test(v.placeId)&&v.reviewUrl===googleReviewUrl(v.placeId))
export const destinationCreate=destinationFields.refine(validDestination)
export const destinationUpdate=destinationFields.extend({lockVersion:version}).strict().refine(validDestination)
export const merchantUpdate=z.object({name,lockVersion:version}).strict()
export const merchantCreate=z.object({parentId:identifier,name,industryChannelCode:z.enum(['salon_spa','clinic_healthcare','restaurant_cafe']),invitation:z.object({email:z.string().trim().email().max(254),displayName:z.string().trim().min(1).max(120)}).strict()}).strict()
export const channelUpdate=z.object({name:z.string().trim().min(1).max(100).optional(),status:z.enum(['active','retired']).optional()}).strict().refine(v=>Object.keys(v).length>0)
export const channelVersionCreate=z.object({version,displayName:z.string().trim().min(1).max(120),title:z.string().trim().min(1).max(120)}).strict()
export const channelVersionUpdate=channelVersionCreate.omit({version:true}).partial().strict().refine(v=>Object.keys(v).length>0)
export const empty=z.object({}).strict()
export function parse<T>(schema:z.ZodType<T>,value:unknown):T{const result=schema.safeParse(value);if(!result.success)throw new HttpError(400,'Invalid request');return result.data}
