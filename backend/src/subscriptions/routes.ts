import {Router,type RequestHandler} from 'express'
import type {AuthService} from '../auth/service.js'
import {activeMembership,principalFrom} from '../auth/authorization.js'
import {identifier} from '../auth/tokens.js'
import {RateLimiter} from '../auth/routes.js'
import {HttpError} from '../middleware/error-handler.js'
import {parse,page} from '../business/validation.js'
import {assignment,statusChange,empty,historyInput,metric} from './model.js'
import type {SubscriptionService} from './service.js'
export function subscriptionRoutes(auth?:AuthService,service?:SubscriptionService){
 const router=Router(),limiter=new RateLimiter()
 const guard:RequestHandler[]=[(_req,res,next)=>{res.set('Cache-Control','no-store');next()},(_req,_res,next)=>{if(!service||!auth)throw new HttpError(503,'Subscription service unavailable');next()},auth?auth.authentication():(_req,_res)=>{throw new HttpError(503,'Authentication unavailable')},activeMembership(),(req,res,next)=>{try{limiter.consume(`subscription:${principalFrom(res.locals).identity.sub}`,req.method==='GET'?120:30)}catch(error){res.set('Retry-After','900');throw error}next()}]
 router.get('/subscription-plans',...guard,async(req,res)=>{res.json(await service!.plans(principalFrom(res.locals),parse(page,req.query)))})
 router.get('/subscription-plans/:id',...guard,async(req,res)=>{parse(empty,req.query);res.json(await service!.planDetails(principalFrom(res.locals),parse(identifier,req.params.id)))})
 router.get('/merchants/:id/subscription',...guard,async(req,res)=>{parse(empty,req.query);res.json(await service!.current(principalFrom(res.locals),parse(identifier,req.params.id)))})
 router.get('/merchants/:id/subscriptions',...guard,async(req,res)=>{res.json(await service!.history(principalFrom(res.locals),parse(identifier,req.params.id),parse(page,req.query)))})
 router.post('/merchants/:id/subscriptions',...guard,async(req,res)=>{parse(empty,req.query);res.status(201).json(await service!.assign(principalFrom(res.locals),parse(identifier,req.params.id),parse(assignment,req.body)))})
 router.patch('/merchants/:id/subscriptions/:subscriptionId/status',...guard,async(req,res)=>{parse(empty,req.query);res.json(await service!.changeStatus(principalFrom(res.locals),parse(identifier,req.params.id),parse(identifier,req.params.subscriptionId),parse(statusChange,req.body)))})
 router.post('/merchants/:id/subscriptions/:subscriptionId/usage/initialize',...guard,async(req,res)=>{parse(empty,req.query);parse(empty,req.body);res.json(await service!.initializeUsage(principalFrom(res.locals),parse(identifier,req.params.id),parse(identifier,req.params.subscriptionId)))})
 router.get('/merchants/:id/usage/history',...guard,async(req,res)=>{res.json(await service!.usageHistory(principalFrom(res.locals),parse(identifier,req.params.id),parse(historyInput,req.query)))})
 router.get('/merchants/:id/usage/:metric',...guard,async(req,res)=>{parse(empty,req.query);res.json(await service!.usage(principalFrom(res.locals),parse(identifier,req.params.id),parse(metric,req.params.metric)))})
 router.get('/merchants/:id/usage',...guard,async(req,res)=>{parse(empty,req.query);res.json(await service!.usage(principalFrom(res.locals),parse(identifier,req.params.id)))})
 return router
}
