import assert from 'node:assert/strict'
import {test} from 'node:test'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {randomBytes,createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {rootCertificates} from 'node:tls'
import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {after} from 'node:test'
import {createApp,safeDatabaseFailure} from '../dist/app.js'

// Never inherit a real DB, provider, authentication or dotenv setting.
const system=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(key.toUpperCase())))
// Only test local CA-file parsing; no DB handshake or external trust is asserted.
// Use Node's public bundled root so unit tests need no platform-specific OpenSSL.
const directory=await mkdtemp(join(tmpdir(),'revexoe-startup-'))
const ca={cert:join(directory,'ca.pem'),digest:createHash('sha256').update(rootCertificates[0]).digest('hex')}
await writeFile(ca.cert,rootCertificates[0],{flag:'wx',mode:0o600})
after(async()=>{await unlink(ca.cert);await rmdir(directory)})
const production={...system,NODE_ENV:'production',HOST:'127.0.0.1',CORS_ORIGINS:'https://web.example.invalid',DB_HOST:'localhost',DB_PORT:'1',DB_NAME:'startup_synthetic',DB_USER:'startup_synthetic',DB_PASSWORD:randomBytes(24).toString('hex'),DB_TLS_MODE:'required',DB_TLS_CA_FILE:ca.cert,DB_TLS_CA_SHA256:ca.digest,AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),PUBLIC_WEB_ORIGIN:'https://web.example.invalid',PUBLIC_FUNNEL_ORIGIN:'https://api.example.invalid',AUTH_RECOVERY_URL:'https://web.example.invalid/recover',AUTH_SMTP_HOST:'localhost',AUTH_SMTP_PORT:'465',AUTH_SMTP_USER:'synthetic',AUTH_SMTP_PASSWORD:randomBytes(24).toString('hex'),AUTH_MAIL_FROM:'sender@example.invalid'}
const cwd=fileURLToPath(new URL('..',import.meta.url))
async function port(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const n=server.address().port;await new Promise(r=>server.close(r));return n}
function launch(env,ipc=false){const child=spawn(process.execPath,ipc?['--input-type=module','-e',"import './dist/server.js'; process.on('message',()=>{process.disconnect();process.emit('SIGTERM')})"]:['dist/server.js'],{cwd,env,windowsHide:true,stdio:ipc?['ignore','pipe','pipe','ipc']:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>{output+=b});child.stderr.on('data',b=>{output+=b});return {child,output:()=>output}}
for(const name of ['DB_TLS_CA_FILE','DB_TLS_CA_SHA256','AUTH_ACCESS_SECRET','AUTH_MFA_KEY'])test('production startup refuses missing '+name+' before listen',{timeout:15000},async()=>{
 const env={...production,PORT:String(await port())};delete env[name];const run=launch(env);try{const [code]=await once(run.child,'exit');assert.equal(code,1);assert.match(run.output(),new RegExp(name));assert.doesNotMatch(run.output(),/Backend listening/);assert.equal(run.output().includes(production.DB_PASSWORD),false);assert.equal(run.output().includes(production.AUTH_ACCESS_SECRET),false)}finally{if(run.child.exitCode===null)run.child.kill()}
})
test('production entrypoint binds assigned port without DB/SMTP availability, aliases fail closed, and drains',{timeout:15000},async t=>{
 const listenPort=await port();const run=launch({...production,PORT:String(listenPort),HTTP_PROXY_MODE:'single-nginx-loopback'},true);const started=performance.now();
 try{
 await new Promise((resolve,reject)=>{run.child.once('error',reject);run.child.once('exit',()=>reject(Error('Exited before listen')));run.child.stdout.on('data',()=>{if(run.output().includes('Backend listening'))resolve()})});t.diagnostic('Local spawn-to-listen milliseconds: '+Math.round(performance.now()-started));
 const base='http://127.0.0.1:'+listenPort;
 assert.equal((await fetch(base+'/health',{headers:{'x-forwarded-for':'203.0.113.1','x-forwarded-proto':'https'}})).status,200);
 assert.equal((await fetch(base+'/health',{headers:{'x-forwarded-for':'203.0.113.1, 198.51.100.1','x-forwarded-proto':'https'}})).status,400);
 for(const path of ['/health','/health/live']){const response=await fetch(base+path);assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'alive'});assert.equal(response.headers.get('cache-control'),'no-store')}
 for(const path of ['/ready','/health/ready']){const response=await fetch(base+path);assert.equal(response.status,503);assert.deepEqual(await response.json(),{status:'not_ready',database:'unavailable'})}
 assert.equal((await fetch(base+'/api/v1/auth/me')).status,401);
 assert.equal((await fetch(base+'/api/v1/tenants')).status,401);
 assert.equal((await fetch(base+'/')).status,404);
 const exited=once(run.child,'exit');run.child.send('shutdown');assert.equal((await exited)[0],0);assert.match(run.output(),/shutting down \(SIGTERM\)/);
 }finally{if(run.child.exitCode===null)run.child.kill()}
})
test('ready aliases handle recovery, drain races and missing production authentication',{timeout:15000},async()=>{
 let up=false,draining=false,probes=0,finish;
 const env={NODE_ENV:'test',CORS_ORIGINS:[]};
 const server=createServer(createApp({env,isShuttingDown:()=>draining,checkDatabase:async()=>{probes++;if(!up)throw Error('secret');if(finish)await finish}}));server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 try{
 for(const path of ['/ready','/health/ready'])assert.equal((await fetch(base+path)).status,503);
 up=true;for(const path of ['/ready','/health/ready'])assert.equal((await fetch(base+path)).status,200);
 let release;finish=new Promise(r=>{release=r});const pending=fetch(base+'/ready');while(probes<5)await new Promise(r=>setTimeout(r,5));draining=true;release();assert.equal((await pending).status,503);
 const count=probes;assert.equal((await fetch(base+'/ready')).status,503);assert.equal(probes,count);
 }finally{await new Promise(r=>server.close(r))}
 const closed=createServer(createApp({env:{...env,NODE_ENV:'production'},isShuttingDown:()=>false,checkDatabase:async()=>{throw Error('must not be called')}}));closed.listen(0,'127.0.0.1');await once(closed,'listening');try{assert.equal((await fetch('http://127.0.0.1:'+closed.address().port+'/ready')).status,503)}finally{await new Promise(r=>closed.close(r))}
})
test('TLS diagnostics retain fixed allowlisted descriptions without driver secrets',()=>{
 for(const code of ['ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN']){const text=safeDatabaseFailure({code,message:'sensitive-host-secret',sql:'sensitive-host-secret'});assert.ok(text.startsWith(code+':'));assert.equal(text.includes('sensitive-host-secret'),false)}
})
