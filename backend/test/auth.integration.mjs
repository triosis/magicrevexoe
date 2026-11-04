import assert from 'node:assert/strict'
import {test} from 'node:test'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {randomBytes} from 'node:crypto'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from '../dist/auth/service.js'
import {hashPassword} from '../dist/auth/passwords.js'
import {opaqueToken,tokenDigest} from '../dist/auth/tokens.js'
import {createApp} from '../dist/app.js'
import {platformOnly,tenantAccess,activeMembership,requirePermission} from '../dist/auth/authorization.js'
import {errorHandler} from '../dist/middleware/error-handler.js'
import express from 'express'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'

test('authentication and authorization on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB()
 const sessions=new Set(),servers=[]
 await fixture.admin.query('CREATE DATABASE magicreview_migration_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:['https://revexoe.com'],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_auth',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c))
 async function query(sql,args=[]){const [rows]=await pool.execute(sql,args);return rows}
 async function insert(table,values){const columns=Object.keys(values);const result=await query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,Object.values(values));return String(result.insertId)}
 const delivered=[],password=randomBytes(24).toString('base64url')
 const service=new AuthService(pool,randomBytes(32),async message=>{delivered.push(message)})
 const roleIds={},users={},members={}
 let root,resellerA,resellerB,sub,merchantA,merchantB,direct,resellerDirect,base
 const pair=()=>randomBytes(16)
 async function start(app){const server=createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');servers.push(server);return `http://127.0.0.1:${server.address().port}`}
 async function request(path,body,token,extra={}){
  const response=await fetch(base+'/api/v1/auth/'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})})
  return {status:response.status,headers:response.headers,body:response.status===204?null:await response.json()}
 }
 async function login(key='merchant'){return service.login(users[key].email,password)}
 async function selected(key='merchant'){
  const tokens=await login(key),principal=await service.authenticate(tokens.accessToken)
  const selection=await service.selectTenant(principal,members[key])
  return service.authenticate(selection.accessToken)
 }
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  for(const r of await query('SELECT id,code FROM roles'))roleIds[r.code]=r.id
  const channel=(await query("SELECT id FROM industry_channels WHERE code='salon_spa'"))[0].id
  root=await insert('tenants',{public_id:pair(),kind:'platform',name:'Fixture platform'})
  async function tenant(kind,parent,parentKind){return insert('tenants',{public_id:pair(),kind,parent_id:parent,parent_kind:parentKind,name:'Fixture tenant',...(kind==='merchant'?{industry_channel_id:channel}:{})})}
  resellerA=await tenant('reseller',root,'platform');resellerB=await tenant('reseller',root,'platform')
  sub=await tenant('sub_reseller',resellerA,'reseller');merchantA=await tenant('merchant',sub,'sub_reseller')
  merchantB=await tenant('merchant',resellerB,'reseller');direct=await tenant('merchant',root,'platform');resellerDirect=await tenant('merchant',resellerA,'reseller')
  const encoded=await hashPassword(password)
  for(const [key,tenantId,kind,role] of [['super',root,'platform','super_admin'],['reseller',resellerA,'reseller','reseller_admin'],['peer',resellerB,'reseller','reseller_admin'],['sub',sub,'sub_reseller','sub_reseller_admin'],['merchant',merchantA,'merchant','merchant_admin'],['other',merchantB,'merchant','merchant_admin'],['direct',direct,'merchant','merchant_admin'],['staff',merchantA,'merchant','merchant_staff']]){
   const email=key+'@example.invalid'
   const id=await insert('users',{public_id:pair(),email,email_key:Buffer.from(email),display_name:'Fixture user',password_hash:encoded,status:'active',email_verified_at:new Date()})
   users[key]={id,email}
   members[key]=await insert('tenant_memberships',{tenant_id:tenantId,tenant_kind:kind,user_id:id,role_id:roleIds[role],status:'active'})
  }
  base=await start(createApp({env,checkDatabase:async()=>{},isShuttingDown:()=>false,auth:service}))

  await t.test('successful HTTP login, selection and me; no cookies and strict request validation',async()=>{
   const result=await request('login',{email:users.merchant.email.toUpperCase(),password})
   assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(result.headers.get('set-cookie'),null)
   assert.equal((await request('me',undefined,result.body.accessToken)).body.selectedMembership,null)
   const selected=await request('select-tenant',{membershipId:members.merchant},result.body.accessToken)
   assert.equal(selected.status,200)
   const me=await request('me',undefined,selected.body.accessToken)
   assert.equal(me.status,200);assert.equal(me.body.selectedMembership.tenantId,merchantA);assert.equal(me.body.mfaImplemented,false)
   assert.equal((await request('select-tenant',{membershipId:members.merchant,role_id:roleIds.super_admin},result.body.accessToken)).status,400)
   assert.equal((await request('me',undefined,undefined,{Cookie:'accessToken='+result.body.accessToken})).status,401)
  })
  await t.test('invalid, nonexistent, unverified, locked and disabled users get identical credentials errors',async()=>{
   const invalid=await request('login',{email:users.merchant.email,password:'incorrect'})
   assert.equal(invalid.status,401)
   assert.deepEqual((await request('login',{email:'unknown@example.invalid',password})).body,invalid.body)
   for(const status of ['locked','disabled']){
    await query('UPDATE users SET status=? WHERE id=?',[status,users.other.id])
    const result=await request('login',{email:users.other.email,password});assert.equal(result.status,401);assert.deepEqual(result.body,invalid.body)
   }
   await query("UPDATE users SET status='active',email_verified_at=NULL WHERE id=?",[users.other.id])
   assert.deepEqual((await request('login',{email:users.other.email,password})).body,invalid.body)
   await query('UPDATE users SET email_verified_at=UTC_TIMESTAMP(6) WHERE id=?',[users.other.id])
  })
  await t.test('refresh rotates opaque digests and replay revokes the entire family durably',async()=>{
   const old=await login()
   const refreshed=await request('refresh',{refreshToken:old.refreshToken});assert.equal(refreshed.status,200);assert.notEqual(refreshed.body.refreshToken,old.refreshToken)
   await assert.rejects(service.authenticate(old.accessToken))
   assert.ok(await service.authenticate(refreshed.body.accessToken))
   assert.equal((await request('refresh',{refreshToken:old.refreshToken})).status,401)
   await assert.rejects(service.authenticate(refreshed.body.accessToken))
   await assert.rejects(service.refresh(refreshed.body.refreshToken))
   const [[row]]=await pool.execute('SELECT token_hash FROM auth_sessions WHERE token_hash=?',[tokenDigest(old.refreshToken)])
   assert.ok(row.token_hash.equals(tokenDigest(old.refreshToken)))
  })
  await t.test('concurrent refresh replay invalidates the winning rotation too',async()=>{
   const tokens=await login('reseller')
   const outcomes=await Promise.allSettled([service.refresh(tokens.refreshToken),service.refresh(tokens.refreshToken)])
   assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1)
   const winner=outcomes.find(x=>x.status==='fulfilled').value
   await assert.rejects(service.authenticate(winner.accessToken))
  })
  await t.test('logout, status changes and authentication version changes revoke access/refresh',async()=>{
   const tokens=await login()
   assert.equal((await request('logout',{},tokens.accessToken)).status,204)
   await assert.rejects(service.authenticate(tokens.accessToken));await assert.rejects(service.refresh(tokens.refreshToken))
   const active=await login('other')
   await query('UPDATE users SET auth_version=auth_version+1 WHERE id=?',[users.other.id])
   await assert.rejects(service.authenticate(active.accessToken));await assert.rejects(service.refresh(active.refreshToken))
   const disabled=await login('other');await query("UPDATE users SET status='disabled' WHERE id=?",[users.other.id])
   await assert.rejects(service.authenticate(disabled.accessToken));await assert.rejects(service.refresh(disabled.refreshToken))
   await query("UPDATE users SET status='active' WHERE id=?",[users.other.id])
  })
  await t.test('password reset is generic, digest-only, single-use and revokes all prior sessions',async()=>{
   const current=await login('direct')
   const unknown=await request('forgot-password',{email:'absent@example.invalid'})
   const known=await request('forgot-password',{email:users.direct.email})
   assert.equal(known.status,202);assert.deepEqual(known.body,unknown.body)
   const message=delivered.find(x=>x.email===users.direct.email);assert.ok(message)
   const row=(await query("SELECT token_hash FROM auth_tokens WHERE user_id=? AND purpose='reset_password' AND consumed_at IS NULL",[users.direct.id]))[0]
   assert.ok(row.token_hash.equals(tokenDigest(message.token)))
   const next=randomBytes(24).toString('base64url')
   assert.equal((await request('reset-password',{token:message.token,password:next})).status,204)
   assert.equal((await request('reset-password',{token:message.token,password:next})).status,401)
   await assert.rejects(service.authenticate(current.accessToken));await assert.rejects(service.refresh(current.refreshToken))
   await assert.rejects(login('direct'));assert.ok(await service.login(users.direct.email,next))
  })
  await t.test('invitation activation is atomic and cannot reuse its token or overwrite an active identity password',async()=>{
   const email='invited@example.invalid',id=await insert('users',{public_id:pair(),email,email_key:Buffer.from(email),display_name:'Invited'})
   const membership=await insert('tenant_memberships',{tenant_id:merchantA,tenant_kind:'merchant',user_id:id,role_id:roleIds.merchant_staff})
   const token=opaqueToken();await insert('auth_tokens',{user_id:id,tenant_id:merchantA,purpose:'invite',token_hash:tokenDigest(token),expires_at:new Date(Date.now()+3600000)})
   const input={token,password}
   assert.equal((await request('accept-invitation',input)).status,204)
   assert.equal((await query('SELECT status FROM tenant_memberships WHERE id=?',[membership]))[0].status,'active')
   assert.equal((await request('accept-invitation',input)).status,401);assert.ok(await service.login(email,password))
   await insert('tenant_memberships',{tenant_id:merchantB,tenant_kind:'merchant',user_id:id,role_id:roleIds.merchant_staff})
   const second=opaqueToken();await insert('auth_tokens',{user_id:id,tenant_id:merchantB,purpose:'invite',token_hash:tokenDigest(second),expires_at:new Date(Date.now()+3600000)})
   assert.equal((await request('accept-invitation',{token:second,password:'UnauthorizedNewPassword1!'})).status,401)
   assert.ok(await service.login(email,password))
   assert.equal((await request('accept-invitation',{token:second,password})).status,204)
  })
  await t.test('membership ownership and revocation are revalidated on every request',async()=>{
   const tokens=await login()
   assert.equal((await request('select-tenant',{membershipId:members.other},tokens.accessToken)).status,403)
   const selection=await request('select-tenant',{membershipId:members.merchant},tokens.accessToken)
   await query("UPDATE tenant_memberships SET status='revoked' WHERE id=?",[members.merchant])
   assert.equal((await request('me',undefined,selection.body.accessToken)).status,403)
   await query("UPDATE tenant_memberships SET status='active' WHERE id=?",[members.merchant])
  })
  await t.test('role changes invalidate cached privileges without trusting token claims',async()=>{
   const tokens=await login(),selection=await service.selectTenant(await service.authenticate(tokens.accessToken),members.merchant)
   assert.ok((await service.authenticate(selection.accessToken)).membership.permissions.includes('branch.manage'))
   await query('UPDATE tenant_memberships SET role_id=? WHERE id=?',[roleIds.merchant_staff,members.merchant])
   const principal=await service.authenticate(selection.accessToken)
   assert.equal(principal.membership.roleCode,'merchant_staff')
   assert.equal(principal.membership.permissions.includes('branch.manage'),false)
   await query('UPDATE tenant_memberships SET role_id=? WHERE id=?',[roleIds.merchant_admin,members.merchant])
  })
  await t.test('expired credentials and simultaneous reset reuse fail safely',async()=>{
   const email='reset-race@example.invalid',id=await insert('users',{public_id:pair(),email,email_key:Buffer.from(email),display_name:'Recovery race fixture',password_hash:encoded,status:'active',email_verified_at:new Date()})
   const token=opaqueToken()
   await insert('auth_tokens',{user_id:id,purpose:'reset_password',token_hash:tokenDigest(token),expires_at:new Date(Date.now()+3600000)})
   const outcomes=await Promise.allSettled([service.consumeToken(token,password,'reset_password'),service.consumeToken(token,password,'reset_password')])
   assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1)
   const expired=opaqueToken()
   await insert('auth_tokens',{user_id:id,purpose:'reset_password',token_hash:tokenDigest(expired),created_at:'2000-01-01',expires_at:'2000-01-02'})
   await assert.rejects(service.consumeToken(expired,password,'reset_password'))
   const refresh=opaqueToken()
   await insert('auth_sessions',{user_id:id,token_hash:tokenDigest(refresh),family_id:pair(),auth_version:2,created_at:'2000-01-01',expires_at:'2000-01-02'})
   await assert.rejects(service.refresh(refresh))
  })
  await t.test('suspended ancestor rejects selection and preexisting selected access',async()=>{
   const tokens=await login()
   const selection=await service.selectTenant(await service.authenticate(tokens.accessToken),members.merchant)
   await query("UPDATE tenants SET status='suspended' WHERE id=?",[resellerA])
   await assert.rejects(service.authenticate(selection.accessToken))
   await assert.rejects(service.selectTenant(await service.authenticate(tokens.accessToken),members.merchant))
   await query("UPDATE tenants SET status='active' WHERE id=?",[resellerA])
  })
  await t.test('actual ancestry includes direct merchants and rejects peers/cross-merchant scope',async()=>{
   const reseller=(await selected('reseller')).membership,subMember=(await selected('sub')).membership,merchant=(await selected()).membership
   await service.authorization.tenant(reseller,merchantA,'feedback.read',true)
   await service.authorization.tenant(reseller,resellerDirect,'feedback.read',true)
   await assert.rejects(service.authorization.tenant(reseller,resellerB,'tenant.read'))
   await assert.rejects(service.authorization.tenant(reseller,merchantB,'feedback.read'))
   await assert.rejects(service.authorization.tenant(reseller,direct,'feedback.read'))
   await assert.rejects(service.authorization.tenant(subMember,resellerDirect,'feedback.read'))
   await assert.rejects(service.authorization.tenant(merchant,merchantB,'feedback.read'))
   await service.authorization.tenant(merchant,merchantA,'feedback.read',true)
  })
  await t.test('provisioning and role assignment reject sub-reseller/merchant escalation',async()=>{
   const reseller=(await selected('reseller')).membership,subMember=(await selected('sub')).membership,merchant=(await selected()).membership,staff=(await selected('staff')).membership
   await service.authorization.provision(reseller,resellerA,'sub_reseller')
   await service.authorization.provision(reseller,resellerA,'merchant')
   await service.authorization.provision(subMember,sub,'merchant')
   await assert.rejects(service.authorization.provision(subMember,sub,'sub_reseller'))
   await assert.rejects(service.authorization.provision(merchant,merchantA,'merchant'))
   await service.authorization.assignRole(reseller,merchantA,roleIds.merchant_staff)
   await assert.rejects(service.authorization.assignRole(reseller,resellerB,roleIds.reseller_admin))
   await assert.rejects(service.authorization.assignRole(reseller,resellerA,roleIds.reseller_admin))
   await assert.rejects(service.authorization.assignRole(subMember,sub,roleIds.sub_reseller_admin))
   await assert.rejects(service.authorization.assignRole(merchant,merchantA,roleIds.super_admin))
   await assert.rejects(service.authorization.assignRole(staff,merchantA,roleIds.merchant_admin))
  })
  await t.test('Super Admin requires selected platform scope and the explicit platform path',async()=>{
   const tokens=await login('super'),unselected=await service.authenticate(tokens.accessToken)
   assert.equal(unselected.membership,undefined)
   const superMember=(await selected('super')).membership
   await service.authorization.platformTarget(superMember,merchantB)
   await service.authorization.provision(superMember,root,'merchant')
   await assert.rejects(service.authorization.tenant(superMember,merchantB,'feedback.read'))
   const merchant=(await selected()).membership
   assert.throws(()=>service.authorization.platform(merchant))
   const app=express();app.use(service.authentication())
   app.get('/platform',platformOnly(),(_request,response)=>response.json({ok:true}))
   app.get('/branches',activeMembership(),requirePermission('branch.manage'),(_request,response)=>response.json({ok:true}))
   app.get('/merchant/:id',tenantAccess(service.authorization,r=>r.params.id,'feedback.read',true),(_request,response)=>response.json({ok:true}))
   app.use(errorHandler)
   const url=await start(app),selectedToken=await service.selectTenant(await service.authenticate(tokens.accessToken),members.super)
   assert.equal((await fetch(url+'/platform',{headers:{Authorization:'Bearer '+tokens.accessToken}})).status,403)
   assert.equal((await fetch(url+'/platform',{headers:{Authorization:'Bearer '+selectedToken.accessToken}})).status,200)
   assert.equal((await fetch(url+'/branches',{headers:{Authorization:'Bearer '+selectedToken.accessToken}})).status,403)
   const m=await login(),mToken=await service.selectTenant(await service.authenticate(m.accessToken),members.merchant)
   assert.equal((await fetch(url+'/platform',{headers:{Authorization:'Bearer '+mToken.accessToken}})).status,403)
   assert.equal((await fetch(url+'/merchant/'+merchantA,{headers:{Authorization:'Bearer '+mToken.accessToken}})).status,200)
   assert.equal((await fetch(url+'/merchant/'+merchantB,{headers:{Authorization:'Bearer '+mToken.accessToken}})).status,403)
  })
  await t.test('CORS denies unknown origins; spoofed forwarding cannot evade login limiting',async()=>{
   assert.equal((await request('login',{email:users.merchant.email,password},undefined,{Origin:'https://untrusted.invalid'})).status,403)
   const response=await fetch(base+'/api/v1/auth/login',{method:'OPTIONS',headers:{Origin:'https://revexoe.com','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}})
   assert.equal(response.status,204);assert.match(response.headers.get('access-control-allow-headers'),/Authorization/)
   const isolated=await start(createApp({env,checkDatabase:async()=>{},isShuttingDown:()=>false,auth:service})),saved=base;base=isolated
   try{for(let i=0;i<10;i++)assert.equal((await request('login',{email:'rate@example.invalid',password:'wrong'},undefined,{'X-Forwarded-For':'192.0.2.'+i})).status,401)
    const limited=await request('login',{email:'rate@example.invalid',password:'wrong'});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'900')
   }finally{base=saved}
  })
 }finally{for(const server of servers)await new Promise(resolve=>server.close(resolve));for(const c of sessions)c.destroy();await new Promise(resolve=>setImmediate(resolve));await pool.end();await fixture.close()}
})
