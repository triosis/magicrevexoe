import {Router,type RequestHandler} from 'express'
import type {AuthService} from '../auth/service.js'
import {activeMembership,principalFrom} from '../auth/authorization.js'
import {RateLimiter} from '../auth/routes.js'
import {identifier} from '../auth/tokens.js'
import {HttpError} from '../middleware/error-handler.js'
import {parse,page,statusInput} from '../business/validation.js'
import {funnelInput,linkInput,qrInput,eventInput,empty} from './validation.js'
import type {FunnelService} from './service.js'

export function funnelRoutes(auth?:AuthService,service?:FunnelService){
 const router=Router(),limiter=new RateLimiter()
 const noStore:RequestHandler=(_req,res,next)=>{res.set('Cache-Control','no-store');next()}
 const available:RequestHandler=(_req,_res,next)=>{if(!service)throw new HttpError(503,'Funnel service unavailable');next()}
 const publicLimit:RequestHandler=(req,res,next)=>{try{limiter.consume('public-global',6000,60_000);limiter.consume(`public:${req.ip??req.socket.remoteAddress}`,120)}catch(error){res.set('Retry-After','900');throw error}next()}
 router.use('/public/funnels',noStore,publicLimit,available)
 router.get('/public/funnels/:code',async(req,res)=>{parse(empty,req.query);res.vary('Accept');if(req.get('Accept')?.includes('text/html')&&req.accepts('html')){const page=await service!.publicPage(req.params.code);if(page){res.redirect(303,page);return}}res.json(await service!.resolve(req.params.code))})
 router.post('/public/funnels/:code/events',async(req,res)=>{parse(empty,req.query);const input=parse(eventInput,req.body);res.json(await service!.event(req.params.code,input.event))})
 const protectedRoute:RequestHandler[]=[noStore,available,auth?auth.authentication():(_req,_res)=>{throw new HttpError(503,'Authentication unavailable')},activeMembership(),(req,res,next)=>{try{if(req.method!=='GET')limiter.consume(`funnel-write:${principalFrom(res.locals).identity.sub}`,30)}catch(error){res.set('Retry-After','900');throw error}next()}]
 router.post('/branches/:id/funnels',...protectedRoute,async(req,res)=>{res.status(201).json(await service!.publish(principalFrom(res.locals),parse(identifier,req.params.id),parse(funnelInput,req.body)))})
 router.post('/branches/:id/short-links',...protectedRoute,async(req,res)=>{const input=parse(linkInput,req.body);res.status(201).json(await service!.createLink(principalFrom(res.locals),parse(identifier,req.params.id),input.funnelId))})
 router.get('/branches/:id/short-links',...protectedRoute,async(req,res)=>{res.json(await service!.links(principalFrom(res.locals),parse(identifier,req.params.id),parse(page,req.query)))})
 router.post('/short-links/:id/disable',...protectedRoute,async(req,res)=>{const input=parse(statusInput,req.body);res.json(await service!.disable(principalFrom(res.locals),parse(identifier,req.params.id),input.lockVersion))})
 router.post('/branches/:id/qr',...protectedRoute,async(req,res)=>{res.status(200).json(await service!.generateQr(principalFrom(res.locals),parse(identifier,req.params.id),parse(qrInput,req.body)))})
 router.get('/branches/:id/qr',...protectedRoute,async(req,res)=>{res.json(await service!.qrDetails(principalFrom(res.locals),parse(identifier,req.params.id),parse(page,req.query)))})
 router.get('/qr-assets/:id/content',...protectedRoute,async(req,res)=>{const rendered=await service!.qrContent(principalFrom(res.locals),parse(identifier,req.params.id));res.set('Content-Type',rendered.contentType);res.set('Content-Disposition','attachment; filename="review-qr.'+(rendered.contentType==='image/png'?'png':'svg')+'"');res.send(rendered.content)})
 return router
}
