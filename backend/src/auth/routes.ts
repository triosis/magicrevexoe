import { Router, type RequestHandler } from 'express'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { HttpError } from '../middleware/error-handler.js'
import { AuthService, normalizeEmail } from './service.js'
import { identifier, opaque } from './tokens.js'
import { principalFrom } from './authorization.js'

export class RateLimiter {
  private readonly entries = new Map<string,{count:number;until:number}>()
  constructor(private readonly now = Date.now, private readonly capacity = 10000) {}
  consume(key: string, maximum: number, windowMs = 15*60_000): void {
    const now = this.now()
    const digest = createHash('sha256').update(key).digest('hex')
    let entry = this.entries.get(digest)
    if (entry && entry.until<=now) { this.entries.delete(digest); entry=undefined }
    if (!entry) {
      if (this.entries.size>=this.capacity) for (const [key,value] of this.entries) if (value.until<=now) this.entries.delete(key)
      if (this.entries.size>=this.capacity) throw new HttpError(429,'Too many requests')
      entry={count:0,until:now+windowMs};this.entries.set(digest,entry)
    }
    if (++entry.count>maximum) throw new HttpError(429,'Too many requests')
  }
}
const email = z.string().trim().email().max(254).transform(normalizeEmail)
const password = z.string().min(12).max(128)
const login = z.object({email,password:z.string().min(1).max(128)}).strict()
const refresh = z.object({refreshToken:opaque}).strict()
const selectTenant = z.object({membershipId:identifier}).strict()
const recovery = z.object({email}).strict()
const consume = z.object({token:opaque,password}).strict()
function body<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new HttpError(400,'Invalid request')
  return result.data
}

export function authRoutes(service?: AuthService) {
  const router=Router()
  const limiter=new RateLimiter()
  router.use((_request,response,next)=>{response.set('Cache-Control','no-store');response.set('Pragma','no-cache');next()})
  if (!service) {
    router.use((_request,_response)=>{throw new HttpError(503,'Authentication temporarily unavailable')})
    return router
  }
  const limit: RequestHandler = (request,response,next)=>{
    // trust proxy is deliberately disabled; untrusted X-Forwarded-For is ignored.
    try { limiter.consume(`ip:${request.ip ?? request.socket.remoteAddress}`,60) }
    catch(error) {response.set('Retry-After','900');throw error}
    next()
  }
  router.use(limit)
  const authenticated=service.authentication()
  router.post('/login',async(request,response)=>{
    const input=body(login,request.body)
    try {
      limiter.consume(`login-ip:${request.ip}`,20)
      limiter.consume(`login-email:${input.email}`,10)
    } catch(error) {response.set('Retry-After','900');throw error}
    response.json(await service.login(input.email,input.password))
  })
  const factor=z.string().regex(/^(?:[0-9]{6}|[A-Za-z0-9_-]{32})$/)
  const challengeInput=z.object({challengeToken:opaque,code:factor}).strict()
  router.post('/mfa/enrollment',async(request,response)=>{
    const input=body(z.object({challengeToken:opaque}).strict(),request.body)
    response.type('png').send(await service.enrollMfa(input.challengeToken))
  })
  for(const [path,enroll] of [['/mfa/activate',true],['/mfa/verify',false]] as const)router.post(path,async(request,response)=>{
    const input=body(challengeInput,request.body)
    response.json(await service.verifyMfa(input.challengeToken,input.code,enroll))
  })
  for(const [path,disable] of [['/mfa/disable',true],['/mfa/recovery-codes',false]] as const)router.post(path,authenticated,async(request,response)=>{
    const input=body(z.object({password:z.string().min(1).max(128),code:factor}).strict(),request.body)
    response.json(await service.manageMfa(principalFrom(response.locals),input.password,input.code,disable))
  })
  router.post('/refresh',async(request,response)=>{
    const input=body(refresh,request.body)
    response.json(await service.refresh(input.refreshToken))
  })
  router.post('/logout',authenticated,async(_request,response)=>{
    await service.logout(principalFrom(response.locals));response.sendStatus(204)
  })
  router.post('/select-tenant',authenticated,async(request,response)=>{
    const input=body(selectTenant,request.body)
    response.json(await service.selectTenant(principalFrom(response.locals),input.membershipId))
  })
  router.get('/me',authenticated,async(_request,response)=>{response.json(await service.me(principalFrom(response.locals)))})
  router.post('/forgot-password',async(request,response)=>{
    const input=body(recovery,request.body)
    try {limiter.consume(`recovery:${input.email}`,5)}catch(error){response.set('Retry-After','900');throw error}
    await service.forgotPassword(input.email)
    response.status(202).json({message:'If the account is eligible, recovery instructions will be sent.'})
  })
  router.post('/reset-password',async(request,response)=>{
    const input=body(consume,request.body)
    await service.consumeToken(input.token,input.password,'reset_password');response.sendStatus(204)
  })
  router.post('/accept-invitation',async(request,response)=>{
    const input=body(consume,request.body)
    await service.consumeToken(input.token,input.password,'invite');response.sendStatus(204)
  })
  return router
}
