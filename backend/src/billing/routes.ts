import {Router,type RequestHandler} from 'express'
import type {AuthService} from '../auth/service.js'
import {activeMembership,principalFrom} from '../auth/authorization.js'
import {identifier} from '../auth/tokens.js'
import {RateLimiter} from '../auth/routes.js'
import {parse} from '../business/validation.js'
import {empty} from '../subscriptions/model.js'
import {HttpError} from '../middleware/error-handler.js'
import type {BillingService} from './service.js'
export function billingRoutes(auth?:AuthService,billing?:BillingService){
 const router=Router(),limits=new RateLimiter()
 const guard:RequestHandler[]=[(_req,res,next)=>{res.set('Cache-Control','no-store');if(!auth||!billing)throw new HttpError(503,'Billing unavailable');next()},auth?auth.authentication():(_req,_res)=>{throw new HttpError(503,'Authentication unavailable')},activeMembership(),(_req,res,next)=>{limits.consume('billing:'+principalFrom(res.locals).identity.sub,20);next()}]
 router.get('/merchants/:id/billing',...guard,async(req,res)=>{parse(empty,req.query);res.json(await billing!.history(principalFrom(res.locals),parse(identifier,req.params.id)))})
 router.get('/merchants/:id/billing/metering',...guard,async(req,res)=>{parse(empty,req.query);res.json(await billing!.metering(principalFrom(res.locals),parse(identifier,req.params.id)))})
 router.get('/merchants/:id/billing/:agreementId/invoice-preparation',...guard,async(req,res)=>{parse(empty,req.query);res.json(await billing!.invoicePreparation(principalFrom(res.locals),parse(identifier,req.params.id),parse(identifier,req.params.agreementId)))})
 router.post('/merchants/:id/billing/checkout',...guard,async(req,res)=>{parse(empty,req.query);res.json(await billing!.checkout(principalFrom(res.locals),parse(identifier,req.params.id),req.body))})
 router.post('/merchants/:id/billing/:agreementId/cancel',...guard,async(req,res)=>{parse(empty,req.query);res.json(await billing!.cancel(principalFrom(res.locals),parse(identifier,req.params.id),parse(identifier,req.params.agreementId),req.body))})
 return router
}
