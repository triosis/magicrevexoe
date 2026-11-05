import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {once} from 'node:events'

test('production frontend server supports app/public deep links, safe headers and API/asset 404s',{timeout:15000},async()=>{
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve))
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']})
 try{
  await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Frontend server exited before listening')})])
  for(const path of ['/','/login','/app/business','/r/abcdefghijklmnopqrstuv','/accept-invitation']){
   const response=await fetch('http://127.0.0.1:'+port+path,{headers:{Accept:'text/html'}});assert.equal(response.status,200);assert.match(await response.text(),/<div id="root">/);assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.match(response.headers.get('content-security-policy'),/script-src 'self'/)
  }
  for(const path of ['/api/v1/not-a-frontend-api','/assets/missing.js'])assert.equal((await fetch('http://127.0.0.1:'+port+path,{headers:{Accept:'text/html'}})).status,404)
 }finally{child.kill();await once(child,'exit')}
})
