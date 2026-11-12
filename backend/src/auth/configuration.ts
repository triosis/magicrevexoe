import { z } from 'zod'
import { configuredSmtp } from './smtp.js'
import type { Pool } from 'mysql2/promise'
import { AuthService, type TokenDelivery } from './service.js'
import {platformOwnerEmail} from '../config/platform-owner.js'

const secret = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/).refine(value=>{
  const key=Buffer.from(value,'base64')
  return new Set(key).size>=16 && key.byteLength>=32 && key.byteLength<=128 && key.toString('base64')===value
})
export function configuredAuth(pool: Pool, environment: NodeJS.ProcessEnv): AuthService | undefined {
  const passwordOnly=environment.AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL
  if(passwordOnly!==undefined&&passwordOnly!==platformOwnerEmail)throw Error('Invalid AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL configuration')
  if (!environment.AUTH_ACCESS_SECRET) {if(environment.NODE_ENV==='production')throw Error('Missing authentication configuration');return undefined}
  const parsed=secret.safeParse(environment.AUTH_ACCESS_SECRET)
  if (!parsed.success) throw new Error('Invalid AUTH_ACCESS_SECRET configuration')
  let mfaKey:Buffer|undefined
  if(environment.AUTH_MFA_KEY){const result=secret.safeParse(environment.AUTH_MFA_KEY);if(!result.success||Buffer.from(result.data,'base64').length!==32||result.data===parsed.data)throw Error('Invalid AUTH_MFA_KEY configuration');mfaKey=Buffer.from(result.data,'base64')}
  else if(environment.NODE_ENV==='production')throw Error('Missing AUTH_MFA_KEY configuration')
  const smtp = configuredSmtp(environment)
  const deliver: TokenDelivery | undefined = smtp?.send
  const verifyDelivery = smtp?.verify
  return new AuthService(pool,Buffer.from(parsed.data,'base64'),deliver,verifyDelivery,mfaKey,passwordOnly)
}
