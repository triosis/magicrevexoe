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
import {TenantService} from '../dist/tenants/service.js'
import {BusinessService} from '../dist/business/service.js'
import {FunnelService} from '../dist/funnels/service.js'
import {FeedbackService} from '../dist/feedback/service.js'
import {createApp} from '../dist/app.js'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'

test('private feedback on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set()
 await fixture.admin.query('CREATE DATABASE magicreview_migration_feedback CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:['https://example.invalid'],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_feedback',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c))
 const auth=new AuthService(pool,randomBytes(32)),tenants=new TenantService(pool,auth),business=new BusinessService(tenants,auth),funnels=new FunnelService(pool,tenants,auth,'https://api.example.invalid'),feedback=new FeedbackService(tenants,auth,funnels)
 const actors={},roles={},channels={},cases=[];let root,reseller,sub,peer,otherSub,peerMerchant,direct,server,base
 async function query(sql,args=[]){return(await pool.execute(sql,args))[0]}
 async function insert(table,values){const keys=Object.keys(values);return String((await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(values))).insertId)}
 async function tenant(kind,parent,parentKind,channel){return insert('tenants',{public_id:randomBytes(16),kind,parent_id:parent,parent_kind:parentKind,name:'Business fixture',...(channel?{industry_channel_id:channel}:{})})}
 async function request(method,path,actor,body,headers={}){const response=await fetch(base+'/api/v1'+path,{method,headers:{...(actor?{Authorization:'Bearer '+actors[actor].token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json(),headers:response.headers}}
 async function form(c=cases[0]){const r=await request('GET','/public/funnels/'+c.code);assert.equal(r.status,200);assert.equal(r.body.options.privateFeedback.submissionAvailable,true);return r.body.options.privateFeedback.submissionToken.token}
 const path=(c=cases[0])=>'/public/funnels/'+c.code+'/feedback'
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  for(const c of await query('SELECT * FROM industry_channels'))channels[c.code]=c.id
  for(const r of await query('SELECT * FROM roles'))roles[r.code]=r.id
  roles.fixture_readonly=await insert('roles',{code:'fixture_readonly',tenant_kind:'merchant',name:'Local test read-only role'})
  await insert('role_permissions',{role_id:roles.fixture_readonly,permission_id:(await query("SELECT id FROM permissions WHERE code='feedback.read'"))[0].id})
  root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'Platform'})
  reseller=await tenant('reseller',root,'platform');sub=await tenant('sub_reseller',reseller,'reseller');otherSub=await tenant('sub_reseller',reseller,'reseller');peer=await tenant('reseller',root,'platform');peerMerchant=await tenant('merchant',peer,'reseller',channels.salon_spa);direct=await tenant('merchant',root,'platform',channels.salon_spa)
  for(const [channel,channelId]of Object.entries(channels)){
   const merchant=await tenant('merchant',sub,'sub_reseller',channelId)
   const version=await insert('channel_versions',{industry_channel_id:channelId,version:1,status:'published',display_name:channel,public_copy:JSON.stringify({title:'Visit',google_label:'Leave a Google review',private_label:'Share private feedback'}),feedback_labels:JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'}),published_at:new Date()})
   const branch=await insert('branches',{public_id:randomBytes(16),tenant_id:merchant,industry_channel_id:channelId,code:'main',name:'Branch',timezone:'UTC'})
   const destination=await insert('review_destinations',{tenant_id:merchant,branch_id:branch,place_id:'ChIJ_fixture',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_fixture'})
   const funnel=await insert('funnel_configurations',{tenant_id:merchant,branch_id:branch,industry_channel_id:channelId,channel_version_id:version,review_destination_id:destination,revision:1,status:'published',brand_title:'Visit',accent_hex:'#123456',locale:'en',published_at:new Date()})
   const code=randomBytes(16).toString('base64url'),link=await insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code})
   cases.push({channel,channelId,merchant,branch,destination,funnel,version,code,link})
  }
  const password=randomBytes(24).toString('base64url'),hash=await hashPassword(password)
  for(const [key,id,kind,role]of [['super',root,'platform','super_admin'],['reseller',reseller,'reseller','reseller_admin'],['sub',sub,'sub_reseller','sub_reseller_admin'],['otherSub',otherSub,'sub_reseller','sub_reseller_admin'],['peer',peer,'reseller','reseller_admin'],['merchant',cases[0].merchant,'merchant','merchant_admin'],['staff',cases[0].merchant,'merchant','merchant_staff'],['reader',cases[0].merchant,'merchant','fixture_readonly'],['other',peerMerchant,'merchant','merchant_admin']]){
   const email=key.toLowerCase()+'@example.invalid',user=await insert('users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Administrator fixture',password_hash:hash,status:'active',email_verified_at:new Date()})
   const mid=await insert('tenant_memberships',{tenant_id:id,tenant_kind:kind,user_id:user,role_id:roles[role],status:'active'}),login=await auth.login(email,password),selected=await auth.selectTenant(await auth.authenticate(login.accessToken),mid)
   actors[key]={token:selected.accessToken,principal:await auth.authenticate(selected.accessToken)}
  }
  for(const row of await query("SELECT id FROM tenants WHERE kind='merchant'"))await fundTestMerchant(pool,row.id)
  server=createServer(createApp({env,auth,tenants,business,funnels,feedback,checkDatabase:async()=>{},isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port
  await t.test('anonymous submissions work for every channel with safe confirmations and immutable ownership',async()=>{
   for(const c of cases){
    c.token=await form(c)
    const r=await request('POST',path(c),null,{submissionToken:c.token,overallRating:1,serviceRating:2,cleanlinessRating:3,waitingTimeRating:4})
    assert.equal(r.status,200);assert.deepEqual(Object.keys(r.body).sort(),['accepted','confirmationId']);assert.match(r.body.confirmationId,/^[a-f0-9]{32}$/)
    const row=(await query('SELECT * FROM private_feedback WHERE public_id=?',[Buffer.from(r.body.confirmationId,'hex')]))[0];c.feedbackId=row.id
    assert.equal(row.tenant_id,c.merchant);assert.equal(row.branch_id,c.branch);assert.equal(row.funnel_configuration_id,c.funnel);assert.equal(row.status,'new');assert.equal(row.submission_key_hash.length,32)
    assert.ok(!row.submission_key_hash.toString('hex').includes(c.token));await assert.rejects(query('UPDATE private_feedback SET overall_rating=5 WHERE id=?',[row.id]))
   }
   const r=await request('GET','/public/funnels/'+cases[0].code);assert.equal(r.body.options.googleReview.independent,true);assert.equal(r.body.options.privateFeedback.independent,true)
  })
  await t.test('invalid ratings and clinic/text/medical/identity/mass-assignment payloads are rejected',async()=>{
   const token=await form(cases[1]),baseInput={submissionToken:token,overallRating:3}
   for(const value of [0,6,2.5,'5',null])assert.equal((await request('POST',path(cases[1]),null,{...baseInput,overallRating:value})).status,400)
   for(const field of ['text','medicalHistory','diagnosis','symptoms','email','tenantId','branchId','status','notes'])assert.equal((await request('POST',path(cases[1]),null,{...baseInput,[field]:'rejected'})).status,400)
   await assert.rejects(feedback.submit(cases[0].code,{...baseInput,text:'unsupported'}),e=>e.status===400)
  })
  await t.test('signed version tokens reject tampering, wrong links and changed published revisions',async()=>{
   const c=cases[0],token=await form(c)
   await assert.rejects(feedback.submit(c.code,{submissionToken:token+'x',overallRating:3}),e=>e.status===400)
   await assert.rejects(feedback.submit(cases[1].code,{submissionToken:token,overallRating:3}),e=>e.status===400)
   const next=await insert('funnel_configurations',{tenant_id:c.merchant,branch_id:c.branch,industry_channel_id:c.channelId,channel_version_id:c.version,review_destination_id:c.destination,revision:2,status:'published',brand_title:'Next',accent_hex:'#123456',locale:'en',published_at:new Date()})
   await query('UPDATE short_links SET funnel_configuration_id=? WHERE id=?',[next,c.link]);await assert.rejects(feedback.submit(c.code,{submissionToken:token,overallRating:3}),e=>e.status===400)
   await query('UPDATE short_links SET funnel_configuration_id=? WHERE id=?',[c.funnel,c.link])
  })
  await t.test('identical sequential/concurrent retries cannot duplicate submissions or overwrite ratings',async()=>{
   const c=cases[0],input={submissionToken:await form(c),overallRating:3}
   const before=(await query('SELECT COUNT(*) AS n FROM private_feedback'))[0].n
   const result=await Promise.all([feedback.submit(c.code,input),feedback.submit(c.code,input)])
   assert.deepEqual(result[0],result[1]);assert.deepEqual(await feedback.submit(c.code,input),result[0]);assert.equal(BigInt((await query('SELECT COUNT(*) AS n FROM private_feedback'))[0].n),BigInt(before)+1n)
   await assert.rejects(feedback.submit(c.code,{...input,overallRating:4}),e=>e.status===409)
  })
  await t.test('inactive/unknown links, archived branches and every suspended ancestor reject submissions',async()=>{
   const c=cases[0],input={submissionToken:await form(c),overallRating:3}
   for(const code of ['invalid',randomBytes(16).toString('base64url')])await assert.rejects(feedback.submit(code,input),e=>e.status===404)
   await query("UPDATE short_links SET status='disabled' WHERE id=?",[c.link]);await assert.rejects(feedback.submit(c.code,input),e=>e.status===404);await query("UPDATE short_links SET status='active' WHERE id=?",[c.link])
   await query('UPDATE short_links SET expires_at=? WHERE id=?',[new Date(Date.now()-60000),c.link]);await assert.rejects(feedback.submit(c.code,input),e=>e.status===404);await query('UPDATE short_links SET expires_at=NULL WHERE id=?',[c.link])
   await query("UPDATE branches SET status='archived' WHERE id=?",[c.branch]);await assert.rejects(feedback.submit(c.code,input),e=>e.status===404);await query("UPDATE branches SET status='active' WHERE id=?",[c.branch])
   for(const id of [c.merchant,sub,reseller,root]){await query("UPDATE tenants SET status='suspended' WHERE id=?",[id]);await assert.rejects(feedback.submit(c.code,input),e=>e.status===404);await query("UPDATE tenants SET status='active' WHERE id=?",[id])}
   await query("UPDATE review_destinations SET status='disabled' WHERE id=?",[c.destination]);await assert.rejects(feedback.submit(c.code,input),e=>e.status===404);await query("UPDATE review_destinations SET status='active' WHERE id=?",[c.destination])
  })
  await t.test('authorized management is scoped across all roles; peers and other merchants are invisible',async()=>{
   const c=cases[0]
   for(const actor of ['super','reseller','sub','merchant','staff']){const r=await request('GET','/feedback/'+c.feedbackId,actor);assert.equal(r.status,200);assert.equal(r.body.merchantId,c.merchant)}
   for(const actor of ['peer','otherSub','other']){
    assert.equal((await request('GET','/feedback/'+c.feedbackId,actor)).status,404)
    assert.equal((await request('GET','/feedback?merchantId='+c.merchant,actor)).status,404)
    assert.equal((await request('GET','/feedback?branchId='+c.branch,actor)).status,404)
    assert.equal((await request('GET','/feedback',actor)).body.feedback.length,0)
   }
   assert.equal((await request('GET','/feedback/'+cases[1].feedbackId,'merchant')).status,404)
   assert.equal((await request('GET','/feedback')).status,401)
   const spoof=await request('GET','/feedback','peer',undefined,{tenantId:c.merchant});assert.equal(spoof.body.feedback.length,0)
   for(const owner of [peerMerchant,direct]){
    const branch=await insert('branches',{public_id:randomBytes(16),tenant_id:owner,industry_channel_id:c.channelId,code:'management-fixture',name:'Other owner branch',timezone:'UTC'})
    const destination=await insert('review_destinations',{tenant_id:owner,branch_id:branch,place_id:'ChIJ_other',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_other'})
    const funnel=await insert('funnel_configurations',{tenant_id:owner,branch_id:branch,industry_channel_id:c.channelId,channel_version_id:c.version,review_destination_id:destination,revision:1,status:'published',brand_title:'Other owner',accent_hex:'#123456',locale:'en',published_at:new Date()})
    const link=await insert('short_links',{tenant_id:owner,branch_id:branch,funnel_configuration_id:funnel,code:randomBytes(16).toString('base64url')})
    const id=await insert('private_feedback',{public_id:randomBytes(16),tenant_id:owner,branch_id:branch,funnel_configuration_id:funnel,industry_channel_id:c.channelId,short_link_id:link,submission_key_hash:randomBytes(32),overall_rating:3})
    assert.equal((await request('GET','/feedback/'+id,'super')).status,200)
    assert.equal((await request('GET','/feedback/'+id,'reseller')).status,404)
    assert.equal((await request('GET','/feedback/'+id,'sub')).status,404)
    assert.equal((await request('GET','/feedback/'+id,'merchant')).status,404)
    if(owner===peerMerchant)assert.equal((await request('GET','/feedback/'+id,'peer')).status,200)
   }
  })
  await t.test('pagination, date/branch/status filters and statistics are scoped and validated',async()=>{
   const first=await request('GET','/feedback?limit=1','super');assert.equal(first.status,200);assert.equal(first.body.feedback.length,1)
   const second=await request('GET','/feedback?limit=1&afterId='+first.body.nextCursor,'super');assert.notEqual(second.body.feedback[0].id,first.body.feedback[0].id)
   const filtered=await request('GET',`/feedback?merchantId=${cases[0].merchant}&branchId=${cases[0].branch}&status=new&from=2020-01-01T00:00:00Z&to=2099-01-01T00:00:00Z`,'reseller');assert.ok(filtered.body.feedback.length>0);assert.ok(filtered.body.feedback.every(f=>f.branchId===cases[0].branch))
   const stats=await request('GET','/feedback/statistics','merchant');assert.equal(stats.status,200);assert.equal(stats.body.groups.length,1);assert.equal(stats.body.groups[0].status,'new');assert.equal(typeof stats.body.groups[0].count,'string')
   for(const suffix of ['?limit=101','?status=unknown','?sort=anything','?from=2099-01-01T00:00:00Z&to=2020-01-01T00:00:00Z'])assert.equal((await request('GET','/feedback'+suffix,'super')).status,400)
   assert.equal((await request('GET',`/feedback?merchantId=${cases[0].merchant}&branchId=${cases[1].branch}`,'super')).status,404)
  })
  await t.test('controlled status workflow has optimistic versions, append-only history and no public mutation',async()=>{
   const id=cases[0].feedbackId
   assert.equal((await request('PATCH',`/feedback/${id}/status`,'reader',{status:'in_progress',reasonCode:'triage',lockVersion:1})).status,403)
   assert.equal((await request('PATCH',`/feedback/${id}/status`,'peer',{status:'in_progress',reasonCode:'triage',lockVersion:1})).status,404)
   assert.equal((await request('PATCH',`/feedback/${id}/status`,null,{status:'in_progress',reasonCode:'triage',lockVersion:1})).status,401)
   assert.equal((await request('PATCH',`/feedback/${id}/status`,'merchant',{status:'resolved',reasonCode:'triage',lockVersion:1})).status,409)
   for(const [actor,status,reasonCode,lockVersion]of [['merchant','in_progress','triage',1],['sub','resolved','completed',2],['reseller','in_progress','reopened',3],['super','dismissed','duplicate',4]])assert.equal((await request('PATCH',`/feedback/${id}/status`,actor,{status,reasonCode,lockVersion})).status,200)
   const row=(await query('SELECT * FROM private_feedback WHERE id=?',[id]))[0];assert.equal(row.status,'dismissed');assert.equal(row.resolved_at,null);assert.equal(row.overall_rating,1)
   const details=await request('GET','/feedback/'+id,'merchant');assert.equal(details.body.history.length,4)
   assert.equal((await request('PATCH',`/feedback/${id}/status`,'merchant',{status:'resolved',reasonCode:'completed',lockVersion:1})).status,409)
   assert.equal((await request('PATCH',`/feedback/${id}/status`,'merchant',{status:'in_progress',reasonCode:'reopened',lockVersion:5,notes:'disallowed'})).status,400)
  })
  await t.test('suspended management ancestry excludes descendant reads and blocks direct access',async()=>{
   await query("UPDATE tenants SET status='suspended' WHERE id=?",[sub])
   assert.equal((await request('GET','/feedback/'+cases[0].feedbackId,'super')).status,404)
   assert.equal((await request('GET','/feedback','merchant')).status,403)
   const visible=(await request('GET','/feedback','super')).body.feedback
   assert.equal(visible.length,2);assert.ok(visible.every(f=>!cases.some(c=>c.merchant===f.merchantId)))
   await query("UPDATE tenants SET status='active' WHERE id=?",[sub])
  })
  await t.test('usage is counted once in a configured current subscription',async()=>{
   await query("UPDATE subscriptions SET status='canceled',ends_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND current_slot=1",[cases[0].merchant])
   const c=cases[0],plan=await insert('subscription_plans',{code:'fixture',version:1,name:'Fixture',price:'0.00',currency:'INR',interval_unit:'month'})
   for(const metric of ['branches','staff_seats','feedback_submissions','short_links','qr_assets'])await insert('plan_limits',{plan_id:plan,metric,limit_value:null})
   await query("UPDATE subscription_plans SET status='published' WHERE id=?",[plan])
   const start=new Date(Date.now()-60000),end=new Date(Date.now()+86400000),subscription=await insert('subscriptions',{tenant_id:c.merchant,plan_id:plan,status:'active',starts_at:start,current_period_start:start,current_period_end:end})
   const input={submissionToken:await form(c),overallRating:4}
   await assert.rejects(feedback.submit(c.code,input),e=>e.status===409)
   await insert('usage_counters',{tenant_id:c.merchant,subscription_id:subscription,metric:'feedback_submissions',period_start:start,period_end:end,used:0})
   await feedback.submit(c.code,input);await feedback.submit(c.code,input)
   const usage=await query('SELECT * FROM usage_records WHERE subscription_id=?',[subscription]);assert.equal(usage.length,1);assert.equal(usage[0].quantity,'1');assert.ok(!usage[0].source_event_key.toString().includes(input.submissionToken))
   assert.equal((await query('SELECT used FROM usage_counters WHERE subscription_id=?',[subscription]))[0].used,'1')
   c.subscription=subscription
  })
  await t.test('feedback, usage, history and audit writes roll back together without raw logging',async()=>{
   const c=cases[0],input={submissionToken:await form(c),overallRating:3},logs=[],original=console.error;console.error=(...args)=>logs.push(args.join(' '))
   try{
    await query("CREATE TRIGGER fixture_reject_feedback_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action IN ('public.feedback_submitted','feedback.status_changed') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic failure'; END IF; END")
    const before=(await query('SELECT COUNT(*) AS n FROM private_feedback'))[0].n,used=(await query('SELECT used FROM usage_counters WHERE subscription_id=?',[c.subscription]))[0].used
    const r=await request('POST',path(),null,input);assert.equal(r.status,500);assert.ok(!JSON.stringify(r.body).includes('Synthetic'))
    assert.equal((await query('SELECT COUNT(*) AS n FROM private_feedback'))[0].n,before);assert.equal((await query('SELECT used FROM usage_counters WHERE subscription_id=?',[c.subscription]))[0].used,used)
    const history=(await query('SELECT COUNT(*) AS n FROM feedback_status_events'))[0].n
    await assert.rejects(feedback.changeStatus(actors.merchant.principal,c.feedbackId,{status:'in_progress',reasonCode:'reopened',lockVersion:5}))
    assert.equal((await query('SELECT COUNT(*) AS n FROM feedback_status_events'))[0].n,history);assert.equal((await query('SELECT status FROM private_feedback WHERE id=?',[c.feedbackId]))[0].status,'dismissed')
    assert.ok(!logs.join(' ').includes(input.submissionToken));assert.ok(!logs.join(' ').includes('overallRating'))
   }finally{console.error=original}
   const audits=await query("SELECT action,safe_metadata FROM audit_logs WHERE action IN ('public.feedback_submitted','feedback.viewed','feedback.status_changed')")
   for(const action of ['public.feedback_submitted','feedback.viewed','feedback.status_changed'])assert.ok(audits.some(a=>a.action===action))
   assert.ok(!JSON.stringify(audits).includes('submissionToken'))
  })
  await t.test('public rate limits ignore spoofed forwarding and do not expose individual content',async()=>{
   let limited=false
   for(let i=0;i<40;i++){const r=await request('POST',path(),null,{submissionToken:'invalid',overallRating:3},{'X-Forwarded-For':'203.0.113.'+(i%250)});if(r.status===429){limited=true;assert.equal(r.headers.get('retry-after'),'900');break}assert.equal(r.status,400)}
   assert.ok(limited);assert.equal((await request('GET','/feedback/'+cases[0].feedbackId)).status,401)
  })
 }finally{if(server)await new Promise(resolve=>server.close(resolve));for(const c of sessions)c.destroy();await new Promise(resolve=>setImmediate(resolve));await pool.end();await fixture.close()}
})
