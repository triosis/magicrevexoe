import {z} from 'zod'
import {randomBytes} from 'node:crypto'
import {identifier} from '../auth/tokens.js'

export const shortCode=z.string().regex(/^[A-Za-z0-9_-]{22}$/)
export const newShortCode=()=>randomBytes(16).toString('base64url')
export const funnelInput=z.object({channelVersionId:identifier,brandTitle:z.string().trim().min(1).max(120),accentHex:z.string().regex(/^#[0-9a-fA-F]{6}$/),locale:z.enum(['en'])}).strict()
export const linkInput=z.object({funnelId:identifier}).strict()
export const qrInput=z.object({shortLinkId:identifier,format:z.enum(['svg','png']).default('svg'),regenerate:z.boolean().default(false)}).strict()
export const eventInput=z.object({event:z.enum(['google_option_selected','private_feedback_option_selected'])}).strict()
export const empty=z.object({}).strict()
export function publicOrigin(value:string):string{
 try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password&&u.origin===value)return value}catch{}
 throw new Error('PUBLIC_FUNNEL_ORIGIN must be an exact HTTPS origin')
}
