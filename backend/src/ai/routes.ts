import {Router} from 'express'
import type {DraftService} from './service.js'
import {RateLimiter} from '../auth/routes.js'
import {HttpError} from '../middleware/error-handler.js'
export function draftRoutes(service?:DraftService){
  const router=Router(),limits=new RateLimiter()
  router.post('/public/funnels/:code/views',async(req,res)=>{
    res.set('Cache-Control','no-store')
    limits.consume('views-global',300,60000);limits.consume('views-ip:'+(req.ip??req.socket.remoteAddress),60)
    if(!service)throw new HttpError(503,'Metering unavailable')
    if(Object.keys(req.query).length)throw new HttpError(400,'Invalid request')
    res.json(await service.scan(String(req.params.code),req.body))
  })
  router.post('/public/funnels/:code/drafts',async(req,res)=>{
    res.set('Cache-Control','no-store')
    try{limits.consume('ai-global',60,60000);limits.consume('ai-ip:'+(req.ip??req.socket.remoteAddress),10)}catch(error){res.set('Retry-After','900');throw error}
    if(!service)throw new HttpError(503,'AI generation is not configured')
    if(Object.keys(req.query).length)throw new HttpError(400,'Invalid request')
    res.json(await service.generate(String(req.params.code),req.body))
  })
  return router
}
