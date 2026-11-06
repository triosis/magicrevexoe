import {Router,type RequestHandler} from 'express'
import type {AuthService} from '../auth/service.js'
import {activeMembership,principalFrom} from '../auth/authorization.js'
import {identifier} from '../auth/tokens.js'
import {RateLimiter} from '../auth/routes.js'
import {HttpError} from '../middleware/error-handler.js'
import {parse} from '../business/validation.js'
import {empty} from '../funnels/validation.js'
import {submission,listInput,filter,statusInput} from './validation.js'
import type {FeedbackService} from './service.js'

export function feedbackRoutes(auth?:AuthService,service?:FeedbackService){
 const router=Router(),limiter=new RateLimiter()
 const noStore:RequestHandler=(_req,res,next)=>{res.set('Cache-Control','no-store');next()}
 const available:RequestHandler=(_req,_res,next)=>{if(!service)throw new HttpError(503,'Feedback service unavailable');next()}
 const publicLimit:RequestHandler=(req,res,next)=>{try{limiter.consume('feedback-global',3000,60_000);limiter.consume(`feedback-ip:${req.ip??req.socket.remoteAddress}`,30)}catch(error){res.set('Retry-After','900');throw error}next()}
 router.post('/public/funnels/:code/feedback',noStore,publicLimit,available,async(req,res)=>{parse(empty,req.query);res.status(200).json(await service!.submit(typeof req.params.code==='string'?req.params.code:'',parse(submission,req.body)))})
 router.use('/feedback',noStore,available,auth?auth.authentication():(_req,_res)=>{throw new HttpError(503,'Authentication unavailable')},activeMembership(),(req,res,next)=>{try{limiter.consume(`feedback-admin:${principalFrom(res.locals).identity.sub}`,req.method==='GET'?120:30)}catch(error){res.set('Retry-After','900');throw error}next()})
 router.get('/feedback/statistics',async(req,res)=>{res.json(await service!.statistics(principalFrom(res.locals),parse(filter,req.query)))})
 router.get('/feedback/analytics',async(req,res)=>{res.json(await service!.analytics(principalFrom(res.locals),parse(filter,req.query)))})
 router.get('/feedback',async(req,res)=>{res.json(await service!.list(principalFrom(res.locals),parse(listInput,req.query)))})
 router.get('/feedback/:id',async(req,res)=>{parse(empty,req.query);res.json(await service!.details(principalFrom(res.locals),parse(identifier,req.params.id)))})
 router.patch('/feedback/:id/status',async(req,res)=>{parse(empty,req.query);res.json(await service!.changeStatus(principalFrom(res.locals),parse(identifier,req.params.id),parse(statusInput,req.body)))})
 return router
}
