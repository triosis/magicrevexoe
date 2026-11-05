import {test} from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {randomBytes} from 'node:crypto'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from './mfa-fixtures.mjs'
import {hashPassword} from '../dist/auth/passwords.js'
import {TenantService} from '../dist/tenants/service.js'
import {FunnelService} from '../dist/funnels/service.js'
import {FeedbackService} from '../dist/feedback/service.js'
import {SubscriptionService} from '../dist/subscriptions/service.js'
import {createApp} from '../dist/app.js'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
test('subscription and usage APIs on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set()
 await fixture.admin.query('CREATE DATABASE magicreview_migration_subscriptions CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:['https://example.invalid'],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_subscriptions',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c))
 const auth=new AuthService(pool,randomBytes(32)),tenants=new TenantService(pool,auth),subscriptions=new SubscriptionService(tenants),funnels=new FunnelService(pool,tenants,auth),feedback=new FeedbackService(tenants,auth,funnels)
 const actors={},roles={},limitValues={branches:'2',staff_seats:'3',feedback_submissions:'10',short_links:null,qr_assets:'0'}
 let root,reseller,sub,peer,merchant,other,direct,resellerDirect,channel,plan,draft,base,server,assigned,legacy
 async function query(sql,args=[]){return(await pool.execute(sql,args))[0]}
 async function insert(table,values){const keys=Object.keys(values);return String((await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(values))).insertId)}
 async function tenant(kind,parent,parentKind){return insert('tenants',{public_id:randomBytes(16),kind,parent_id:parent,parent_kind:parentKind,name:'Subscription fixture',...(kind==='merchant'?{industry_channel_id:channel}:{})})}
 async function request(method,path,actor='super',body){const r=await fetch(base+'/api/v1'+path,{method,headers:{Accept:'application/json',...(actor?{Authorization:'Bearer '+actors[actor].token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()}}
 const end=()=>new Date(Date.now()+86400000).toISOString()
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  channel=(await query("SELECT id FROM industry_channels WHERE code='salon_spa'"))[0].id
  for(const role of await query('SELECT * FROM roles'))roles[role.code]=role.id
  root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'Platform'})
  reseller=await tenant('reseller',root,'platform');sub=await tenant('sub_reseller',reseller,'reseller');peer=await tenant('reseller',root,'platform');merchant=await tenant('merchant',sub,'sub_reseller');other=await tenant('merchant',peer,'reseller');direct=await tenant('merchant',root,'platform');resellerDirect=await tenant('merchant',reseller,'reseller')
  const password=randomBytes(24).toString('base64url'),hash=await hashPassword(password)
  for(const [name,id,kind,role]of [['super',root,'platform','super_admin'],['reseller',reseller,'reseller','reseller_admin'],['sub',sub,'sub_reseller','sub_reseller_admin'],['peer',peer,'reseller','reseller_admin'],['merchant',merchant,'merchant','merchant_admin'],['other',other,'merchant','merchant_admin'],['direct',direct,'merchant','merchant_admin'],['staff',merchant,'merchant','merchant_staff']]){
   const email=name+'@example.invalid',user=await insert('users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Fixture actor',password_hash:hash,status:'active',email_verified_at:new Date()})
   const mid=await insert('tenant_memberships',{tenant_id:id,tenant_kind:kind,user_id:user,role_id:roles[role],status:'active'}),login=await auth.login(email,password),selected=await auth.selectTenant(await auth.authenticate(login.accessToken),mid)
   actors[name]={token:selected.accessToken,principal:await auth.authenticate(selected.accessToken)}
  }
  await insert('branches',{public_id:randomBytes(16),tenant_id:merchant,industry_channel_id:channel,code:'main',name:'Main',timezone:'UTC'})
  draft=await insert('subscription_plans',{code:'fixture-draft',version:1,name:'Incomplete fixture',price:'17.25',currency:'INR',interval_unit:'month'})
  plan=await insert('subscription_plans',{code:'fixture',version:1,name:'Synthetic plan',price:'17.25',currency:'INR',interval_unit:'month'})
  for(const [metric,limit]of Object.entries(limitValues))await insert('plan_limits',{plan_id:plan,metric,limit_value:limit})
  await query("UPDATE subscription_plans SET status='published' WHERE id=?",[plan])
  server=createServer(createApp({env,auth,tenants,subscriptions,checkDatabase:async()=>{},isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port
  await t.test('published catalog preserves configured prices/limits and hides drafts',async()=>{
   const r=await request('GET','/subscription-plans','merchant');assert.equal(r.status,200);assert.equal(r.body.plans.length,1);assert.equal(r.body.plans[0].price,'17.25');assert.equal(r.body.plans[0].limits.find(l=>l.metric==='short_links').limit,null)
   assert.equal((await request('GET','/subscription-plans/'+draft)).status,404);assert.equal((await request('GET','/subscription-plans/'+plan,'staff')).status,403)
   assert.equal((await request('GET',`/merchants/${merchant}/subscription`)).body.availability,'no_subscription')
   assert.equal((await request('GET',`/merchants/${merchant}/usage`)).body.availability,'no_subscription')
  })
  await t.test('assignment initializes exact resource snapshots and all five counters atomically',async()=>{
   const r=await request('POST',`/merchants/${merchant}/subscriptions`,'super',{planId:plan,periodEnd:end()});assert.equal(r.status,201);assigned=r.body
   assert.equal(assigned.merchantId,merchant);assert.equal(assigned.status,'active')
   const counters=await query('SELECT metric,used FROM usage_counters WHERE subscription_id=?',[assigned.id]);assert.equal(counters.length,5);assert.equal(counters.find(c=>c.metric==='branches').used,'1');assert.equal(counters.find(c=>c.metric==='staff_seats').used,'2');assert.equal(counters.find(c=>c.metric==='feedback_submissions').used,'0')
   const usage=await request('GET',`/merchants/${merchant}/usage`,'merchant');assert.equal(usage.body.availability,'available');assert.equal(usage.body.metrics.find(m=>m.metric==='branches').remaining,'1');assert.equal(usage.body.metrics.find(m=>m.metric==='short_links').limitMode,'unlimited');assert.equal(usage.body.metrics.find(m=>m.metric==='qr_assets').remaining,'0')
  })
  await t.test('duplicate/concurrent initialization preserves counters and ledger instead of resetting',async()=>{
   const before=await query('SELECT metric,used FROM usage_counters WHERE subscription_id=? ORDER BY metric',[assigned.id]),ledger=(await query('SELECT COUNT(*) AS n FROM usage_records'))[0].n
   const results=await Promise.all([subscriptions.initializeUsage(actors.super.principal,merchant,assigned.id),subscriptions.initializeUsage(actors.super.principal,merchant,assigned.id)])
   assert.ok(results.every(r=>r.createdCounters===0));assert.deepEqual(await query('SELECT metric,used FROM usage_counters WHERE subscription_id=? ORDER BY metric',[assigned.id]),before);assert.equal((await query('SELECT COUNT(*) AS n FROM usage_records'))[0].n,ledger)
   assert.equal((await request('POST',`/merchants/${merchant}/subscriptions`,'super',{planId:plan,periodEnd:end()})).status,409)
   await query("UPDATE usage_counters SET used=used+1 WHERE subscription_id=? AND metric='feedback_submissions'",[assigned.id])
   assert.equal((await request('GET',`/merchants/${merchant}/usage/feedback_submissions`)).body.metrics[0].availability,'counter_inconsistent')
   await assert.rejects(subscriptions.initializeUsage(actors.super.principal,merchant,assigned.id),e=>e.status===409)
   assert.equal((await query("SELECT used FROM usage_counters WHERE subscription_id=? AND metric='feedback_submissions'",[assigned.id]))[0].used,'1')
   await query("UPDATE usage_counters SET used=used-1 WHERE subscription_id=? AND metric='feedback_submissions'",[assigned.id])
  })
  await t.test('read permissions and actual parent edges reject peers, cross-merchants and self-assignment',async()=>{
   for(const actor of ['super','reseller','sub','merchant'])assert.equal((await request('GET',`/merchants/${merchant}/subscription`,actor)).status,200)
   for(const actor of ['peer','other','direct'])assert.equal((await request('GET',`/merchants/${merchant}/subscription`,actor)).status,404)
   for(const actor of ['reseller','sub','merchant','staff'])assert.equal((await request('POST',`/merchants/${merchant}/subscriptions`,actor,{planId:plan,periodEnd:end()})).status,403)
   assert.equal((await request('GET',`/merchants/${other}/subscription`,'super')).status,200)
   assert.equal((await request('GET',`/merchants/${resellerDirect}/subscription`,'reseller')).status,200)
   assert.equal((await request('GET',`/merchants/${resellerDirect}/subscription`,'sub')).status,404)
   assert.equal((await request('GET',`/merchants/${direct}/subscription`,'reseller')).status,404)
   assert.equal((await request('GET',`/merchants/${merchant}/subscription`,null)).status,401)
   assert.equal((await request('POST',`/merchants/${other}/subscriptions/${assigned.id}/usage/initialize`,'super',{})).status,404)
  })
  await t.test('input validation and current period boundaries refuse unsupported assignments',async()=>{
   for(const body of [{planId:draft,periodEnd:end()},{planId:'99999',periodEnd:end()}])assert.equal((await request('POST',`/merchants/${other}/subscriptions`,'super',body)).status,404)
   assert.equal((await request('POST',`/merchants/${other}/subscriptions`,'super',{planId:plan,periodEnd:'2020-01-01T00:00:00Z'})).status,409)
   assert.equal((await request('POST',`/merchants/${other}/subscriptions`,'super',{planId:plan,periodStart:end(),periodEnd:new Date(Date.now()+172800000).toISOString()})).status,409)
   assert.equal((await request('POST',`/merchants/${other}/subscriptions`,'super',{planId:plan,periodEnd:end(),quota:999})).status,400)
   assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${assigned.id}/status`,'super',{status:'suspended',lockVersion:1})).status,400)
  })
  await t.test('live resource gauges remain truthful without resetting initialization snapshots',async()=>{
   await insert('branches',{public_id:randomBytes(16),tenant_id:merchant,industry_channel_id:channel,code:'second',name:'Second',timezone:'UTC'})
   const r=await request('GET',`/merchants/${merchant}/usage/branches`,'merchant');assert.equal(r.body.metrics.length,1);assert.equal(r.body.metrics[0].used,'2');assert.equal(r.body.metrics[0].remaining,'0');assert.equal(r.body.metrics[0].source,'live_resources')
   assert.equal((await query("SELECT used FROM usage_counters WHERE subscription_id=? AND metric='branches'",[assigned.id]))[0].used,'1')
   const history=await request('GET',`/merchants/${merchant}/usage/history?limit=1`);assert.equal(history.body.usageRecords.length,1);assert.equal(history.body.usageRecords[0].kind,'initial_snapshot');assert.ok(history.body.nextCursor)
   assert.equal((await request('GET',`/merchants/${merchant}/usage/history?subscriptionId=999999`)).status,404)
  })
  await t.test('missing counters are unavailable; legacy microsecond periods initialize and accept feedback',async()=>{
   const start='2026-01-01 00:00:00.123456',finish='2099-01-01 00:00:00.654321'
   legacy=await insert('subscriptions',{tenant_id:direct,plan_id:plan,status:'active',starts_at:start,current_period_start:start,current_period_end:finish})
   const missing=await request('GET',`/merchants/${direct}/usage`,'direct');assert.equal(missing.body.availability,'unavailable');assert.ok(missing.body.metrics.every(m=>m.used===null&&m.remaining===null&&m.availability==='counter_missing'))
   const init=await request('POST',`/merchants/${direct}/subscriptions/${legacy}/usage/initialize`,'super',{});assert.equal(init.status,200);assert.equal(init.body.createdCounters,5)
   const b=await insert('branches',{public_id:randomBytes(16),tenant_id:direct,industry_channel_id:channel,code:'legacy',name:'Legacy',timezone:'UTC'})
   const v=await insert('channel_versions',{industry_channel_id:channel,version:1,status:'published',display_name:'Fixture',public_copy:JSON.stringify({title:'Visit',google_label:'Leave a Google review',private_label:'Share private feedback'}),feedback_labels:JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'}),published_at:new Date()})
   const d=await insert('review_destinations',{tenant_id:direct,branch_id:b,place_id:'ChIJ_test',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_test'})
   const f=await insert('funnel_configurations',{tenant_id:direct,branch_id:b,industry_channel_id:channel,channel_version_id:v,review_destination_id:d,revision:1,status:'published',brand_title:'Visit',accent_hex:'#123456',locale:'en',published_at:new Date()})
   const code=randomBytes(16).toString('base64url');await insert('short_links',{tenant_id:direct,branch_id:b,funnel_configuration_id:f,code})
   await feedback.submit(code,{submissionToken:auth.feedbackTokens.issue(code,1).token,overallRating:3})
   const current=await request('GET',`/merchants/${direct}/usage/feedback_submissions`,'direct');assert.equal(current.body.metrics[0].used,'1');assert.equal(current.body.metrics[0].remaining,'9')
   assert.equal((await query("SELECT DATE_FORMAT(period_start,'%f') AS fraction FROM usage_counters WHERE subscription_id=? LIMIT 1",[legacy]))[0].fraction,'123456')
  })
  await t.test('tenant suspension is derived without inventing a subscription enum or granting access',async()=>{
   await query("UPDATE tenants SET status='suspended' WHERE id=?",[reseller])
   const r=await request('GET',`/merchants/${merchant}/subscription`);assert.equal(r.status,200);assert.equal(r.body.subscription.status,'active');assert.equal(r.body.subscription.effectiveStatus,'suspended')
   assert.equal((await request('GET',`/merchants/${merchant}/usage`)).body.metrics[0].availability,'period_inactive')
   assert.equal((await request('GET',`/merchants/${merchant}/subscription`,'merchant')).status,403)
   assert.equal((await request('POST',`/merchants/${resellerDirect}/subscriptions`,'super',{planId:plan,periodEnd:end()})).status,409)
   await query("UPDATE tenants SET status='active' WHERE id=?",[reseller])
  })
  await t.test('status transitions preserve history and terminal rows cannot reactivate',async()=>{
   assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${assigned.id}/status`,'super',{status:'expired',lockVersion:1})).status,409)
   assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${assigned.id}/status`,'super',{status:'past_due',lockVersion:1})).status,200)
   assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${assigned.id}/status`,'super',{status:'active',lockVersion:1})).status,409)
   assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${assigned.id}/status`,'super',{status:'active',lockVersion:2})).status,200)
   const counters=(await query('SELECT COUNT(*) AS n FROM usage_counters WHERE subscription_id=?',[assigned.id]))[0].n
   assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${assigned.id}/status`,'super',{status:'canceled',lockVersion:3})).status,200)
   assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${assigned.id}/status`,'super',{status:'active',lockVersion:4})).status,409)
   assert.equal((await query('SELECT COUNT(*) AS n FROM usage_counters WHERE subscription_id=?',[assigned.id]))[0].n,counters)
   assert.equal((await request('GET',`/merchants/${merchant}/usage`,'merchant')).body.metrics[0].remaining,null)
   assert.equal((await request('GET',`/merchants/${merchant}/subscriptions`,'merchant')).body.subscriptions[0].status,'canceled')
   assert.equal((await request('POST',`/merchants/${merchant}/subscriptions`,'super',{planId:plan,periodStart:'2020-01-01T00:00:00Z',periodEnd:end()})).status,409)
  })
  await t.test('elapsed allocations report expired and explicit replacement ends old allocation transactionally',async()=>{
   const old=await insert('subscriptions',{tenant_id:other,plan_id:plan,status:'active',starts_at:'2020-01-01 00:00:00',current_period_start:'2020-01-01 00:00:00',current_period_end:'2020-02-01 00:00:00'})
   assert.equal((await request('GET',`/merchants/${other}/subscription`,'other')).body.subscription.effectiveStatus,'expired')
   assert.equal((await request('POST',`/merchants/${other}/subscriptions/${old}/usage/initialize`,'super',{})).status,409)
   const r=await request('POST',`/merchants/${other}/subscriptions`,'super',{planId:plan,periodEnd:end()});assert.equal(r.status,201)
   assert.equal((await query('SELECT status FROM subscriptions WHERE id=?',[old]))[0].status,'expired');assert.equal((await request('GET',`/merchants/${other}/subscriptions`,'other')).body.subscriptions.length,2)
  })
  await t.test('administrative audit failure rolls back assignment, counters, ledger and status',async()=>{
   await query("CREATE TRIGGER fixture_reject_subscription_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action IN ('subscription.assigned','subscription.status_changed') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END")
   const before=(await query('SELECT COUNT(*) AS n FROM subscriptions'))[0].n,counters=(await query('SELECT COUNT(*) AS n FROM usage_counters'))[0].n,ledger=(await query('SELECT COUNT(*) AS n FROM usage_records'))[0].n
   await assert.rejects(subscriptions.assign(actors.super.principal,resellerDirect,{planId:plan,periodEnd:new Date(end()),status:'active'}))
   assert.equal((await query('SELECT COUNT(*) AS n FROM subscriptions'))[0].n,before);assert.equal((await query('SELECT COUNT(*) AS n FROM usage_counters'))[0].n,counters);assert.equal((await query('SELECT COUNT(*) AS n FROM usage_records'))[0].n,ledger)
   await assert.rejects(subscriptions.changeStatus(actors.super.principal,direct,legacy,{status:'past_due',lockVersion:1}));assert.equal((await query('SELECT status FROM subscriptions WHERE id=?',[legacy]))[0].status,'active')
   const audits=await query("SELECT action,safe_metadata FROM audit_logs WHERE action LIKE 'subscription.%'");for(const name of ['subscription.assigned','subscription.usage_initialized','subscription.status_changed'])assert.ok(audits.some(a=>a.action===name));assert.ok(!JSON.stringify(audits).includes('password'))
  })
 }finally{if(server)await new Promise(resolve=>server.close(resolve));for(const c of sessions)c.destroy();await new Promise(resolve=>setImmediate(resolve));await pool.end();await fixture.close()}
})
