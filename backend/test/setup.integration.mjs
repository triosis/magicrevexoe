import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID,createHmac} from 'node:crypto'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {authenticator} from './mfa-fixtures.mjs'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {bootstrapPlatform} from '../dist/setup/bootstrap.js'
import {AuthService} from '../dist/auth/service.js'
import {TenantService} from '../dist/tenants/service.js'
import {CatalogService} from '../dist/subscriptions/catalog.js'
import {SubscriptionService} from '../dist/subscriptions/service.js'
import {BillingService} from '../dist/billing/service.js'
import {RazorpayProvider} from '../dist/billing/provider.js'
import {syntheticTerms} from './commercial-fixtures.mjs'
import {FunnelService} from '../dist/funnels/service.js'
import {DraftService} from '../dist/ai/service.js'
import {ClaudeProvider} from '../dist/ai/provider.js'
import {PresentationService} from '../dist/business/presentation.js'
import {FeedbackService} from '../dist/feedback/service.js'
import {PNG} from 'pngjs'

test('operator bootstrap and approved catalog on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set()
 await fixture.admin.query('CREATE DATABASE magicreview_migration_setup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const pool=createDatabasePool({DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_setup',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5});pool.on('connection',c=>sessions.add(c))
 const input={platformName:'Synthetic platform',email:'owner@example.invalid',displayName:'Synthetic owner',password:randomBytes(32).toString('base64url')}
 const query=async(sql,args=[]) => (await pool.execute(sql,args))[0]
 let principal,auth,catalog,plan
 try{
  await t.test('incomplete schema refuses bootstrap without provisioning identities',async()=>{
   const files=await loadMigrations(new URL('../migrations/',import.meta.url));await runMigrations(pool,files.slice(0,3),'up')
   await assert.rejects(bootstrapPlatform(pool,input),/Apply all reviewed migrations/)
   assert.equal((await query('SELECT COUNT(*) AS n FROM tenants'))[0].n,'0')
   await runMigrations(pool,files,'up')
  })
  await t.test('concurrent first-run creates exactly one root, owner, membership and audit',async()=>{
   const results=await Promise.all([bootstrapPlatform(pool,input),bootstrapPlatform(pool,input)])
   assert.equal(results.filter(r=>r.created).length,1)
   for(const table of ['tenants','users','tenant_memberships'])assert.equal((await query('SELECT COUNT(*) AS n FROM '+table))[0].n,'1')
   assert.equal((await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='platform.bootstrapped'"))[0].n,'1')
   assert.equal((await query('SELECT COUNT(*) AS n FROM subscription_plans'))[0].n,'0')
  })
  await t.test('repeat is idempotent and conflicting bootstrap never overwrites password or records',async()=>{
   const before=await query('SELECT id,email,password_hash FROM users')
   assert.equal((await bootstrapPlatform(pool,{...input,password:randomBytes(32).toString('base64url')})).created,false)
   await assert.rejects(bootstrapPlatform(pool,{...input,email:'other@example.invalid'}),e=>e.status===409)
   assert.deepEqual(await query('SELECT id,email,password_hash FROM users'),before)
  })
  await t.test('new owner must activate MFA; incomplete sessions cannot author a catalog',async()=>{
   auth=new AuthService(pool,randomBytes(32),undefined,undefined,randomBytes(32))
   const login=await auth.login(input.email,input.password);assert.equal(login.mfaRequired,true);assert.equal(login.accessToken,undefined)
   const otp=authenticator(await auth.enrollMfa(login.challengeToken)),complete=await auth.verifyMfa(login.challengeToken,otp.generate(),true)
   const me=await auth.me(await auth.authenticate(complete.accessToken)),selected=await auth.selectTenant(await auth.authenticate(complete.accessToken),me.memberships[0].membershipId)
   principal=await auth.authenticate(selected.accessToken);catalog=new CatalogService(new TenantService(pool,auth))
  })
  const terms={code:'synthetic_explicit',version:1,name:'Explicit test-only terms',price:'0.00',currency:'INR',interval:'month',limits:{branches:'2',staff_seats:'2',feedback_submissions:'5',short_links:'2',qr_assets:'2'}}
  await t.test('missing terms refused, concurrent create deduplicated, changes require new version',async()=>{
   await assert.rejects(catalog.create(principal,{...terms,price:undefined}),e=>e.status===400)
   await assert.rejects(catalog.create(principal,{...terms,limits:{branches:'2'}}),e=>e.status===400)
   const results=await Promise.all([catalog.create(principal,terms),catalog.create(principal,terms)]);assert.equal(results.filter(r=>r.created).length,1);plan=results[0].id
   await assert.rejects(catalog.create(principal,{...terms,price:'1.00'}),e=>e.status===409)
   assert.equal((await query('SELECT COUNT(*) AS n FROM plan_limits WHERE plan_id=?',[plan]))[0].n,'5')
  })
  await t.test('publish is explicit, immutable and repeatable with exactly one success audit',async()=>{
   assert.equal((await query('SELECT status FROM subscription_plans WHERE id=?',[plan]))[0].status,'draft')
   assert.equal((await catalog.publish(principal,plan)).changed,true);assert.equal((await catalog.publish(principal,plan)).changed,false)
   await assert.rejects(query('UPDATE subscription_plans SET price=? WHERE id=?',['3.00',plan]))
   assert.equal((await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='catalog.published' AND resource_id=?",[plan]))[0].n,'1')
   assert.equal((await catalog.list(principal)).plans.length,1)
  })
  const tenants=new TenantService(pool,auth),subscriptions=new SubscriptionService(tenants)
  const presentations=new PresentationService(tenants),deniedActors=[]
  const insert=async(table,values)=>{const columns=Object.keys(values);return String((await query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,Object.values(values))).insertId)}
  const root=(await query("SELECT id FROM tenants WHERE kind='platform'"))[0].id,channel=(await query("SELECT id FROM industry_channels WHERE code='clinic_healthcare'"))[0].id
  const merchant=await insert('tenants',{public_id:randomBytes(16),kind:'merchant',parent_id:root,parent_kind:'platform',industry_channel_id:channel,name:'Synthetic clinic'})
  await t.test('billing and catalog reject staff and another merchant despite a valid authenticated session',async()=>{
   const peer=await insert('tenants',{public_id:randomBytes(16),kind:'merchant',parent_id:root,parent_kind:'platform',industry_channel_id:channel,name:'Synthetic peer'})
   for(const [tenant,role]of [[merchant,'merchant_staff'],[peer,'merchant_admin']]){
    const roleId=(await query('SELECT id FROM roles WHERE code=?',[role]))[0].id
    const membership=await insert('tenant_memberships',{tenant_id:tenant,tenant_kind:'merchant',user_id:principal.identity.sub,role_id:roleId,status:'active'})
    const selected=await auth.selectTenant(principal,membership),actor=await auth.authenticate(selected.accessToken),service=new BillingService(pool,tenants,subscriptions)
    deniedActors.push(actor)
    await assert.rejects(service.history(actor,merchant),e=>[403,404].includes(e.status))
    await assert.rejects(catalog.create(actor,{...terms,code:'forbidden'}),e=>e.status===403)
   }
  })
  const paidPlan=(await catalog.create(principal,{...terms,code:'synthetic_paid',price:'1.00'})).id;await catalog.publish(principal,paidPlan)
  const secret='synthetic-webhook-secret-at-least-32-characters',calls=[]
  const provider=new RazorpayProvider({RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_synthetic',RAZORPAY_KEY_SECRET:'synthetic-api-secret-long',RAZORPAY_WEBHOOK_SECRET:secret},async(url)=>{
   calls.push(url)
   if(url.endsWith('plans/plan_synthetic'))return Response.json({id:'plan_synthetic',period:'monthly',interval:1,item:{amount:100,currency:'INR'}})
   if(url.endsWith('/subscriptions'))return Response.json({id:'sub_synthetic',plan_id:'plan_synthetic',status:'created',short_url:'https://rzp.io/synthetic'})
   if(url.endsWith('/cancel'))return Response.json({id:'sub_synthetic',plan_id:'plan_synthetic',status:'cancelled'})
   if(url.includes('/payments/'))return Response.json({id:'pay_synthetic',status:'captured',amount:100,currency:'INR',invoice_id:'inv_synthetic'})
   if(url.includes('/invoices/'))return Response.json({id:'inv_synthetic',subscription_id:'sub_synthetic',payment_id:'pay_synthetic',status:'paid'})
   throw Error('Unexpected synthetic protocol call')
  }),billing=new BillingService(pool,tenants,subscriptions,provider),requestKey=randomUUID()
  await t.test('unapproved paid checkout and manual assignment fail without network calls',async()=>{
   await assert.rejects(billing.checkout(principal,merchant,{planId:paidPlan,requestKey}),e=>e.status===409)
   await assert.rejects(subscriptions.assign(principal,merchant,{planId:paidPlan,status:'active',currentPeriodStart:new Date(Date.now()-60000).toISOString(),currentPeriodEnd:new Date(Date.now()+86400000).toISOString()}),e=>e.status===409)
   assert.equal(calls.length,0);assert.equal((await query('SELECT COUNT(*) AS n FROM billing_agreements'))[0].n,'0')
   assert.equal((await catalog.approve(principal,paidPlan,{reference:'SYNTHETIC-ONLY',terms:syntheticTerms})).created,true)
   assert.equal((await catalog.approve(principal,paidPlan,{reference:'SYNTHETIC-ONLY',terms:syntheticTerms})).created,false)
   await assert.rejects(catalog.approve(principal,paidPlan,{reference:'CHANGED',terms:syntheticTerms}),e=>e.status===409)
  })
  await t.test('even approved catalog and concurrent requests cannot enable financial execution',async()=>{
   const results=await Promise.allSettled(Array.from({length:4},()=>billing.checkout(principal,merchant,{planId:paidPlan,requestKey})))
   assert.ok(results.every(r=>r.status==='rejected'&&r.reason.status===409));assert.equal(calls.length,0)
   assert.equal((await query('SELECT COUNT(*) AS n FROM billing_agreements'))[0].n,'0');assert.equal((await query('SELECT COUNT(*) AS n FROM subscriptions'))[0].n,'0')
   // Historical external agreement fixture: not created by a financial API.
   await insert('billing_agreements',{tenant_id:merchant,plan_id:paidPlan,request_key:randomBytes(16),provider_id:'sub_synthetic',checkout_url:'https://rzp.io/synthetic',status:'ready'})
   await assert.rejects(billing.checkout(principal,merchant,{planId:paidPlan,requestKey}),e=>e.status===409)
  })
  await t.test('signed payment replay preserves one reconciliation receipt but cannot activate paid access',async()=>{
   const now=Math.floor(Date.now()/1000),body=Buffer.from(JSON.stringify({event:'subscription.charged',payload:{subscription:{entity:{id:'sub_synthetic',plan_id:'plan_synthetic',status:'active',current_start:now-60,current_end:now+86400}},payment:{entity:{id:'pay_synthetic',status:'captured',amount:100,currency:'INR',invoice_id:'inv_synthetic'}}}})),signature=createHmac('sha256',secret).update(body).digest('hex')
   await assert.rejects(billing.webhook(body,'invalid','evt_invalid'),e=>e.status===401)
   const results=await Promise.all([billing.webhook(body,signature,'evt_synthetic'),billing.webhook(body,signature,'evt_synthetic')]);assert.equal(results.filter(r=>r.allocation).length,0)
   assert.equal((await query('SELECT COUNT(*) AS n FROM subscriptions'))[0].n,'0');assert.equal((await query('SELECT COUNT(*) AS n FROM usage_counters'))[0].n,'0');assert.equal((await query('SELECT COUNT(*) AS n FROM billing_events'))[0].n,'1')
   assert.equal((await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='billing.payment_received'"))[0].n,'1')
   await assert.rejects(query("UPDATE billing_events SET event_type='changed'"));await assert.rejects(query('UPDATE commercial_approvals SET approval_reference=?',['changed']))
  })
  // Explicit zero-price synthetic allocation keeps AI/quota regressions independent of finance.
  await catalog.approve(principal,plan,{reference:'SYNTHETIC-FREE',terms:syntheticTerms})
  await subscriptions.assign(principal,merchant,{planId:plan,status:'active',periodEnd:new Date(Date.now()+86400000)})
  const branch=await insert('branches',{public_id:randomBytes(16),tenant_id:merchant,industry_channel_id:channel,code:'main',name:'Main',timezone:'UTC'})
  const version=await insert('channel_versions',{industry_channel_id:channel,version:1,status:'published',display_name:'Clinic',public_copy:JSON.stringify({title:'Visit',google_label:'Leave a Google review',private_label:'Share private feedback'}),feedback_labels:JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'}),published_at:new Date()})
  const destination=await insert('review_destinations',{tenant_id:merchant,branch_id:branch,place_id:'ChIJ_fixture',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_fixture'})
  const funnel=await insert('funnel_configurations',{tenant_id:merchant,branch_id:branch,industry_channel_id:channel,channel_version_id:version,review_destination_id:destination,revision:1,status:'published',brand_title:'Visit',accent_hex:'#123456',locale:'en',published_at:new Date()})
  const code=randomBytes(16).toString('base64url');await insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code})
  const funnels=new FunnelService(pool,tenants,auth,'https://api.example.invalid');let generations=0
  const ai=new ClaudeProvider({ANTHROPIC_API_KEY:'synthetic-provider-key-long',ANTHROPIC_MODEL:'claude-test',ANTHROPIC_API_VERSION:'2023-06-01',AI_MAX_OUTPUT_TOKENS:64},async(url)=>{if(url.endsWith('count_tokens'))return Response.json({input_tokens:10});generations++;return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'The wait was long. Service could improve.'}],usage:{input_tokens:10,output_tokens:8}})})
  const drafts=new DraftService(funnels,auth,ai),draftRequest={submissionToken:(await funnels.resolve(code)).options.privateFeedback.submissionToken.token,requestKey:randomUUID(),language:'en',rating:1,tags:['long_wait']}
  await t.test('view receipts deduplicate under concurrency and expose no automatic overage charge',async()=>{
   const receipt={submissionToken:draftRequest.submissionToken,requestKey:randomUUID(),language:'ml'}
   const results=await Promise.all([drafts.scan(code,receipt),drafts.scan(code,receipt)]);assert.equal(results.filter(r=>r.created).length,1)
   const usage=await billing.metering(principal,merchant);assert.equal(usage.recordedViews,'1');assert.equal(usage.settlement,'not_charged')
  })
  await t.test('concurrent AI reservation and retry produce one draft, token ledger and audit',async()=>{
   const results=await Promise.allSettled(Array.from({length:4},()=>drafts.generate(code,draftRequest)))
   assert.ok(results.some(r=>r.status==='fulfilled'),results.map(r=>r.reason?.stack).join('\n'));assert.equal(generations,1)
   const cached=await drafts.generate(code,draftRequest);assert.equal(cached.posted,false);assert.equal(generations,1)
   const rows=await query("SELECT status,input_tokens,output_tokens FROM billable_usage WHERE metric='ai_draft'");assert.equal(rows.length,1);assert.equal(rows[0].status,'complete');assert.equal(rows[0].input_tokens,'10');assert.equal(rows[0].output_tokens,'8')
   assert.equal((await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='ai.draft_generated'"))[0].n,'1')
   await assert.rejects(drafts.generate(code,{...draftRequest,rating:5}),e=>e.status===409)
   await assert.rejects(drafts.generate(code,{...draftRequest,requestKey:randomUUID(),diagnosis:'forbidden'}),e=>e.status===400)
  })
  await t.test('ambiguous AI failure retains reservation; retry cannot consume provider tokens twice',async()=>{
   let attempts=0
   const failing=new ClaudeProvider({ANTHROPIC_API_KEY:'synthetic-provider-key-long',ANTHROPIC_MODEL:'claude-test',ANTHROPIC_API_VERSION:'2023-06-01',AI_MAX_OUTPUT_TOKENS:64},async(url)=>{if(url.endsWith('count_tokens'))return Response.json({input_tokens:10});attempts++;throw Error('synthetic network failure')})
   const service=new DraftService(funnels,auth,failing),request={...draftRequest,requestKey:randomUUID()}
   await assert.rejects(service.generate(code,request),e=>e.status===503);await assert.rejects(service.generate(code,request),e=>e.status===409);assert.equal(attempts,1)
   assert.equal((await query("SELECT COUNT(*) AS n FROM billable_usage WHERE status='unknown'"))[0].n,'1')
   assert.equal((await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='ai.draft_generated'"))[0].n,'1')
  })
  await t.test('audit failure rolls back completed draft and token counts together',async()=>{
   await query("CREATE TRIGGER fixture_ai_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='ai.draft_generated' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END")
   const request={...draftRequest,requestKey:randomUUID()}
   try{await assert.rejects(drafts.generate(code,request));const row=(await query('SELECT status,input_tokens,draft_text FROM billable_usage WHERE request_key=?',[Buffer.from(request.requestKey.replaceAll('-',''),'hex')]))[0];assert.equal(row.status,'reserved');assert.equal(row.input_tokens,null);assert.equal(row.draft_text,null)}finally{await query('DROP TRIGGER fixture_ai_audit_failure')}
   const before=generations;await assert.rejects(drafts.generate(code,{...draftRequest,requestKey:randomUUID()}),e=>e.status===409);assert.equal(generations,before)
  })
  await t.test('explicit cancellation stops renewal without erasing paid allocation or repeating a provider operation',async()=>{
   const agreement=(await query('SELECT id FROM billing_agreements'))[0].id
   // A reconciled historical active agreement; no paid activation is performed.
   await query("UPDATE billing_agreements SET status='active' WHERE id=?",[agreement])
   assert.equal((await billing.cancel(principal,merchant,agreement,{atCycleEnd:true})).renewalCanceled,true)
   assert.equal((await query('SELECT status FROM subscriptions WHERE tenant_id=?',[merchant]))[0].status,'active')
   await assert.rejects(billing.cancel(principal,merchant,agreement,{atCycleEnd:true}),e=>e.status===409)
   await assert.rejects(billing.checkout(principal,merchant,{planId:paidPlan,requestKey:randomUUID()}),e=>e.status===409)
   assert.equal(calls.filter(u=>u.endsWith('/cancel')).length,1)
  })
  await t.test('invoice preparation is scoped data only, never a numbered financial document or charge',async()=>{
   const agreement=(await query('SELECT id FROM billing_agreements'))[0].id,before=calls.length
   const prepared=await billing.invoicePreparation(principal,merchant,agreement)
   assert.equal(prepared.issued,false);assert.equal(prepared.financialDocument,false);assert.equal(prepared.invoiceNumber,null);assert.equal(prepared.recipient,null);assert.equal(prepared.taxBreakdown,null);assert.equal(prepared.amountDue,null);assert.equal(prepared.settlement,'disabled');assert.equal(prepared.verifiedPaymentReceipts.length,1);assert.ok(prepared.missingApprovals.includes('written_finance_reviewed_billing_settlement_gst_policy'));assert.equal(calls.length,before)
   await assert.rejects(billing.invoicePreparation(principal,merchant,'999999'),e=>e.status===404)
  })
  await t.test('paid reactivation and internal allocation cannot bypass written policy with an approved catalog',async()=>{
   const legacy=await insert('tenants',{public_id:randomBytes(16),kind:'merchant',parent_id:root,parent_kind:'platform',industry_channel_id:channel,name:'Legacy paid fixture'})
   const sub=await insert('subscriptions',{tenant_id:legacy,plan_id:paidPlan,status:'trialing',starts_at:new Date(Date.now()-60000),current_period_start:new Date(Date.now()-60000),current_period_end:new Date(Date.now()+86400000)})
   await assert.rejects(subscriptions.changeStatus(principal,legacy,sub,{status:'active',lockVersion:1}),e=>e.status===409)
   await assert.rejects(subscriptions.initializeUsage(principal,legacy,sub),e=>e.status===409)
   const db=await pool.getConnection();try{await assert.rejects(subscriptions.allocateVerifiedPayment(db,legacy,paidPlan,new Date(Date.now()-1000),new Date(Date.now()+86400000)),e=>e.status===409)}finally{db.release()}
   assert.equal((await query('SELECT status FROM subscriptions WHERE id=?',[sub]))[0].status,'trialing')
  })
  await t.test('presentation is scoped, concurrent updates refuse lost writes, logo and keywords reach only their own public funnel',async()=>{
   for(const actor of deniedActors)await assert.rejects(presentations.update(actor,merchant,{lockVersion:0,seedKeywords:[]}),e=>[403,404].includes(e.status))
   const input={lockVersion:0,seedKeywords:['service experience','clean environment','waiting time']}
   const results=await Promise.allSettled([presentations.update(principal,merchant,input),presentations.update(principal,merchant,input)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
   const logo=PNG.sync.write(new PNG({width:2,height:2}));await presentations.logo(principal,merchant,logo,1)
   const page=await funnels.resolve(code);assert.equal(page.merchant.logoDataUrl,'data:image/png;base64,'+logo.toString('base64'));assert.equal(JSON.stringify(page).includes('seedKeywords'),false)
   assert.equal((await presentations.get(principal,merchant)).lockVersion,2)
   await assert.rejects(query('UPDATE merchant_presentation SET tenant_id=? WHERE tenant_id=?',[root,merchant]))
  })
  const feedback=new FeedbackService(tenants,auth,funnels)
  await t.test('resolved feedback archives atomically without rewriting enum history; archived rows cannot reopen',async()=>{
   await feedback.submit(code,{submissionToken:draftRequest.submissionToken,overallRating:2,language:'ml'})
   const row=(await feedback.list(principal,{merchantId:merchant,limit:50})).feedback[0]
   assert.equal(row.language,'ml');await assert.rejects(query('UPDATE private_feedback SET customer_language=? WHERE id=?',['en',row.id]))
   await assert.rejects(query('INSERT INTO feedback_archives(tenant_id,feedback_id,actor_user_id) VALUES (?,?,?)',[merchant,row.id,principal.identity.sub]))
   await feedback.changeStatus(principal,row.id,{status:'resolved',reasonCode:'completed',lockVersion:row.lockVersion})
   const concurrent=await Promise.allSettled([feedback.changeStatus(principal,row.id,{status:'archived',reasonCode:'completed',lockVersion:2}),feedback.changeStatus(principal,row.id,{status:'archived',reasonCode:'completed',lockVersion:2})]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1)
   const archived=await feedback.details(principal,row.id);assert.equal(archived.status,'archived');assert.equal(archived.history.at(-1).toStatus,'archived');assert.equal(archived.lockVersion,3)
   await assert.rejects(feedback.changeStatus(principal,row.id,{status:'in_progress',reasonCode:'reopened',lockVersion:3}),e=>e.status===409)
   assert.equal((await feedback.list(principal,{merchantId:merchant,status:'resolved',limit:50})).feedback.length,0)
   assert.equal((await feedback.statistics(principal,{merchantId:merchant,status:'archived'})).groups[0].count,'1')
  })
  await t.test('analytics uses actual scoped UTC records and never fabricates Google conversion',async()=>{
   const data=await feedback.analytics(principal,{merchantId:merchant});assert.equal(data.googlePosts,null);assert.equal(data.conversionToGooglePosts,null);assert.equal(data.ratings.find(r=>r.rating===2).count,'1');assert.equal(data.activity[0].status,'archived')
   assert.ok(data.publicActivity.some(row=>row.event==='public.funnel_viewed'));assert.ok(data.publicActivity.every(row=>!Object.hasOwn(row,'actor_user_id')))
   for(const actor of deniedActors.slice(1))await assert.rejects(feedback.analytics(actor,{merchantId:merchant}),e=>[403,404].includes(e.status))
   await assert.rejects(feedback.analytics(principal,{from:new Date('2020-01-01'),to:new Date('2021-01-01')}),e=>e.status===400)
  })
  await t.test('archive audit failure rolls back archive and optimistic version together',async()=>{
   await feedback.submit(code,{submissionToken:(await funnels.resolve(code)).options.privateFeedback.submissionToken.token,overallRating:4})
   const row=(await feedback.list(principal,{merchantId:merchant,status:'new',limit:50})).feedback[0]
   await feedback.changeStatus(principal,row.id,{status:'resolved',reasonCode:'completed',lockVersion:1})
   await query("CREATE TRIGGER fixture_archive_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='feedback.archived' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END")
   try{await assert.rejects(feedback.changeStatus(principal,row.id,{status:'archived',reasonCode:'completed',lockVersion:2}));assert.equal((await feedback.details(principal,row.id)).status,'resolved');assert.equal((await feedback.details(principal,row.id)).lockVersion,2);assert.equal((await query('SELECT COUNT(*) AS n FROM feedback_archives WHERE feedback_id=?',[row.id]))[0].n,'0')}finally{await query('DROP TRIGGER fixture_archive_audit_failure')}
  })
  await t.test('PDF QR export verifies live ownership and readiness before rendering',async()=>{
   const link=(await query('SELECT id FROM short_links WHERE code=?',[code]))[0].id,asset=await funnels.generateQr(principal,branch,{shortLinkId:link,format:'svg',regenerate:false})
   const content=await funnels.qrPrint(principal,asset.id);assert.equal(content.subarray(0,8).toString(),'%PDF-1.4');assert.match(content.toString(),/Google review or private feedback/)
   for(const actor of deniedActors.slice(1))await assert.rejects(funnels.qrPrint(actor,asset.id),e=>[403,404].includes(e.status))
   await query("UPDATE short_links SET status='disabled' WHERE id=?",[link]);await assert.rejects(funnels.qrPrint(principal,asset.id),e=>e.status===409)
  })
 }finally{for(const c of sessions)c.destroy();await pool.end();await fixture.close()}
})
