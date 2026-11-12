import {test} from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {createServer as http} from 'node:http'
import {createServer as https,request} from 'node:https'
import {randomBytes,createHash} from 'node:crypto'
import {once} from 'node:events'
import {resolve} from 'node:path'
import {certificate} from './tls-fixture.mjs'
import {initializationRoutes} from '../dist/setup/http.js'

const token=randomBytes(32).toString('base64url')
const config=()=>({INITIALIZATION_HTTP_ENABLED:'OWNER_APPROVED_MANUAL_SETUP',INITIALIZATION_JOB_FILE:resolve('synthetic-private-job.json'),INITIALIZATION_TOKEN_SHA256:createHash('sha256').update(token).digest('hex'),INITIALIZATION_EXPIRES_AT:new Date(Date.now()+60000).toISOString()})
async function start(router,tls){const app=express();app.use(router);const server=tls?https({key:tls.privateKey,cert:tls.ca},app):http(app);server.listen(0,'127.0.0.1');await once(server,'listening');return server}
const close=server=>new Promise(r=>server.close(r))
function send(server,tls,{method='POST',headers={},path='/internal/initialization',body}={}){return new Promise((done,fail)=>{const req=request({host:'127.0.0.1',port:server.address().port,servername:'localhost',ca:tls.ca,method,path,headers},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>done({status:res.statusCode,body:text,headers:res.headers}))});req.on('error',fail);req.end(body)})}

test('HTTP initialization is absent by default and partial/expired configurations fail closed',async()=>{
 const server=await start(initializationRoutes({}));try{assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/internal/initialization',{method:'POST'})).status,404)}finally{await close(server)}
 for(const extra of [{INITIALIZATION_HTTP_ENABLED:'true'},{INITIALIZATION_TOKEN_SHA256:'bad'},{INITIALIZATION_JOB_FILE:'relative.json'},{INITIALIZATION_EXPIRES_AT:new Date(0).toISOString()},{INITIALIZATION_EXPIRES_AT:new Date(Date.now()+7200000).toISOString()}])assert.throws(()=>initializationRoutes({...config(),...extra}),/INITIALIZATION_HTTP/)
})
test('plain HTTP and spoofed forwarding cannot authorize setup',async()=>{
 let calls=0;const server=await start(initializationRoutes(config(),async()=>{calls++}))
 try{assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/internal/initialization',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Forwarded-Proto':'https'}})).status,403);assert.equal(calls,0)}finally{await close(server)}
})
test('verified HTTPS operator call rejects credentials/body/path injection and runs only configured job once',async()=>{
 const tls=await certificate(),environment=config();let calls=0
 const server=await start(initializationRoutes(environment,async(file,env)=>{calls++;assert.equal(file,environment.INITIALIZATION_JOB_FILE);assert.equal(env,environment)}),tls)
 try{
  assert.equal((await send(server,tls,{method:'GET'})).status,405)
  assert.equal((await send(server,tls)).status,401)
  const headers={Authorization:'Bearer '+token}
  assert.equal((await send(server,tls,{headers:{...headers,Origin:'https://example.invalid'}})).status,400)
  assert.equal((await send(server,tls,{headers:{...headers,'Content-Length':'2'},body:'{}'})).status,400)
  assert.equal((await send(server,tls,{headers,path:'/internal/initialization?job=other'})).status,400)
  assert.equal(calls,0)
  const result=await send(server,tls,{headers});assert.equal(result.status,200);assert.equal(result.headers['cache-control'],'no-store');assert.equal(result.body.includes(token),false)
  assert.equal((await send(server,tls,{headers})).status,404);assert.equal(calls,1)
 }finally{await close(server)}
})
test('failed setup consumes the attempt, hides details and cannot automatically retry',async()=>{
 const tls=await certificate();let calls=0
 const server=await start(initializationRoutes(config(),async()=>{calls++;throw Error('private database credential')}),tls)
 try{const headers={Authorization:'Bearer '+token},result=await send(server,tls,{headers});assert.equal(result.status,503);assert.equal(result.body.includes('credential'),false);assert.equal((await send(server,tls,{headers})).status,404);assert.equal(calls,1)}finally{await close(server)}
})
test('setup has a global attempt cap independent of spoofable client identities',async()=>{
 const tls=await certificate();let calls=0
 const server=await start(initializationRoutes(config(),async()=>{calls++}),tls)
 try{for(let i=0;i<12;i++)assert.equal((await send(server,tls,{headers:{'X-Forwarded-For':'192.0.2.'+i}})).status,401);assert.equal((await send(server,tls,{headers:{Authorization:'Bearer '+token}})).status,429);assert.equal(calls,0)}finally{await close(server)}
})
