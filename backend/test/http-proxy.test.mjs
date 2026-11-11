import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createServer,request} from 'node:http'
import {once} from 'node:events'
import {createApp} from '../dist/app.js'
import {trustedNginx,validateHttpProxy} from '../dist/config/http-proxy.js'
import {validateEnvironment} from '../dist/config/env.js'

const env={NODE_ENV:'test',HOST:'127.0.0.1',HTTP_PROXY_MODE:'single-nginx-loopback',CORS_ORIGINS:['https://web.example.invalid']}
const forwarded=ip=>({'x-forwarded-for':ip,'x-forwarded-proto':'https'})
async function fixture(options={},run){
 const app=createApp({env,isShuttingDown:()=>false,checkDatabase:async()=>{},...options})
 const server=createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening')
 try{await run('http://127.0.0.1:'+server.address().port,app)}finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
}
const auth={authentication:()=>((_req,_res,next)=>next()),login:async()=>({challengeRequired:true}),forgotPassword:async()=>{}}
test('single Nginx is opt-in, exact loopback bound and trusts only the first local hop',()=>{
 validateHttpProxy({});validateHttpProxy({HTTP_PROXY_MODE:'direct',HOST:'0.0.0.0'})
 for(const input of [{HTTP_PROXY_MODE:'true',HOST:'127.0.0.1'},{HTTP_PROXY_MODE:'single-nginx-loopback',HOST:'0.0.0.0'},{HTTP_PROXY_MODE:'single-nginx-loopback',HOST:'localhost'}])assert.throws(()=>validateHttpProxy(input),/HTTP_PROXY_MODE/)
 for(const ip of ['127.0.0.1','::ffff:127.0.0.1']){assert.equal(trustedNginx(ip,0),true);assert.equal(trustedNginx(ip,1),false)}
 for(const ip of ['203.0.113.1','127.0.0.2','::1'])assert.equal(trustedNginx(ip,0),false)
 assert.throws(()=>createApp({env:{...env,HOST:'0.0.0.0'},isShuttingDown:()=>false,checkDatabase:async()=>{}}),/HTTP_PROXY_MODE/)
 const values={NODE_ENV:'test',HOST:'127.0.0.1',CORS_ORIGINS:'http://localhost',DB_HOST:'127.0.0.1',DB_NAME:'synthetic',DB_USER:'synthetic',DB_PASSWORD:'synthetic',HTTP_PROXY_MODE:'single-nginx-loopback'}
 assert.equal(validateEnvironment(values).HTTP_PROXY_MODE,'single-nginx-loopback')
 assert.throws(()=>validateEnvironment({...values,HOST:'0.0.0.0'}),/HTTP_PROXY_MODE/)
})
test('proxy header shape refuses spoofed chains/host/proto alternatives; direct mode ignores XFF',async()=>{
 await fixture({},async base=>{
  assert.equal((await fetch(base+'/health', {headers:forwarded('2001:db8::1')})).status,200)
  for(const headers of [forwarded('203.0.113.1, 198.51.100.1'),forwarded('garbage'),{'x-forwarded-for':'203.0.113.1'},{...forwarded('203.0.113.1'),'x-forwarded-proto':'http'},{...forwarded('203.0.113.1'),'x-forwarded-host':'evil.example'},{...forwarded('203.0.113.1'),forwarded:'for=198.51.100.1'}])assert.equal((await fetch(base+'/health',{headers})).status,400)
  assert.equal((await fetch(base+'/health')).status,200) // local probe
 })
 await fixture({env:{...env,HTTP_PROXY_MODE:undefined}},async(base,app)=>{
  assert.equal(app.get('trust proxy'),false)
  for(let i=0;i<21;i++){
   // With no service, use public AI limiter (10/IP), which precedes availability.
   const r=await fetch(base+'/api/v1/public/funnels/synthetic/drafts',{method:'POST',headers:{...forwarded('203.0.113.'+(i+1)),'Content-Type':'application/json'},body:'{}'})
   assert.equal(r.status,i<10?503:429)
  }
 })
})
test('actual auth login IP and email/recovery limits remain distinct and enforced',async()=>{
 await fixture({auth},async base=>{
  const post=(route,ip,body)=>fetch(base+'/api/v1/auth/'+route,{method:'POST',headers:{...forwarded(ip),'Content-Type':'application/json'},body:JSON.stringify(body)})
  for(let i=0;i<21;i++)assert.equal((await post('login','203.0.113.1',{email:`person${i}@example.invalid`,password:'synthetic'})).status,i<20?200:429)
  assert.equal((await post('login','203.0.113.2',{email:'other@example.invalid',password:'synthetic'})).status,200)
  for(let i=0;i<11;i++)assert.equal((await post('login',`198.51.100.${i+1}`,{email:'same@example.invalid',password:'synthetic'})).status,i<10?200:429)
  for(let i=0;i<6;i++)assert.equal((await post('forgot-password',`192.0.2.${i+1}`,{email:'recover@example.invalid'})).status,i<5?202:429)
 })
})
test('one-hop proxy contract overwrites attacker headers so spoofing cannot evade an IP limit',async()=>{
 await fixture({},async base=>{
  // HTTP topology model, not a claim to have executed the Nginx binary.
  const proxy=createServer((req,res)=>{
   const headers={...req.headers,'x-forwarded-for':req.socket.remoteAddress,'x-forwarded-proto':'https'}
   for(const key of ['forwarded','x-forwarded-host','x-real-ip','x-forwarded-port'])delete headers[key]
   const upstream=request(base+req.url,{method:req.method,headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)})
   upstream.on('error',()=>res.destroy());req.pipe(upstream)
  });proxy.listen(0,'127.0.0.1');await once(proxy,'listening')
  try{
   for(let i=0;i<11;i++){
    const r=await fetch('http://127.0.0.1:'+proxy.address().port+'/api/v1/public/funnels/synthetic/drafts',{method:'POST',headers:{...forwarded('198.51.100.'+(i+1)),Forwarded:'for=192.0.2.1','x-forwarded-host':'evil.example','Content-Type':'application/json'},body:'{}'})
    assert.equal(r.status,i<10?503:429)
   }
  }finally{proxy.closeAllConnections();await new Promise(r=>proxy.close(r))}
 })
})
test('global AI and general auth limits cannot be evaded by distinct forwarded clients',async()=>{
 await fixture({auth},async base=>{
  for(let i=0;i<61;i++){
   const headers={...forwarded('198.51.100.'+(i+1)),'Content-Type':'application/json'}
   assert.equal((await fetch(base+'/api/v1/public/funnels/synthetic/drafts',{method:'POST',headers,body:'{}'})).status,i<60?503:429)
  }
  for(let i=0;i<61;i++){
   const headers={...forwarded('203.0.113.10'),'Content-Type':'application/json'}
   assert.equal((await fetch(base+'/api/v1/auth/login',{method:'POST',headers,body:'{}'})).status,i<60?400:429)
  }
 })
})
test('feedback, AI and public funnel IP limits survive proxy selection without shared buckets',async()=>{
 for(const [path,limit] of [['feedback',30],['drafts',10],['',120]])await fixture({},async base=>{
  const call=ip=>fetch(base+'/api/v1/public/funnels/synthetic'+(path?'/'+path:''),{method:path?'POST':'GET',headers:{...forwarded(ip),...(path?{'Content-Type':'application/json'}:{})},...(path?{body:'{}'}:{})})
  for(let i=0;i<=limit;i++)assert.equal((await call('203.0.113.1')).status,i<limit?503:429)
  assert.equal((await call('203.0.113.2')).status,503)
 })
})
test('proxy mode preserves raw webhook bytes/headers, API paths, CORS, parser errors and health',async()=>{
 const raw=' { "event": "synthetic", "n": 1 }\n';let called=false
 await fixture({billing:{webhook:async(bytes,signature,event)=>{assert.equal(bytes.toString(),raw);assert.equal(signature,'synthetic-signature');assert.equal(event,'synthetic-event');called=true;return {accepted:true}}}},async base=>{
  const headers={...forwarded('203.0.113.1'),'Content-Type':'application/json','x-razorpay-signature':'synthetic-signature','x-razorpay-event-id':'synthetic-event'}
  const r=await fetch(base+'/api/v1/billing/webhooks/razorpay',{method:'POST',headers,body:raw});assert.equal(r.status,200);assert.equal(called,true);assert.equal(r.headers.get('cache-control'),'no-store')
  assert.equal((await fetch(base+'/health',{headers:{...forwarded('203.0.113.1'),Origin:'https://evil.example'}})).status,403)
  const cors=await fetch(base+'/health',{headers:{...forwarded('203.0.113.1'),Origin:'https://web.example.invalid'}});assert.equal(cors.headers.get('access-control-allow-origin'),'https://web.example.invalid')
  assert.equal((await fetch(base+'/api/v1/auth/login',{method:'OPTIONS',headers:{...forwarded('203.0.113.1'),Origin:'https://web.example.invalid','Access-Control-Request-Method':'POST'}})).status,204)
  assert.equal((await fetch(base+'/missing',{method:'POST',headers,body:'{'})).status,400)
  assert.equal((await fetch(base+'/missing',{headers})).status,404)
  assert.equal((await fetch(base+'/ready',{headers})).status,200)
 })
})
