import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {bootstrapPlatform} from '../dist/setup/bootstrap.js'
import {configuredAuth} from '../dist/auth/configuration.js'
import {TenantService} from '../dist/tenants/service.js'
import {createApp} from '../dist/app.js'

test('explicit owner-only password login preserves sessions, RBAC, other MFA and rate limits',{timeout:90000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set(),password=randomBytes(24).toString('hex'),email='rxadmin@revexoe.com'
 await fixture.admin.query('CREATE DATABASE magicreview_migration_password_only CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_password_only',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c));let server,token,refresh
 const keys={NODE_ENV:'test',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64')},auth=configuredAuth(pool,{...keys,AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:email})
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  assert.equal((await bootstrapPlatform(pool,{platformName:'Synthetic password owner',email,displayName:'Synthetic owner',password})).created,true)
  await assert.rejects(bootstrapPlatform(pool,{platformName:'Synthetic password owner',email:'second@example.invalid',displayName:'Second owner',password}),e=>e.status===409)
  const defaultAuth=configuredAuth(pool,keys);assert.equal((await defaultAuth.login(email,password)).mfaRequired,true)
  server=createServer(createApp({env,auth,tenants:new TenantService(pool,auth),checkDatabase:async()=>{},isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port+'/api/v1'
  const post=(path,body,access)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify(body)})
  await t.test('wrong password rejected; correct password issues pwd-only tokens with no MFA enrollment',async()=>{
   assert.equal((await post('/auth/login',{email,password:'wrong-private-password'})).status,401)
   const r=await post('/auth/login',{email,password});assert.equal(r.status,200);const b=await r.json();token=b.accessToken;refresh=b.refreshToken;assert.ok(token&&refresh);assert.equal(b.mfaRequired,undefined)
   const principal=await auth.authenticate(token);assert.deepEqual(principal.identity.amr,['pwd']);assert.equal((await pool.query('SELECT COUNT(*) AS n FROM user_mfa WHERE secret_cipher IS NOT NULL OR pending_cipher IS NOT NULL OR enabled_at IS NOT NULL'))[0][0].n,'0')
   assert.equal((await post('/auth/mfa/enrollment',{challengeToken:refresh})).status,401)
  })
  await t.test('platform selection and permissions required; unknown membership and anonymous access refused',async()=>{
   assert.equal((await fetch(base+'/tenants')).status,401);assert.equal((await fetch(base+'/tenants',{headers:{Authorization:'Bearer '+token}})).status,403)
   const me=await auth.me(await auth.authenticate(token));assert.equal(me.memberships.length,1)
   assert.equal((await post('/auth/select-tenant',{membershipId:'999999999'},token)).status,403)
   const selected=await post('/auth/select-tenant',{membershipId:me.memberships[0].membershipId},token);assert.equal(selected.status,200);token=(await selected.json()).accessToken
   const principal=await auth.authenticate(token);auth.authorization.platform(principal.membership);assert.equal(principal.membership.roleCode,'super_admin');assert.equal((await fetch(base+'/tenants',{headers:{Authorization:'Bearer '+token}})).status,200)
  })
  await t.test('disabling exception or changing target email fails old pwd-only sessions closed; other admin still requires MFA',async()=>{
   await assert.rejects(defaultAuth.authenticate(token),e=>e.status===401);await assert.rejects(defaultAuth.refresh(refresh),e=>e.status===401)
   // Only one synthetic owner exists. Rename that disposable identity to prove
   // an unlisted Super Admin is not exempt; no second production owner is created.
   await pool.execute('UPDATE users SET email=?,email_key=?',['other@example.invalid',Buffer.from('other@example.invalid')])
   const other=await auth.login('other@example.invalid',password);assert.equal(other.mfaRequired,true);assert.equal(other.accessToken,undefined);await assert.rejects(auth.authenticate(token),e=>e.status===401)
   await pool.execute('UPDATE users SET email=?,email_key=?',[email,Buffer.from(email)])
  })
  await t.test('logout revokes owner session; login abuse remains rate-limited',async()=>{
   assert.equal((await post('/auth/logout',{},token)).status,204);await assert.rejects(auth.authenticate(token),e=>e.status===401)
   let limited=false;for(let i=0;i<21;i++){const r=await post('/auth/login',{email,password:'incorrect-password'});if(r.status===429){limited=true;break}assert.equal(r.status,401)}assert.equal(limited,true)
   const restarted=configuredAuth(pool,{...keys,AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:email});await assert.rejects(restarted.login(email,password),e=>e.status===429)
  })
 }finally{if(server)await new Promise(r=>server.close(r));for(const c of sessions)c.destroy();await pool.end();await fixture.close()}
})
