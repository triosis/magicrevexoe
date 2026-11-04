import {Router} from 'express'
import type {AuthService} from '../auth/service.js'
import {activeMembership,principalFrom} from '../auth/authorization.js'
import {identifier} from '../auth/tokens.js'
import {RateLimiter} from '../auth/routes.js'
import {HttpError} from '../middleware/error-handler.js'
import type {BusinessService} from './service.js'
import {parse,page,branchCreate,branchUpdate,merchantCreate,merchantUpdate,destinationCreate,destinationUpdate,statusInput,channelUpdate,channelVersionCreate,channelVersionUpdate,empty} from './validation.js'

export function businessRoutes(auth?:AuthService,business?:BusinessService){
 const router=Router(),limiter=new RateLimiter(),paths=['/industry-channels','/merchants','/branches']
 router.use(paths,(_request,response,next)=>{response.set('Cache-Control','no-store');next()})
 if(!auth||!business){router.use(paths,()=>{throw new HttpError(503,'Business management temporarily unavailable')});return router}
 router.use(paths,auth.authentication(),activeMembership(),(request,response,next)=>{
  if(request.method!=='GET')try{limiter.consume(`business-write:${principalFrom(response.locals).identity.sub}`,30)}catch(error){response.set('Retry-After','900');throw error}
  next()
 })
 router.get('/industry-channels',async(_request,response)=>{response.json(await business.channels(principalFrom(response.locals)))})
 router.get('/industry-channels/:id/versions/:versionId',async(request,response)=>{response.json(await business.publishedVersions(principalFrom(response.locals),parse(identifier,request.params.id),parse(identifier,request.params.versionId)))})
 router.get('/industry-channels/:id/versions',async(request,response)=>{response.json(await business.publishedVersions(principalFrom(response.locals),parse(identifier,request.params.id)))})
 router.get('/industry-channels/:id',async(request,response)=>{response.json(await business.channelDetails(principalFrom(response.locals),parse(identifier,request.params.id)))})
 router.patch('/industry-channels/:id',async(request,response)=>{response.json(await business.updateChannel(principalFrom(response.locals),parse(identifier,request.params.id),parse(channelUpdate,request.body)))})
 router.post('/industry-channels/:id/versions',async(request,response)=>{response.status(201).json(await business.createVersion(principalFrom(response.locals),parse(identifier,request.params.id),parse(channelVersionCreate,request.body)))})
 router.patch('/industry-channels/:id/versions/:versionId',async(request,response)=>{response.json(await business.editVersion(principalFrom(response.locals),parse(identifier,request.params.id),parse(identifier,request.params.versionId),parse(channelVersionUpdate,request.body)))})
 router.post('/industry-channels/:id/versions/:versionId/publish',async(request,response)=>{parse(empty,request.body);response.json(await business.editVersion(principalFrom(response.locals),parse(identifier,request.params.id),parse(identifier,request.params.versionId),{},true))})
 router.post('/merchants',async(request,response)=>{response.status(201).json(await business.onboard(principalFrom(response.locals),parse(merchantCreate,request.body)))})
 router.get('/merchants/:id/branches',async(request,response)=>{response.json(await business.branches(principalFrom(response.locals),parse(identifier,request.params.id),parse(page,request.query)))})
 router.post('/merchants/:id/branches',async(request,response)=>{response.status(201).json(await business.createBranch(principalFrom(response.locals),parse(identifier,request.params.id),parse(branchCreate,request.body)))})
 router.get('/merchants/:id',async(request,response)=>{response.json(await business.profile(principalFrom(response.locals),parse(identifier,request.params.id)))})
 router.patch('/merchants/:id',async(request,response)=>{response.json(await business.updateProfile(principalFrom(response.locals),parse(identifier,request.params.id),parse(merchantUpdate,request.body)))})
 router.get('/branches/:id',async(request,response)=>{response.json(await business.branchDetails(principalFrom(response.locals),parse(identifier,request.params.id)))})
 router.patch('/branches/:id',async(request,response)=>{response.json(await business.updateBranch(principalFrom(response.locals),parse(identifier,request.params.id),parse(branchUpdate,request.body)))})
 router.post('/branches/:id/archive',async(request,response)=>{const input=parse(statusInput,request.body);response.json(await business.archiveBranch(principalFrom(response.locals),parse(identifier,request.params.id),input.lockVersion))})
 router.get('/branches/:id/review-destination',async(request,response)=>{response.json(await business.getDestination(principalFrom(response.locals),parse(identifier,request.params.id)))})
 router.post('/branches/:id/review-destination',async(request,response)=>{response.status(201).json(await business.addDestination(principalFrom(response.locals),parse(identifier,request.params.id),parse(destinationCreate,request.body)))})
 router.patch('/branches/:id/review-destination',async(request,response)=>{response.json(await business.updateDestination(principalFrom(response.locals),parse(identifier,request.params.id),parse(destinationUpdate,request.body)))})
 for(const [action,status]of [['disable','disabled'],['enable','active']]as const)router.post(`/branches/:id/review-destination/${action}`,async(request,response)=>{const input=parse(statusInput,request.body);response.json(await business.destinationStatus(principalFrom(response.locals),parse(identifier,request.params.id),status,input.lockVersion))})
 return router
}
