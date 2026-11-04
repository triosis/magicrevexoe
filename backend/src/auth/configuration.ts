import { z } from 'zod'
import { createTransport } from 'nodemailer'
import type { Pool } from 'mysql2/promise'
import { AuthService, type TokenDelivery } from './service.js'

const secret = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/).refine(value=>{
  const key=Buffer.from(value,'base64')
  return key.byteLength>=32 && key.byteLength<=128 && key.toString('base64')===value
})
const smtp = z.object({
  AUTH_SMTP_HOST:z.string().min(1),AUTH_SMTP_PORT:z.coerce.number().int().refine(port=>[465,587].includes(port)),
  AUTH_SMTP_USER:z.string().min(1),AUTH_SMTP_PASSWORD:z.string().min(1),
  AUTH_MAIL_FROM:z.string().email(),AUTH_RECOVERY_URL:z.string().url().refine(value=>{
    const url=new URL(value)
    return url.protocol==='https:' && !url.username && !url.password && !url.hash && !url.search
  }),
})

export function configuredAuth(pool: Pool, environment: NodeJS.ProcessEnv): AuthService | undefined {
  if (!environment.AUTH_ACCESS_SECRET) return undefined
  const parsed=secret.safeParse(environment.AUTH_ACCESS_SECRET)
  if (!parsed.success) throw new Error('Invalid AUTH_ACCESS_SECRET configuration')
  let deliver: TokenDelivery | undefined
  let verifyDelivery: (()=>Promise<void>) | undefined
  const smtpNames=Object.keys(smtp.shape)
  if (smtpNames.some(name=>environment[name]!==undefined)) {
    const result=smtp.safeParse(environment)
    if (!result.success) throw new Error('Invalid authentication email configuration')
    const settings=result.data
    const transport=createTransport({host:settings.AUTH_SMTP_HOST,port:settings.AUTH_SMTP_PORT,secure:settings.AUTH_SMTP_PORT===465,
      requireTLS:true,auth:{user:settings.AUTH_SMTP_USER,pass:settings.AUTH_SMTP_PASSWORD},
      tls:{rejectUnauthorized:true},logger:false,debug:false,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000})
    verifyDelivery=async()=>{if(await transport.verify()!==true)throw new Error('Account email transport verification failed')}
    deliver=async message=>{
      const url=new URL(settings.AUTH_RECOVERY_URL)
      // Fragment avoids tokens in web-server query/access logs. The future
      // recovery page must remove it before loading third-party resources.
      url.hash=new URLSearchParams({token:message.token,purpose:message.purpose}).toString()
      const result=await transport.sendMail({from:settings.AUTH_MAIL_FROM,to:message.email,subject:message.purpose==='invite'?'MagicReview AI account invitation':'MagicReview AI account recovery',
        text:`Use this single-use link to continue: ${url.toString()}\nIf you did not request this, ignore this message.`})
      if (!result.accepted?.length || result.rejected?.length) throw new Error('Account email was not accepted by transport')
    }
  }
  return new AuthService(pool,Buffer.from(parsed.data,'base64'),deliver,verifyDelivery)
}
