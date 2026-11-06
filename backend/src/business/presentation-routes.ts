import {Router,json,raw} from 'express'
import {z} from 'zod'
import type {AuthService} from '../auth/service.js'
import {activeMembership,principalFrom} from '../auth/authorization.js'
import {RateLimiter} from '../auth/routes.js'
import {identifier} from '../auth/tokens.js'
import {HttpError} from '../middleware/error-handler.js'
import {parse,empty} from './validation.js'
import type {PresentationService} from './presentation.js'
export function presentationRoutes(auth?:AuthService,service?:PresentationService){
 const router=Router(),limits=new RateLimiter()
 const guard=[(_req:import('express').Request,res:import('express').Response,next:import('express').NextFunction)=>{res.set('Cache-Control','no-store');if(!auth||!service)throw new HttpError(503,'Presentation unavailable');next()},auth?auth.authentication():()=>{throw new HttpError(503,'Authentication unavailable')},activeMembership(),(_req:import('express').Request,res:import('express').Response,next:import('express').NextFunction)=>{limits.consume('presentation:'+principalFrom(res.locals).identity.sub,30);next()}]
 router.get('/merchants/:id/presentation',...guard,async(req,res)=>{parse(empty,req.query);res.json(await service!.get(principalFrom(res.locals),parse(identifier,req.params.id)))})
 router.post('/merchants/:id/presentation',...guard,json({limit:'4kb'}),async(req,res)=>{parse(empty,req.query);res.json(await service!.update(principalFrom(res.locals),parse(identifier,req.params.id),req.body))})
 router.post('/merchants/:id/presentation/logo',...guard,raw({type:'image/png',limit:'64kb'}),async(req,res)=>{const input=parse(z.object({lockVersion:z.coerce.number().int().min(0).max(4294967294)}).strict(),req.query);res.json(await service!.logo(principalFrom(res.locals),parse(identifier,req.params.id),req.body,input.lockVersion))})
 return router
}
