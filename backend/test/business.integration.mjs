import assert from 'node:assert/strict'
import {test} from 'node:test'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {randomBytes} from 'node:crypto'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from '../dist/auth/service.js'
import {hashPassword} from '../dist/auth/passwords.js'
import {TenantService} from '../dist/tenants/service.js'
import {BusinessService} from '../dist/business/service.js'
import {createApp} from '../dist/app.js'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'

test('merchant business APIs on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set()
 await fixture.admin.query('CREATE DATABASE magicreview_migration_business CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:['https://revexoe.com'],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_business',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c))
 const auth=new AuthService(pool,randomBytes(32)),messages=[]
 const tenants=new TenantService(pool,auth,{kind:'test',async verify(){},async send(m){messages.push(m)}})
 const business=new BusinessService(tenants,auth),actors={},channels={},roles={}
 const password=randomBytes(24).toString('base64url')
 let root,reseller,peer,sub,merchant,peerMerchant,direct,base,server,branch,otherBranch,version,destination,channel
 async function query(sql,args=[]){const [rows]=await pool.execute(sql,args);return rows}
 async function insert(table,values){const keys=Object.keys(values);return String((await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(values))).insertId)}
 async function request(method,path,actor,body){const response=await fetch(base+'/api/v1'+path,{method,headers:{...(actor?{Authorization:'Bearer '+actors[actor].token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()}}
 async function getBranch(id=branch){return(await request('GET','/branches/'+id,'merchant')).body}
 const branchInput={code:'main',name:'Main branch',timezone:'Asia/Kolkata',address:'Example business address'}
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  for(const c of await query('SELECT * FROM industry_channels'))channels[c.code]=c.id
  for(const r of await query('SELECT * FROM roles'))roles[r.code]=r.id
  channel=channels.salon_spa
  root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'Fixture platform'})
  async function tenant(kind,parent,parentKind){return insert('tenants',{public_id:randomBytes(16),kind,parent_id:parent,parent_kind:parentKind,name:'Fixture tenant',...(kind==='merchant'?{industry_channel_id:channel}:{})})}
  reseller=await tenant('reseller',root,'platform');peer=await tenant('reseller',root,'platform');sub=await tenant('sub_reseller',reseller,'reseller')
  merchant=await tenant('merchant',sub,'sub_reseller');peerMerchant=await tenant('merchant',peer,'reseller');direct=await tenant('merchant',root,'platform')
  const encoded=await hashPassword(password)
  for(const [key,id,kind,role]of [['super',root,'platform','super_admin'],['reseller',reseller,'reseller','reseller_admin'],['peer',peer,'reseller','reseller_admin'],['sub',sub,'sub_reseller','sub_reseller_admin'],['merchant',merchant,'merchant','merchant_admin'],['other',peerMerchant,'merchant','merchant_admin'],['staff',merchant,'merchant','merchant_staff']]){
   const email=key+'@example.invalid'
   const userId=await insert('users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Fixture actor',password_hash:encoded,status:'active',email_verified_at:new Date()})
   const membershipId=await insert('tenant_memberships',{tenant_id:id,tenant_kind:kind,user_id:userId,role_id:roles[role],status:'active'})
   const login=await auth.login(email,password),selected=await auth.selectTenant(await auth.authenticate(login.accessToken),membershipId)
   actors[key]={token:selected.accessToken,principal:await auth.authenticate(selected.accessToken)}
  }
  server=createServer(createApp({env,auth,tenants,business,checkDatabase:async()=>{},isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port
  await t.test('all active account types can read the three seeded channels, with no drafts exposed',async()=>{
   for(const actor of Object.keys(actors)){const r=await request('GET','/industry-channels',actor);assert.equal(r.status,200);assert.equal(r.body.channels.length,3)}
   assert.equal((await request('GET','/industry-channels',null)).status,401)
   assert.equal((await request('GET','/industry-channels/'+channels.clinic_healthcare,'staff')).body.name,'Clinic & Healthcare')
   assert.deepEqual((await request('GET','/industry-channels/'+channel+'/versions','merchant')).body.versions,[])
  })
  await t.test('only selected platform administrators manage drafts and published versions remain immutable',async()=>{
   for(const actor of ['reseller','sub','merchant','staff'])assert.equal((await request('POST','/industry-channels/'+channel+'/versions',actor,{version:1,displayName:'Salon',title:'Share your experience'})).status,403)
   const created=await request('POST','/industry-channels/'+channel+'/versions','super',{version:1,displayName:'Salon',title:'Share your experience'})
   assert.equal(created.status,201);version=created.body.id
   assert.equal((await request('GET',`/industry-channels/${channel}/versions/${version}`,'merchant')).status,404)
   assert.equal((await request('PATCH',`/industry-channels/${channel}/versions/${version}`,'super',{title:'Tell us about your visit'})).status,200)
   assert.equal((await request('PATCH',`/industry-channels/${channel}/versions/${version}`,'super',{googleVisible:false})).status,400)
   const published=await request('POST',`/industry-channels/${channel}/versions/${version}/publish`,'super',{});assert.equal(published.status,200)
   assert.equal(published.body.publicCopy.google_label,'Leave a Google review');assert.equal(published.body.publicCopy.private_label,'Share private feedback')
   assert.equal((await request('PATCH',`/industry-channels/${channel}/versions/${version}`,'super',{title:'Changed'})).status,409)
   assert.equal((await request('POST','/industry-channels/'+channel+'/versions','super',{version:1,displayName:'Duplicate',title:'Same'})).status,409)
   await assert.rejects(query("UPDATE channel_versions SET display_name='changed' WHERE id=?",[version]))
   assert.equal((await request('GET','/industry-channels/'+channel+'/versions','staff')).body.versions.length,1)
   assert.equal((await request('PATCH','/industry-channels/'+channel,'merchant',{status:'retired'})).status,403)
   assert.equal((await request('POST','/industry-channels/'+channels.clinic_healthcare+'/versions','super',{version:1,displayName:'Clinic',title:'Visit',medicalQuestions:['diagnosis']})).status,400)
  })
  await t.test('merchant onboarding delegates authorized provisioning and rejects invalid/immutable industry assignments',async()=>{
   const body={parentId:reseller,name:'New restaurant',industryChannelCode:'restaurant_cafe',invitation:{email:'restaurant@example.invalid',displayName:'Business admin'}}
   const created=await request('POST','/merchants','reseller',body);assert.equal(created.status,201);assert.equal(created.body.tenant.kind,'merchant');assert.equal(created.body.tenant.industryChannelId,channels.restaurant_cafe)
   assert.equal(created.body.invitation.deliveryStatus,'test_delivered');assert.ok(messages.length)
   assert.equal((await request('POST','/merchants','sub',{...body,parentId:sub,industryChannelCode:'unknown'})).status,400)
   assert.equal((await request('POST','/merchants','merchant',{...body,parentId:merchant})).status,403)
   assert.equal((await request('POST','/merchants','reseller',{...body,parentId:peer})).status,404)
   const own=await request('GET','/merchants/'+merchant,'merchant');assert.equal(own.status,200);assert.equal(own.body.onboarding.complete,false)
   assert.equal((await request('PATCH','/merchants/'+merchant,'merchant',{name:'Renamed',lockVersion:own.body.lockVersion,industryChannelId:channels.clinic_healthcare})).status,400)
   assert.equal((await request('PATCH','/merchants/'+merchant,'merchant',{name:'Renamed',lockVersion:own.body.lockVersion})).status,200)
   assert.equal((await request('PATCH','/merchants/'+merchant,'staff',{name:'Forbidden',lockVersion:2})).status,403)
   assert.equal((await request('GET','/merchants/'+reseller,'super')).status,404)
  })
  await t.test('merchant profiles and branches respect every account hierarchy and peer boundary',async()=>{
   for(const actor of ['super','reseller','sub','merchant','staff'])assert.equal((await request('GET','/merchants/'+merchant,actor)).status,200)
   for(const actor of ['peer','other'])assert.equal((await request('GET','/merchants/'+merchant,actor)).status,404)
   assert.equal((await request('GET','/merchants/'+direct,'reseller')).status,404)
   assert.equal((await request('GET','/merchants/'+direct,'sub')).status,404)
   const first=await request('POST','/merchants/'+merchant+'/branches','merchant',branchInput);assert.equal(first.status,201);branch=first.body.id
   assert.equal(first.body.merchantId,merchant);assert.equal(first.body.industryChannelId,channel)
   const other=await request('POST','/merchants/'+peerMerchant+'/branches','other',branchInput);assert.equal(other.status,201);otherBranch=other.body.id
   for(const actor of ['super','reseller','sub','merchant','staff'])assert.equal((await request('GET','/branches/'+branch,actor)).status,200)
   for(const actor of ['peer','other'])assert.equal((await request('GET','/branches/'+branch,actor)).status,404)
   assert.equal((await request('GET','/branches/'+otherBranch,'merchant')).status,404)
   assert.equal((await request('GET','/merchants/'+peerMerchant+'/branches','merchant')).status,404)
   assert.equal((await request('POST','/merchants/'+merchant+'/branches','staff',{...branchInput,code:'staff'})).status,403)
   assert.equal((await request('POST','/merchants/'+merchant+'/branches','merchant',{...branchInput,tenantId:peerMerchant})).status,400)
  })
  await t.test('branch input, duplicate codes, timezone, optimistic updates and pagination are validated',async()=>{
   assert.equal((await request('POST','/merchants/'+merchant+'/branches','merchant',branchInput)).status,409)
   assert.equal((await request('POST','/merchants/'+merchant+'/branches','merchant',{...branchInput,code:'bad-time',timezone:'Mars/Invalid'})).status,400)
   const second=await request('POST','/merchants/'+merchant+'/branches','sub',{...branchInput,code:'second',timezone:'UTC'});assert.equal(second.status,201)
   const page=await request('GET','/merchants/'+merchant+'/branches?limit=1','staff');assert.equal(page.body.branches.length,1);assert.ok(page.body.nextCursor)
   assert.equal((await request('GET','/merchants/'+merchant+'/branches?limit=101','merchant')).status,400)
   const current=await getBranch(),updated=await request('PATCH','/branches/'+branch,'reseller',{name:'Changed branch',timezone:'America/New_York',address:null,lockVersion:current.lockVersion})
   assert.equal(updated.status,200);assert.equal(updated.body.address,null);assert.equal(updated.body.lockVersion,current.lockVersion+1)
   assert.equal((await request('PATCH','/branches/'+branch,'merchant',{name:'Stale',lockVersion:current.lockVersion})).status,409)
   assert.equal((await request('PATCH','/branches/'+branch,'merchant',{code:'second',lockVersion:updated.body.lockVersion})).status,409)
   assert.equal((await request('PATCH','/branches/'+branch,'merchant',{tenantId:peerMerchant,lockVersion:updated.body.lockVersion})).status,400)
   assert.equal((await request('PATCH','/branches/'+branch,'staff',{name:'Forbidden',lockVersion:updated.body.lockVersion})).status,403)
  })
  await t.test('Google destinations reject duplicates, redirects/protocols, ID mismatch and cross-merchant access',async()=>{
   const placeId='ChIJ_fixture_business_01'
   const created=await request('POST','/branches/'+branch+'/review-destination','merchant',{placeId});assert.equal(created.status,201);destination=created.body.id
   assert.equal(created.body.reviewUrl,'https://search.google.com/local/writereview?placeid='+placeId)
   assert.equal((await request('POST','/branches/'+branch+'/review-destination','merchant',{placeId})).status,409)
   assert.equal((await request('POST','/branches/'+otherBranch+'/review-destination','merchant',{placeId})).status,404)
   assert.equal((await request('GET','/branches/'+branch+'/review-destination','other')).status,404)
   assert.equal((await request('GET','/branches/'+branch+'/review-destination','staff')).status,200)
   assert.equal((await request('PATCH','/branches/'+branch+'/review-destination','staff',{placeId,lockVersion:1})).status,403)
   for(const reviewUrl of ['javascript:alert(1)','http://search.google.com/local/writereview?placeid='+placeId,'https://search.google.com.evil.invalid/','https://attacker@search.google.com/local/writereview?placeid='+placeId,'https://search.google.com/local/writereview?placeid=wrong']){
    assert.equal((await request('PATCH','/branches/'+branch+'/review-destination','merchant',{placeId,reviewUrl,lockVersion:1})).status,400)
   }
   assert.equal((await request('POST','/branches/'+otherBranch+'/review-destination','other',{placeId:'bad id'})).status,400)
   const updated=await request('PATCH','/branches/'+branch+'/review-destination','sub',{placeId:'ChIJ_updated_fixture_02',lockVersion:1});assert.equal(updated.status,200);assert.equal(updated.body.lockVersion,2)
  })
  await t.test('onboarding status is derived honestly and disabling a destination changes readiness',async()=>{
   const ready=await request('GET','/merchants/'+merchant,'merchant');assert.equal(ready.body.onboarding.complete,true);assert.equal(ready.body.onboarding.readyBranchCount,'1')
   const disabled=await request('POST','/branches/'+branch+'/review-destination/disable','merchant',{lockVersion:2});assert.equal(disabled.status,200)
   assert.equal((await request('GET','/merchants/'+merchant,'merchant')).body.onboarding.complete,false)
   assert.equal((await request('POST','/branches/'+branch+'/review-destination/disable','merchant',{lockVersion:3})).status,409)
   assert.equal((await request('POST','/branches/'+branch+'/review-destination/enable','merchant',{lockVersion:3})).status,200)
  })
  await t.test('live public short links prevent destination disable and branch archive',async()=>{
   const funnel=await insert('funnel_configurations',{tenant_id:merchant,branch_id:branch,industry_channel_id:channel,channel_version_id:version,review_destination_id:destination,revision:1,status:'published',brand_title:'Fixture',accent_hex:'#123456',locale:'en',published_at:new Date()})
   const link=await insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code:randomBytes(16).toString('base64url')})
   await assert.rejects(business.destinationStatus(actors.merchant.principal,branch,'disabled',4),e=>e.status===409)
   const b=await getBranch();await assert.rejects(business.archiveBranch(actors.merchant.principal,branch,b.lockVersion),e=>e.status===409)
   await query("UPDATE short_links SET status='disabled' WHERE id=? AND tenant_id=?",[link,merchant])
   const archived=await request('POST','/branches/'+branch+'/archive','merchant',{lockVersion:b.lockVersion});assert.equal(archived.status,200);assert.equal(archived.body.status,'archived')
   assert.equal((await request('PATCH','/branches/'+branch,'merchant',{name:'No',lockVersion:archived.body.lockVersion})).status,409)
   assert.equal((await request('POST','/branches/'+branch+'/review-destination','merchant',{placeId:'ChIJ_other'})).status,409)
   assert.equal((await request('GET','/merchants/'+merchant,'staff')).body.onboarding.complete,false)
  })
  await t.test('retired channels block new onboarding; suspended ancestors block business access',async()=>{
   assert.equal((await request('PATCH','/industry-channels/'+channels.restaurant_cafe,'super',{status:'retired'})).status,200)
   const visible=await request('GET','/industry-channels','merchant');assert.equal(visible.body.channels.length,2)
   const requestBody={parentId:reseller,name:'No retired',industryChannelCode:'restaurant_cafe',invitation:{email:'retired@example.invalid',displayName:'No'}}
   assert.equal((await request('POST','/merchants','reseller',requestBody)).status,400)
   await query("UPDATE tenants SET status='suspended' WHERE id=?",[reseller])
   assert.equal((await request('GET','/merchants/'+merchant,'super')).status,403)
   assert.equal((await request('GET','/branches/'+branch,'merchant')).status,403)
   assert.equal((await request('GET','/industry-channels','sub')).status,403)
   await query("UPDATE tenants SET status='active' WHERE id=?",[reseller])
  })
  await t.test('branch/destination/catalog audits are atomic and safe',async()=>{
   const audits=await query("SELECT action,safe_metadata FROM audit_logs WHERE tenant_id=? AND resource_type IN ('branch','review_destination')",[merchant])
   assert.ok(audits.some(a=>a.action==='branch.created'));assert.ok(audits.some(a=>a.action==='destination.created'));assert.ok(audits.some(a=>a.action==='branch.archived'))
   const catalog=await query("SELECT action FROM audit_logs WHERE tenant_id=? AND resource_type='channel_version'",[root]);assert.ok(catalog.some(a=>a.action==='channel_version.published'))
   assert.ok(!JSON.stringify(audits).includes('ChIJ_'))
   await query("CREATE TRIGGER fixture_reject_business_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='branch.created' AND EXISTS(SELECT 1 FROM branches WHERE id=NEW.resource_id AND code='rollback') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic business audit failure'; END IF; END")
   const before=(await query('SELECT COUNT(*) AS n FROM branches WHERE tenant_id=?',[merchant]))[0].n
   await assert.rejects(business.createBranch(actors.merchant.principal,merchant,{...branchInput,code:'rollback'}))
   assert.equal((await query('SELECT COUNT(*) AS n FROM branches WHERE tenant_id=?',[merchant]))[0].n,before)
  })
 }finally{if(server)await new Promise(resolve=>server.close(resolve));for(const c of sessions)c.destroy();await new Promise(resolve=>setImmediate(resolve));await pool.end();await fixture.close()}
})
