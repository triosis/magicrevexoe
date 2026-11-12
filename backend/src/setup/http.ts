import {Router} from 'express'
import {createHash,timingSafeEqual} from 'node:crypto'
import {isAbsolute} from 'node:path'
import {runInitializationJob} from './job.js'

// Temporary operator access only. The created database account is permanent.
// No client-provided SQL, path, credentials or command is accepted.
export function initializationRoutes(environment:NodeJS.ProcessEnv,run=runInitializationJob){
 const router=Router(),names=['INITIALIZATION_HTTP_ENABLED','INITIALIZATION_JOB_FILE','INITIALIZATION_TOKEN_SHA256','INITIALIZATION_EXPIRES_AT']
 if(names.every(n=>environment[n]===undefined))return router
 const file=environment.INITIALIZATION_JOB_FILE,hash=environment.INITIALIZATION_TOKEN_SHA256,expires=Date.parse(environment.INITIALIZATION_EXPIRES_AT??'')
 if(environment.INITIALIZATION_HTTP_ENABLED!=='OWNER_APPROVED_MANUAL_SETUP'||!file||!isAbsolute(file)||!hash||!/^[a-f0-9]{64}$/.test(hash)||!Number.isFinite(expires)||expires<=Date.now()||expires>Date.now()+3600000)throw Error('Invalid INITIALIZATION_HTTP configuration')
 const expected=Buffer.from(hash,'hex')
 // Fixed global budget: independent of client-supplied proxy/IP headers.
 let attempts=0,busy=false,consumed=false
 router.all('/internal/initialization',async(req,res)=>{
  res.set('Cache-Control','no-store')
  if(Date.now()>=expires||consumed){res.sendStatus(404);return}
  if(req.method!=='POST'){res.sendStatus(405);return}
  // Never trust X-Forwarded-Proto here. Use only Express's reviewed proxy policy
  // or a native TLS socket. Unknown Hostinger proxy topology remains a blocker.
  if(!req.secure){res.sendStatus(403);return}
  if(req.get('origin')!==undefined||req.get('transfer-encoding')!==undefined||Number(req.get('content-length')??'0')!==0||req.url.includes('?')){res.sendStatus(400);return}
  attempts++
  if(attempts>12){res.sendStatus(429);return}
  const token=/^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(req.get('authorization')??'')?.[1]
  const supplied=createHash('sha256').update(token??'').digest()
  if(!token||!timingSafeEqual(supplied,expected)){res.sendStatus(401);return}
  if(busy){res.sendStatus(409);return}
  busy=true;consumed=true
  try{
   // The file fixes exactly one separately reviewed action and target. All
   // existing release/approval/ledger/lock/audit/retry checks remain in force.
   await run(file,environment)
   res.status(200).json({completed:true})
  }catch{res.status(503).json({completed:false,reviewRequired:true})}
  finally{busy=false}
 })
 return router
}
