import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {fundTestMerchant} from './quota-fixtures.mjs'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from '../dist/auth/service.js'
import {hashPassword} from '../dist/auth/passwords.js'
import {TenantService} from '../dist/tenants/service.js'
import {BusinessService} from '../dist/business/service.js'
import {FunnelService} from '../dist/funnels/service.js'
import {FeedbackService} from '../dist/feedback/service.js'
import {SubscriptionService} from '../dist/subscriptions/service.js'
import {QuotaError} from '../dist/subscriptions/quota.js'
import {createApp} from '../dist/app.js'

test('quota admission on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),connections=new Set();let server
 await fixture.admin.query('CREATE DATABASE magicreview_migration_quotas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_quotas',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:8},pool=createDatabasePool(env);pool.on('connection',c=>connections.add(c))
 const password=randomBytes(24).toString('base64url'),mail=[],auth=new AuthService(pool,randomBytes(32)),tenants=new TenantService(pool,auth,{kind:'test',verify:async()=>{},send:async m=>{mail.push(m)}}),business=new BusinessService(tenants,auth),funnels=new FunnelService(pool,tenants,auth,'https://example.invalid'),feedback=new FeedbackService(tenants,auth,funnels),subscriptions=new SubscriptionService(tenants)
 const q=async(sql,args=[])=>(await pool.execute(sql,args))[0]
 const insert=async(table,obj)=>String((await q(`INSERT INTO ${table} (${Object.keys(obj).join(',')}) VALUES (${Object.keys(obj).map(()=>'?').join(',')})`,Object.values(obj))).insertId)
 let root,channel,merchant,peer,plan,superActor,owner,branch,link,version,sub,base
 const branchInput=code=>({code,name:'Quota fixture',timezone:'UTC'})
 const check=(code,metric)=>e=>e instanceof QuotaError&&e.code===code&&e.metric===metric
 const principal=async(email,tenant,role)=>{const user=await insert('users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Fixture',password_hash:await hashPassword(password),status:'active',email_verified_at:new Date()}),mid=await insert('tenant_memberships',{tenant_id:tenant,tenant_kind:tenant===root?'platform':'merchant',user_id:user,role_id:(await q('SELECT id FROM roles WHERE code=?',[role]))[0].id,status:'active'}),login=await auth.login(email,password);return auth.authenticate((await auth.selectTenant(await auth.authenticate(login.accessToken),mid)).accessToken)}
 const createMerchant=()=>insert('tenants',{public_id:randomBytes(16),kind:'merchant',parent_id:root,parent_kind:'platform',name:'Quota merchant',industry_channel_id:channel})
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up');root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'Fixture root'});channel=(await q('SELECT id FROM industry_channels LIMIT 1'))[0].id
  merchant=await createMerchant();peer=await createMerchant();superActor=await principal('super@example.invalid',root,'super_admin');owner=await principal('owner@example.invalid',merchant,'merchant_admin')
  plan=await insert('subscription_plans',{code:'finite_fixture',version:1,name:'Synthetic finite',price:'0.00',currency:'INR',interval_unit:'month'});for(const m of ['branches','staff_seats','short_links','qr_assets','feedback_submissions'])await insert('plan_limits',{plan_id:plan,metric:m,limit_value:'1'});await q("UPDATE subscription_plans SET status='published' WHERE id=?",[plan])
  sub=await subscriptions.assign(superActor,merchant,{planId:plan,status:'active',periodEnd:new Date(Date.now()+86400000)})
  server=createServer(createApp({env,auth,tenants,business,funnels,feedback,subscriptions,checkDatabase:async()=>{},isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port
  await t.test('finite exact boundary and concurrent transactions admit only one branch',async()=>{
   const outcomes=await Promise.allSettled(['a','b'].map(code=>business.createBranch(owner,merchant,branchInput(code))))
   assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);const denied=outcomes.find(o=>o.status==='rejected').reason;assert.ok(check('QUOTA_EXCEEDED','branches')(denied));assert.equal(denied.limit,'1');assert.equal(denied.used,'1');assert.equal(denied.remaining,'0')
   branch=outcomes.find(o=>o.status==='fulfilled').value.id;assert.equal((await q("SELECT used FROM usage_counters WHERE subscription_id=? AND metric='branches'",[sub.id]))[0].used,'1')
   await assert.rejects(business.createBranch(superActor,merchant,branchInput('beyond')),check('QUOTA_EXCEEDED','branches'))
  })
  await t.test('duplicate/failed creation and audit rollback never charge; archive releases capacity',async()=>{
   const original=(await q('SELECT code FROM branches WHERE id=?',[branch]))[0].code;await assert.rejects(business.createBranch(owner,merchant,branchInput(original)));assert.equal((await q("SELECT used FROM usage_counters WHERE subscription_id=? AND metric='branches'",[sub.id]))[0].used,'1')
   await business.archiveBranch(owner,branch,1);assert.equal((await q("SELECT used FROM usage_counters WHERE subscription_id=? AND metric='branches'",[sub.id]))[0].used,'0')
   branch=(await business.createBranch(owner,merchant,branchInput('replacement'))).id
  })
  await t.test('short link and QR quotas have no alternate admin bypass; QR retries/regeneration are uncharged',async()=>{
   version=(await business.createVersion(superActor,channel,{version:1,displayName:'Fixture',title:'Visit'})).id;await business.editVersion(superActor,channel,version,{},true);await business.addDestination(owner,branch,{placeId:'ChIJ_quota'})
   const f=await funnels.publish(owner,branch,{channelVersionId:version,brandTitle:'Fixture',accentHex:'#123456',locale:'en'});const requestKey='12345678-1234-4123-8123-123456789abc';link=await funnels.createLink(owner,branch,f.id,requestKey)
   assert.equal((await funnels.createLink(owner,branch,f.id,requestKey)).id,link.id)
   await assert.rejects(funnels.createLink(superActor,branch,f.id),check('QUOTA_EXCEEDED','short_links'))
   const a=await funnels.generateQr(owner,branch,{shortLinkId:link.id,format:'svg',regenerate:false});assert.equal((await funnels.generateQr(owner,branch,{shortLinkId:link.id,format:'svg',regenerate:false})).id,a.id);await funnels.generateQr(owner,branch,{shortLinkId:link.id,format:'svg',regenerate:true})
   await assert.rejects(funnels.generateQr(superActor,branch,{shortLinkId:link.id,format:'png',regenerate:false}),check('QUOTA_EXCEEDED','qr_assets'))
  })
  await t.test('feedback concurrent boundary/replay and privacy-safe HTTP denial preserve Google independence',async()=>{
   const form=async()=>(await funnels.resolve(link.code)).options.privateFeedback.submissionToken.token
   const inputs=await Promise.all([form(),form()]);const outcomes=await Promise.allSettled(inputs.map(token=>feedback.submit(link.code,{submissionToken:token,overallRating:1})));assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1)
   const i=outcomes.findIndex(o=>o.status==='fulfilled');await feedback.submit(link.code,{submissionToken:inputs[i],overallRating:1});assert.equal((await q("SELECT used FROM usage_counters WHERE subscription_id=? AND metric='feedback_submissions'",[sub.id]))[0].used,'1')
   const r=await fetch(base+'/api/v1/public/funnels/'+link.code+'/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionToken:await form(),overallRating:5})}),body=await r.json();assert.equal(r.status,409);assert.equal(body.code,'QUOTA_EXCEEDED');assert.equal(body.metric,'feedback_submissions');assert.equal(body.limit,null);assert.equal(body.used,null)
   const projection=await funnels.resolve(link.code);assert.equal(projection.options.googleReview.independent,true);assert.ok(projection.options.googleReview.url)
  })
  await t.test('staff seats consume only at acceptance, failed tokens remain reusable after capacity is available',async()=>{
   await tenants.invite(owner,merchant,{email:'invite@example.invalid',displayName:'Invited',roleCode:'merchant_staff'})
   await assert.rejects(auth.consumeToken(mail.at(-1).token,password,'invite'),check('QUOTA_EXCEEDED','staff_seats'))
   const [row]=await q("SELECT consumed_at FROM auth_tokens WHERE purpose='invite'");assert.equal(row.consumed_at,null)
   assert.equal((await q("SELECT used FROM usage_counters WHERE subscription_id=? AND metric='staff_seats'",[sub.id]))[0].used,'1')
   await subscriptions.changeStatus(superActor,merchant,sub.id,{status:'canceled',lockVersion:1});await fundTestMerchant(pool,merchant)
   await auth.consumeToken(mail.at(-1).token,password,'invite');await assert.rejects(auth.consumeToken(mail.at(-1).token,password,'invite'))
  })
  await t.test('missing subscriptions/counters, elapsed/canceled/past-due and suspended states fail closed',async()=>{
   await assert.rejects(business.createBranch(superActor,peer,branchInput('missing')),check('SUBSCRIPTION_MISSING','branches'))
   for(const status of ['active','expired','canceled','past_due']){const id=await createMerchant();await insert('subscriptions',{tenant_id:id,plan_id:plan,status,starts_at:'2020-01-01',current_period_start:'2020-01-01',current_period_end:status==='expired'?'2020-02-01':'2099-01-01'});await assert.rejects(business.createBranch(superActor,id,branchInput(status)),check(status==='active'?'QUOTA_COUNTER_MISSING':'SUBSCRIPTION_INACTIVE','branches'))}
   await tenants.status(superActor,merchant,'suspended',1);await assert.rejects(business.createBranch(owner,merchant,branchInput('suspended')));await tenants.status(superActor,merchant,'active',2)
  })
  await t.test('explicit unlimited permits multiple resources and isolation rejects peer access',async()=>{
   await fundTestMerchant(pool,peer);await business.createBranch(superActor,peer,branchInput('unlimited1'));await business.createBranch(superActor,peer,branchInput('unlimited2'));await assert.rejects(business.createBranch(owner,peer,branchInput('cross')),e=>e.status===404)
   const before=(await q('SELECT COUNT(*) AS n FROM branches WHERE tenant_id=?',[peer]))[0].n
   await q("CREATE TRIGGER fixture_quota_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='branch.created' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fixture rollback'; END IF; END")
   await assert.rejects(business.createBranch(superActor,peer,branchInput('auditfail')));assert.equal((await q('SELECT COUNT(*) AS n FROM branches WHERE tenant_id=?',[peer]))[0].n,before)
   assert.equal((await q("SELECT used FROM usage_counters WHERE tenant_id=? AND metric='branches'",[peer]))[0].used,'2')
  })
  await t.test('MariaDB refuses publication of a plan missing its metric configuration',async()=>{
   const incomplete=await insert('subscription_plans',{code:'incomplete_fixture',version:1,name:'Incomplete fixture',price:'0.00',currency:'INR',interval_unit:'month'})
   await assert.rejects(q("UPDATE subscription_plans SET status='published' WHERE id=?",[incomplete]));assert.equal((await q('SELECT status FROM subscription_plans WHERE id=?',[incomplete]))[0].status,'draft')
  })
 }finally{if(server)await new Promise(resolve=>server.close(resolve));for(const c of connections)c.destroy();await pool.end();await fixture.close()}
})
