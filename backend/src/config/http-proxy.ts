import {isIP} from 'node:net'
import type {Express} from 'express'
import {HttpError} from '../middleware/error-handler.js'

type ProxyInput={HTTP_PROXY_MODE?:string|undefined;HOST?:string|undefined}
export function validateHttpProxy(input:ProxyInput):void{
 if(input.HTTP_PROXY_MODE===undefined||input.HTTP_PROXY_MODE==='direct')return
 if(input.HTTP_PROXY_MODE!=='single-nginx-loopback'||input.HOST!=='127.0.0.1')throw Error('Invalid HTTP_PROXY_MODE configuration; single Nginx requires HOST=127.0.0.1')
}
export function trustedNginx(address:string,hop:number):boolean{
 return hop===0&&(address==='127.0.0.1'||address==='::ffff:127.0.0.1')
}
export function configureHttpProxy(app:Express,input:ProxyInput):void{
 validateHttpProxy(input)
 if(input.HTTP_PROXY_MODE!=='single-nginx-loopback')return
 app.set('trust proxy',trustedNginx)
 app.use((req,_res,next)=>{
  const ip=req.get('x-forwarded-for'),protocol=req.get('x-forwarded-proto')
  // Nginx must replace XFF with one verified client address, set HTTPS itself,
  // and remove alternative forwarding headers. Direct local probes omit all.
  if(req.get('forwarded')!==undefined||req.get('x-forwarded-host')!==undefined||
    ((ip!==undefined||protocol!==undefined)&&(!trustedNginx(req.socket.remoteAddress??'',0)||!ip||!isIP(ip)||protocol!=='https'))){
   next(new HttpError(400,'Invalid proxy headers'));return
  }
  next()
 })
}
