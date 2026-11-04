import { Router } from 'express'
import { z } from 'zod'
import type { AuthService } from '../auth/service.js'
import { activeMembership,principalFrom } from '../auth/authorization.js'
import { identifier } from '../auth/tokens.js'
import { RateLimiter } from '../auth/routes.js'
import { HttpError } from '../middleware/error-handler.js'
import type { TenantService } from './service.js'

const email=z.string().trim().email().max(254)
const person=z.object({email,displayName:z.string().trim().min(1).max(120)}).strict()
const invitation=person.extend({roleCode:z.enum(['reseller_admin','sub_reseller_admin','merchant_admin','merchant_staff']).optional(),resend:z.boolean().optional()}).strict()
const create=z.object({parentId:identifier,kind:z.enum(['reseller','sub_reseller','merchant']),name:z.string().trim().min(1).max(160),industryChannelCode:z.enum(['salon_spa','clinic_healthcare','restaurant_cafe']).optional(),invitation:person}).strict().superRefine((value,context)=>{
 if((value.kind==='merchant')!==Boolean(value.industryChannelCode))context.addIssue({code:'custom',message:'Invalid industry channel'})
})
const version=z.number().int().positive().max(4294967294)
const update=z.object({name:z.string().trim().min(1).max(160),lockVersion:version}).strict()
const status=z.object({lockVersion:version}).strict()
const page=z.object({afterId:identifier.optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict()
function parse<T>(schema:z.ZodType<T>,value:unknown):T{const result=schema.safeParse(value);if(!result.success)throw new HttpError(400,'Invalid request');return result.data}

export function tenantRoutes(auth?:AuthService,service?:TenantService){
 const router=Router(),limiter=new RateLimiter()
 router.use((_request,response,next)=>{response.set('Cache-Control','no-store');next()})
 if(!auth||!service){router.use(()=>{throw new HttpError(503,'Tenant management temporarily unavailable')});return router}
 router.use(auth.authentication(),activeMembership())
 router.use((request,response,next)=>{
  if(request.method!=='GET')try{limiter.consume(`tenant-write:${principalFrom(response.locals).identity.sub}`,30)}catch(error){response.set('Retry-After','900');throw error}
  next()
 })
 router.post('/',async(request,response)=>{response.status(201).json(await service.create(principalFrom(response.locals),parse(create,request.body)))})
 router.get('/',async(request,response)=>{response.json(await service.list(principalFrom(response.locals),parse(page,request.query)))})
 router.get('/:id/descendants',async(request,response)=>{response.json(await service.list(principalFrom(response.locals),parse(page,request.query),parse(identifier,request.params.id)))})
 router.get('/:id/history',async(request,response)=>{response.json(await service.history(principalFrom(response.locals),parse(identifier,request.params.id),parse(page,request.query)))})
 router.get('/:id',async(request,response)=>{response.json(await service.get(principalFrom(response.locals),parse(identifier,request.params.id)))})
 router.patch('/:id',async(request,response)=>{response.json(await service.update(principalFrom(response.locals),parse(identifier,request.params.id),parse(update,request.body)))})
 router.post('/:id/suspend',async(request,response)=>{const input=parse(status,request.body);response.json(await service.status(principalFrom(response.locals),parse(identifier,request.params.id),'suspended',input.lockVersion))})
 router.post('/:id/reinstate',async(request,response)=>{const input=parse(status,request.body);response.json(await service.status(principalFrom(response.locals),parse(identifier,request.params.id),'active',input.lockVersion))})
 router.post('/:id/invitations',async(request,response)=>{response.status(201).json(await service.invite(principalFrom(response.locals),parse(identifier,request.params.id),parse(invitation,request.body)))})
 return router
}
