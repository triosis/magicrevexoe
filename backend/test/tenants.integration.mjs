import {fundTestMerchant} from './quota-fixtures.mjs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {randomBytes} from 'node:crypto'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from '../dist/auth/service.js'
import {hashPassword} from '../dist/auth/passwords.js'
import {tokenDigest} from '../dist/auth/tokens.js'
import {TenantService} from '../dist/tenants/service.js'
import {createApp} from '../dist/app.js'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'

test('tenant management on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set(),servers=[]
 await fixture.admin.query('CREATE DATABASE magicreview_migration_tenants CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:['https://revexoe.com'],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_tenants',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:6}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c))
 const password=randomBytes(24).toString('base64url'),messages=[],verified=[]
 const auth=new AuthService(pool,randomBytes(32))
 const delivery={kind:'test',async verify(){verified.push(true)},async send(message){messages.push(message)}}
 const tenants=new TenantService(pool,auth,delivery),actors={},roles={}
 let root,reseller,peer,sub,merchant,peerMerchant,direct,base,number=0
 async function query(sql,args=[]){const [rows]=await pool.execute(sql,args);return rows}
 async function insert(table,values){const names=Object.keys(values);return String((await query(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(()=>'?').join(',')})`,Object.values(values))).insertId)}
 async function start(service=tenants){const server=createServer(createApp({env,checkDatabase:async()=>{},isShuttingDown:()=>false,auth,tenants:service}));server.listen(0,'127.0.0.1');await once(server,'listening');servers.push(server);return`http://127.0.0.1:${server.address().port}`}
 async function request(method,path,actor,body,url=base){
  const response=await fetch(url+'/api/v1/tenants'+path,{method,headers:{...(actor?{Authorization:'Bearer '+actors[actor].token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  return{status:response.status,body:await response.json(),headers:response.headers}
 }
 const input=(parentId,kind,extra={})=>({parentId,kind,name:'Created account '+(++number),...(kind==='merchant'?{industryChannelCode:'clinic_healthcare'}:{}),invitation:{email:`invite${number}@example.invalid`,displayName:'Invited account admin'},...extra})
 const count=async table=>(await query(`SELECT COUNT(*) AS n FROM ${table}`))[0].n
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  for(const row of await query('SELECT id,code FROM roles'))roles[row.code]=row.id
  const channel=(await query("SELECT id FROM industry_channels WHERE code='salon_spa'"))[0].id
  root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'Platform fixture'})
  async function tenant(kind,parent,parentKind){return insert('tenants',{public_id:randomBytes(16),kind,parent_id:parent,parent_kind:parentKind,name:'Fixture account',...(kind==='merchant'?{industry_channel_id:channel}:{})})}
  reseller=await tenant('reseller',root,'platform');peer=await tenant('reseller',root,'platform');sub=await tenant('sub_reseller',reseller,'reseller');merchant=await tenant('merchant',sub,'sub_reseller');peerMerchant=await tenant('merchant',peer,'reseller');direct=await tenant('merchant',root,'platform')
  const encoded=await hashPassword(password)
  for(const [key,id,kind,role] of [['super',root,'platform','super_admin'],['reseller',reseller,'reseller','reseller_admin'],['peer',peer,'reseller','reseller_admin'],['sub',sub,'sub_reseller','sub_reseller_admin'],['merchant',merchant,'merchant','merchant_admin'],['staff',merchant,'merchant','merchant_staff']]){
   const email=key+'@example.invalid'
   const userId=await insert('users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Fixture actor',password_hash:encoded,status:'active',email_verified_at:new Date()})
   const membershipId=await insert('tenant_memberships',{tenant_id:id,tenant_kind:kind,user_id:userId,role_id:roles[role],status:'active'})
   const login=await auth.login(email,password),selected=await auth.selectTenant(await auth.authenticate(login.accessToken),membershipId)
   actors[key]={userId,membershipId,token:selected.accessToken,principal:await auth.authenticate(selected.accessToken)}
  }
  base=await start()
  await t.test('all five approved provisioning relationships are atomic and derive initial administrator roles',async()=>{
   for(const [actor,parentId,kind,role] of [['super',root,'reseller','reseller_admin'],['super',root,'merchant','merchant_admin'],['reseller',reseller,'sub_reseller','sub_reseller_admin'],['reseller',reseller,'merchant','merchant_admin'],['sub',sub,'merchant','merchant_admin']]){
    const body=input(parentId,kind),result=await request('POST','',actor,body)
    assert.equal(result.status,201);assert.equal(result.body.tenant.parentId,parentId);assert.equal(result.body.tenant.kind,kind)
    assert.equal(result.body.invitation.roleCode,role);assert.equal(result.body.invitation.deliveryStatus,'test_delivered')
    assert.equal(result.headers.get('cache-control'),'no-store')
    const rows=await query('SELECT role_id,status FROM tenant_memberships WHERE tenant_id=?',[result.body.tenant.id])
    assert.equal(rows.length,1);assert.equal(rows[0].role_id,roles[role]);assert.equal(rows[0].status,'invited')
    const audits=await query("SELECT action FROM audit_logs WHERE tenant_id=? AND action IN ('tenant.created','tenant.invitation_created')",[result.body.tenant.id]);assert.equal(audits.length,2)
    const history=await request('GET','/'+result.body.tenant.id+'/history',actor);assert.ok(history.body.events.some(e=>e.action==='tenant.created'))
    const message=messages.find(m=>m.email===body.invitation.email);assert.ok(message)
    assert.ok(!JSON.stringify(result.body).includes(message.token))
    const tokens=await query("SELECT token_hash FROM auth_tokens WHERE tenant_id=? AND purpose='invite' AND consumed_at IS NULL",[result.body.tenant.id]);assert.equal(tokens.length,1);assert.ok(tokens[0].token_hash.equals(tokenDigest(message.token)))
   }
   assert.ok(verified.length>=5)
  })
  await t.test('every forbidden parent-kind combination and actor escalation is rejected',async()=>{
   const parents={platform:root,reseller,sub_reseller:sub,merchant},valid=new Set(['platform/reseller','platform/merchant','reseller/sub_reseller','reseller/merchant','sub_reseller/merchant'])
   for(const [parentKind,parentId]of Object.entries(parents))for(const kind of Object.keys(parents))if(!valid.has(parentKind+'/'+kind)){
    await assert.rejects(tenants.create(actors.super.principal,input(parentId,kind)),error=>error.status===403)
   }
   assert.equal((await request('POST','','sub',input(sub,'sub_reseller'))).status,403)
   assert.equal((await request('POST','','merchant',input(merchant,'merchant'))).status,403)
   assert.equal((await request('POST','','reseller',input(peer,'merchant'))).status,404)
   assert.equal((await request('POST','','super',input(root,'merchant',{status:'active',role_id:roles.super_admin})) ).status,400)
   assert.equal((await request('POST','','super',input(root,'merchant',{industryChannelCode:undefined}))).status,400)
  })
  await t.test('list/details/descendants/history remain scoped and paginated',async()=>{
   const list=await request('GET','?limit=2','reseller');assert.equal(list.status,200);assert.equal(list.body.accounts.length,2);assert.ok(list.body.nextCursor)
   const next=await request('GET','?limit=100&afterId='+list.body.nextCursor,'reseller')
   assert.ok(next.body.accounts.every(a=>BigInt(a.id)>BigInt(list.body.nextCursor)))
   const descendants=await request('GET','/'+reseller+'/descendants','reseller')
   assert.equal(descendants.status,200);assert.ok(descendants.body.accounts.some(a=>a.id===merchant));assert.ok(!descendants.body.accounts.some(a=>[reseller,peer,peerMerchant,direct].includes(a.id)))
   assert.equal((await request('GET','/'+peer,'reseller')).status,404)
   assert.equal((await request('GET','/'+peer+'/descendants','reseller')).status,404)
   assert.equal((await request('GET','/'+direct,'reseller')).status,404)
   assert.equal((await request('GET','/'+peerMerchant,'merchant')).status,404)
   const own=await request('GET','','merchant');assert.deepEqual(own.body.accounts.map(a=>a.id),[merchant])
   assert.equal((await request('GET','/'+merchant,'staff')).status,200)
   assert.equal((await request('GET','/'+merchant+'/history','staff')).status,403)
   assert.equal((await request('GET','?limit=101','super')).status,400)
   assert.equal((await request('GET','/1%20OR%201=1','super')).status,400)
  })
  await t.test('permitted updates preserve ownership, use optimistic versions and create history',async()=>{
   const old=await request('GET','/'+merchant,'merchant')
   const result=await request('PATCH','/'+merchant,'merchant',{name:'Renamed merchant',lockVersion:old.body.lockVersion})
   assert.equal(result.status,200);assert.equal(result.body.name,'Renamed merchant');assert.equal(result.body.lockVersion,old.body.lockVersion+1)
   assert.equal((await request('PATCH','/'+merchant,'merchant',{name:'Stale name',lockVersion:old.body.lockVersion})).status,409)
   assert.equal((await request('PATCH','/'+merchant,'staff',{name:'Forbidden',lockVersion:result.body.lockVersion})).status,403)
   assert.equal((await request('PATCH','/'+merchant,'merchant',{parentId:peer,name:'Spoof',lockVersion:result.body.lockVersion})).status,400)
   assert.equal((await request('PATCH','/'+peerMerchant,'merchant',{name:'Cross tenant',lockVersion:1})).status,404)
   const history=await request('GET','/'+merchant+'/history','merchant');assert.equal(history.status,200);assert.ok(history.body.events.some(e=>e.action==='tenant.updated'))
  })
  await t.test('authorized suspension/reinstatement preserves admins; suspended ancestors block effective access',async()=>{
   const before=await request('GET','/'+sub,'reseller')
   const suspended=await request('POST','/'+sub+'/suspend','reseller',{lockVersion:before.body.lockVersion});assert.equal(suspended.status,200)
   assert.equal((await request('GET','','sub')).status,403)
   assert.equal((await request('GET','','merchant')).status,403)
   const managed=await request('GET','/'+merchant,'reseller');assert.equal(managed.status,200);assert.equal(managed.body.effectiveStatus,'blocked')
   assert.equal((await request('POST','/'+merchant+'/reinstate','reseller',{lockVersion:managed.body.lockVersion})).status,403)
   assert.equal((await request('POST','/'+sub+'/reinstate','peer',{lockVersion:suspended.body.lockVersion})).status,404)
   assert.equal((await request('POST','/'+sub+'/reinstate','reseller',{lockVersion:suspended.body.lockVersion})).status,200)
   assert.equal((await request('GET','','merchant')).status,200)
   assert.equal((await query('SELECT status FROM tenant_memberships WHERE id=?',[actors.merchant.membershipId]))[0].status,'active')
   assert.equal((await request('POST','/'+merchant+'/suspend','merchant',{lockVersion:managed.body.lockVersion})).status,403)
   assert.equal((await request('POST','/'+root+'/suspend','super',{lockVersion:1})).status,403)
   assert.equal((await request('POST','/'+peer+'/suspend','reseller',{lockVersion:1})).status,404)
   assert.equal((await request('POST','/'+merchant+'/suspend','staff',{lockVersion:managed.body.lockVersion})).status,403)
  })
  await t.test('invitation acceptance activates only the bound membership and cannot leak raw tokens',async()=>{
   const email='new-staff@example.invalid'
   const result=await request('POST','/'+merchant+'/invitations','merchant',{email,displayName:'New Staff',roleCode:'merchant_staff'})
   assert.equal(result.status,201)
   const message=messages.find(m=>m.email===email);assert.ok(message)
   const invitedTenant=(await query('SELECT tenant_id FROM auth_tokens WHERE token_hash=?',[tokenDigest(message.token)]))[0].tenant_id
   await fundTestMerchant(pool,invitedTenant)
   await auth.consumeToken(message.token,password,'invite')
   const signed=await auth.login(email,password),selected=await auth.selectTenant(await auth.authenticate(signed.accessToken),result.body.membershipId)
   const principal=await auth.authenticate(selected.accessToken)
   assert.equal(principal.membership.tenantId,merchant);assert.equal(principal.membership.roleCode,'merchant_staff')
   const audits=await query("SELECT safe_metadata FROM audit_logs WHERE tenant_id=?",[merchant]);assert.ok(!JSON.stringify(audits).includes(message.token));assert.ok(!JSON.stringify(audits).includes(email))
   await assert.rejects(auth.consumeToken(message.token,password,'invite'))
  })
  await t.test('duplicates/resends/concurrent invitations cannot duplicate membership or replace an active administrator',async()=>{
   const email='pending@example.invalid',body={email,displayName:'Pending',roleCode:'merchant_staff'}
   const first=await request('POST','/'+merchant+'/invitations','merchant',body);assert.equal(first.status,201)
   const oldToken=messages.find(m=>m.email===email).token
   assert.equal((await request('POST','/'+merchant+'/invitations','merchant',body)).status,409)
   const resent=await request('POST','/'+merchant+'/invitations','merchant',{...body,resend:true});assert.equal(resent.status,201);assert.equal(resent.body.membershipId,first.body.membershipId)
   await assert.rejects(auth.consumeToken(oldToken,password,'invite'))
   const users=await query('SELECT id FROM users WHERE email_key=?',[Buffer.from(email)])
   assert.equal((await query('SELECT COUNT(*) AS n FROM tenant_memberships WHERE tenant_id=? AND user_id=?',[merchant,users[0].id]))[0].n,'1')
   assert.equal((await query("SELECT COUNT(*) AS n FROM auth_tokens WHERE tenant_id=? AND user_id=? AND purpose='invite' AND consumed_at IS NULL",[merchant,users[0].id]))[0].n,'1')
   const race={email:'race@example.invalid',displayName:'Race',roleCode:'merchant_staff'}
   const outcomes=await Promise.allSettled([tenants.invite(actors.merchant.principal,merchant,race),tenants.invite(actors.reseller.principal,merchant,race)])
   assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1)
   const last=await request('POST','/'+merchant+'/invitations','merchant',{email:'merchant@example.invalid',displayName:'Do not replace',roleCode:'merchant_staff',resend:true})
   assert.equal(last.status,409)
   const admin=(await query('SELECT role_id,status FROM tenant_memberships WHERE id=?',[actors.merchant.membershipId]))[0];assert.equal(admin.role_id,roles.merchant_admin);assert.equal(admin.status,'active')
  })
  await t.test('role/identity selectors cannot escalate privileges or modify global profiles',async()=>{
   assert.equal((await request('POST','/'+merchant+'/invitations','staff',{email:'bad@example.invalid',displayName:'Bad',roleCode:'merchant_admin'})).status,403)
   assert.equal((await request('POST','/'+reseller+'/invitations','reseller',{email:'peer-admin@example.invalid',displayName:'Bad',roleCode:'reseller_admin'})).status,403)
   assert.equal((await request('POST','/'+sub+'/invitations','sub',{email:'sub-peer@example.invalid',displayName:'Bad',roleCode:'sub_reseller_admin'})).status,403)
   assert.equal((await request('POST','/'+merchant+'/invitations','merchant',{email:'bad@example.invalid',displayName:'Bad',roleCode:'super_admin'})).status,400)
   assert.equal((await request('POST','/'+peerMerchant+'/invitations','merchant',{email:'cross@example.invalid',displayName:'Bad'})).status,404)
   const result=await request('POST','/'+direct+'/invitations','super',{email:'merchant@example.invalid',displayName:'Overwrite forbidden',roleCode:'merchant_staff'});assert.equal(result.status,201)
   const existing=(await query('SELECT display_name,status FROM users WHERE id=?',[actors.merchant.userId]))[0];assert.equal(existing.display_name,'Fixture actor');assert.equal(existing.status,'active')
  })
  await t.test('failure of the final invitation audit rolls back tenant, user, membership, token and creation audit',async()=>{
   await query("CREATE TRIGGER fixture_reject_invitation_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='tenant.invitation_created' AND EXISTS (SELECT 1 FROM tenants WHERE id=NEW.tenant_id AND name='Rollback fixture') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit rejection'; END IF; END")
   const tables=['tenants','users','tenant_memberships','auth_tokens','audit_logs'],before=await Promise.all(tables.map(count)),sent=messages.length
   await assert.rejects(tenants.create(actors.super.principal,input(root,'merchant',{name:'Rollback fixture'})))
   assert.deepEqual(await Promise.all(tables.map(count)),before);assert.equal(messages.length,sent)
  })
  await t.test('unconfigured/unverified delivery refuses writes; send failure is explicit after commit and can be resent',async()=>{
   const before=await count('tenants')
   const none=new TenantService(pool,auth)
   await assert.rejects(none.create(actors.super.principal,input(root,'merchant')),e=>e.status===503)
   const bad=new TenantService(pool,auth,{kind:'test',async verify(){throw Error('Sensitive verification fixture')},async send(){throw Error('Must not run')}})
   await assert.rejects(bad.create(actors.super.principal,input(root,'merchant')),e=>e.status===503)
   assert.equal(await count('tenants'),before)
   const failed=new TenantService(pool,auth,{kind:'test',async verify(){},async send(){throw Error('Sensitive transport fixture')}})
   const original=console.error,logs=[];console.error=(...args)=>logs.push(args.join(' '))
   let created
   try{created=await failed.create(actors.super.principal,input(root,'merchant'))}finally{console.error=original}
   assert.equal(created.invitation.deliveryStatus,'failed');assert.ok(logs.every(log=>!log.includes('Sensitive')))
   const messageInput=(await query('SELECT u.email FROM users u JOIN tenant_memberships m ON m.user_id=u.id WHERE m.id=?',[created.invitation.membershipId]))[0]
   const resend=await tenants.invite(actors.super.principal,created.tenant.id,{email:messageInput.email,displayName:'Retry',resend:true})
   assert.equal(resend.deliveryStatus,'test_delivered')
  })
  await t.test('stale principals are revalidated inside each transaction and PATCH CORS is explicit',async()=>{
   await query("UPDATE tenant_memberships SET status='revoked' WHERE id=?",[actors.reseller.membershipId])
   await assert.rejects(tenants.get(actors.reseller.principal,reseller),e=>e.status===403)
   await query("UPDATE tenant_memberships SET status='active' WHERE id=?",[actors.reseller.membershipId])
   const response=await fetch(base+'/api/v1/tenants/'+merchant,{method:'OPTIONS',headers:{Origin:'https://revexoe.com','Access-Control-Request-Method':'PATCH','Access-Control-Request-Headers':'authorization,content-type'}})
   assert.equal(response.status,204);assert.match(response.headers.get('access-control-allow-methods'),/PATCH/)
   assert.equal((await request('GET','',null)).status,401)
   const logins=await auth.login('merchant@example.invalid',password)
   const response2=await fetch(base+'/api/v1/tenants',{headers:{Authorization:'Bearer '+logins.accessToken}});assert.equal(response2.status,403)
  })
 }finally{for(const s of servers)await new Promise(resolve=>s.close(resolve));for(const c of sessions)c.destroy();await new Promise(resolve=>setImmediate(resolve));await pool.end();await fixture.close()}
})
