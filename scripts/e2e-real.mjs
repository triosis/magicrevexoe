import {approveSyntheticPlan} from '../backend/test/commercial-fixtures.mjs'
import {CatalogService} from '../backend/dist/subscriptions/catalog.js'
import {BillingService} from '../backend/dist/billing/service.js'
import {DraftService} from '../backend/dist/ai/service.js'
import {PNG} from '../backend/node_modules/pngjs/lib/png.js'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer as secureServer} from 'node:https'
import {once} from 'node:events'
import {spawn} from 'node:child_process'
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {randomBytes,createHash} from 'node:crypto'
import {createServer as viteServer} from 'vite'
import {chromium,expect,request as httpRequest} from '@playwright/test'
import {startDisposableMariaDB} from '../backend/test/mariadb-fixture.mjs'
import {createDatabasePool,createReadinessCheck} from '../backend/dist/db/pool.js'
import {loadMigrations,runMigrations} from '../backend/dist/migrations/runner.js'
import {hashPassword} from '../backend/dist/auth/passwords.js'
import {AuthService} from '../backend/dist/auth/service.js'
import {authenticator} from '../backend/test/mfa-fixtures.mjs'
import {TenantService} from '../backend/dist/tenants/service.js'
import {BusinessService} from '../backend/dist/business/service.js'
import {FunnelService} from '../backend/dist/funnels/service.js'
import {FeedbackService} from '../backend/dist/feedback/service.js'
import {SubscriptionService} from '../backend/dist/subscriptions/service.js'
import {createApp} from '../backend/dist/app.js'

// No .env loader, remote DB option, response mocking, service/grant override or
// production bootstrap. Only synthetic fixtures in a harness-owned MariaDB process.
test('real React + Express + MariaDB 11.8.9 end-to-end',{timeout:240000},async t=>{
 const evidence=path.resolve('.tmp-frontend/real-e2e');await mkdir(evidence,{recursive:true})
 const certDir=await mkdtemp(path.join(tmpdir(),'magicreview-e2e-tls-'))
 const openssl=spawn(process.env.OPENSSL_TEST_BIN??'C:/Program Files/Git/usr/bin/openssl.exe',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(certDir,'key.pem'),'-out',path.join(certDir,'cert.pem'),'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'],{windowsHide:true,stdio:'ignore'})
 assert.equal((await once(openssl,'exit'))[0],0,'Local test certificate generation')
 const tls={key:await readFile(path.join(certDir,'key.pem')),cert:await readFile(path.join(certDir,'cert.pem'))}
 const fixture=await startDisposableMariaDB(),connections=new Set(),deliveries=new Map(),password=randomBytes(24).toString('base64url')
 let pool,backend,frontend,browser
 const pageErrors=[],external=[],results=[]
 const checked=async(name,fn)=>{let failed;await t.test(name,async()=>{try{await fn();results.push(name)}catch(error){failed=new Error(error.message);throw failed}});if(failed)throw failed}
 let superActor,resellerActor,subActor,merchantActor,peerActor,merchant,direct,resellerDirect,reseller,sub,branch,link,asset,version,channel,plan,subscription,feedbackId,web,api,page,publicPage,superPage,merchantPage
 const actor=async email=>{
  const login=await request('POST','/auth/login',null,{email,password});assert.equal(login.status,200)
  const me=await request('GET','/auth/me',login.body.accessToken)
  const selected=await request('POST','/auth/select-tenant',login.body.accessToken,{membershipId:me.body.memberships[0].membershipId});assert.equal(selected.status,200)
  return selected.body.accessToken
 }
 async function request(method,url,token,body){
  const r=await httpRequest.newContext({ignoreHTTPSErrors:true});try{
   const response=await r.fetch(api+'/api/v1'+url,{method,headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{data:body})})
   return{status:response.status(),body:response.status()===204?null:await response.json(),headers:response.headers()}
  }finally{await r.dispose()}
 }
 async function query(sql,args=[]){return(await pool.execute(sql,args))[0]}
 async function browserLogin(target,email){await target.goto(web+'/login');await target.getByLabel('Email',{exact:true}).fill(email);await target.getByLabel('Password',{exact:true}).fill(password);const selected=target.waitForResponse(r=>r.url()===api+'/api/v1/auth/select-tenant'&&r.request().method()==='POST');await target.getByRole('button',{name:'Sign in',exact:true}).click();if(email==='super@example.invalid'){const image=target.getByRole('img',{name:'Private MFA enrollment QR'});await expect(image).toBeVisible();const otp=authenticator(await image.screenshot());await target.getByLabel('Authenticator or recovery code').fill(otp.generate());await target.getByRole('button',{name:'Verify MFA',exact:true}).click();await target.getByRole('button',{name:'I saved my recovery codes'}).click()}await expect(target.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible();return(await(await selected).json()).accessToken}
 async function accept(email){
  const message=deliveries.get(email);assert.ok(message,'Invitation delivered only to memory adapter')
  const p=await browser.newPage({ignoreHTTPSErrors:true});try{await p.goto(web+'/accept-invitation#token='+message.token);await expect(p).toHaveURL(web+'/accept-invitation');await p.getByLabel('Account password').fill(password);await p.getByRole('button',{name:'Accept invitation',exact:true}).click();await expect(p.getByRole('status')).toContainText('Invitation accepted')}finally{await p.close()}
 }
 async function provision(target,kind,name,email,parent){
  await target.getByRole('link',{name:'Accounts',exact:true}).first().click();await target.getByLabel('Account type',{exact:true}).selectOption(kind)
  await expect(target.getByLabel('Parent account',{exact:true}).locator(`option[value="${parent}"]`)).toHaveCount(1)
  await target.getByLabel('Parent account',{exact:true}).selectOption(parent);await target.getByLabel('Business or account name').fill(name)
  if(kind==='merchant')await target.getByLabel('Industry channel',{exact:true}).selectOption('clinic_healthcare')
  await target.getByLabel('Administrator name').fill('Local test owner');await target.getByLabel('Administrator email').fill(email)
  const response=target.waitForResponse(r=>r.request().method()==='POST'&&r.url()===api+'/api/v1/'+(kind==='merchant'?'merchants':'tenants'))
  await target.getByRole('button',{name:'Create account',exact:true}).click();const r=await response;assert.equal(r.status(),201,await r.text());const data=await r.json();assert.equal(data.invitation.deliveryStatus,'test_delivered');if(kind==='merchant'){const assigned=await request('POST',`/merchants/${data.tenant.id}/subscriptions`,superActor,{planId:plan,periodEnd:new Date(Date.now()+86400000).toISOString()});assert.equal(assigned.status,201)}return data.tenant.id
 }
 try{
  assert.match((await fixture.admin.query('SELECT VERSION() AS version'))[0][0].version,/11\.8\.9-MariaDB/)
  await fixture.admin.query('CREATE DATABASE magicreview_migration_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_e2e',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:8}
  pool=createDatabasePool(env);pool.on('connection',c=>connections.add(c))
  await runMigrations(pool,await loadMigrations(new URL('../backend/migrations/',import.meta.url)),'up')
  assert.equal((await query("SELECT COUNT(*) AS n FROM schema_migrations WHERE status<>'applied'"))[0].n,'0')
  // Explicit test-only bootstrap; never an application seed or administrator API.
  await query("INSERT INTO tenants(public_id,kind,name) VALUES (?,'platform','Local verification platform')",[randomBytes(16)])
  const root=(await query("SELECT id FROM tenants WHERE kind='platform'"))[0].id
  await query("INSERT INTO users(public_id,email,email_key,display_name,password_hash,status,email_verified_at) VALUES (?,?,?,'Local verification admin',?,'active',UTC_TIMESTAMP(6))",[randomBytes(16),'super@example.invalid',Buffer.from('super@example.invalid'),await hashPassword(password)])
  const uid=(await query('SELECT id FROM users'))[0].id,role=(await query("SELECT id FROM roles WHERE code='super_admin'"))[0].id
  await query("INSERT INTO tenant_memberships(tenant_id,tenant_kind,user_id,role_id,status) VALUES (?,'platform',?,?,'active')",[root,uid,role])
  await query("INSERT INTO subscription_plans(code,version,name,price,currency,interval_unit) VALUES ('e2e_fixture',1,'Synthetic verification plan',0.00,'INR','month')")
  plan=(await query('SELECT id FROM subscription_plans'))[0].id
  for(const metric of ['branches','staff_seats','feedback_submissions','short_links','qr_assets'])await query('INSERT INTO plan_limits(plan_id,metric,limit_value) VALUES (?,?,?)',[plan,metric,metric==='feedback_submissions'?'20':'5'])
  await query("UPDATE subscription_plans SET status='published' WHERE id=?",[plan])
  await approveSyntheticPlan(query,plan)
  backend=secureServer(tls);backend.listen(0,'127.0.0.1');await once(backend,'listening');api='https://127.0.0.1:'+backend.address().port
  process.env.VITE_API_URL=api+'/api/v1'
  frontend=await viteServer({envDir:false,server:{host:'127.0.0.1',port:0,https:tls}});await frontend.listen();web='https://127.0.0.1:'+frontend.httpServer.address().port;env.CORS_ORIGINS=[web]
  const auth=new AuthService(pool,randomBytes(32),undefined,undefined,randomBytes(32)),delivery={kind:'test',verify:async()=>{},send:async message=>{deliveries.set(message.email,message)}}
  const tenants=new TenantService(pool,auth,delivery),business=new BusinessService(tenants,auth),funnels=new FunnelService(pool,tenants,auth,api,web),feedback=new FeedbackService(tenants,auth,funnels),subscriptions=new SubscriptionService(tenants)
  const catalog=new CatalogService(tenants),billing=new BillingService(pool,tenants,subscriptions),drafts=new DraftService(funnels,auth)
  backend.on('request',createApp({env,auth,tenants,business,funnels,feedback,subscriptions,catalog,billing,drafts,checkDatabase:createReadinessCheck(pool),isShuttingDown:()=>false}))
  browser=await chromium.launch({channel:'chrome',headless:true})
  // Deny all non-loopback network, including Google. No local API responses are intercepted.
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}})
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();external.push(u.origin+u.pathname);return route.abort()})
  context.on('page',p=>p.on('pageerror',e=>pageErrors.push(e.message)))
  page=await context.newPage();publicPage=await context.newPage()
  await checked('browser Super Admin login, platform channel publication and reseller provisioning',async()=>{
   superPage=page;superActor=await browserLogin(page,'super@example.invalid')
   await page.getByRole('link',{name:'Subscription catalog',exact:true}).first().click()
   await page.getByRole('heading',{name:/Synthetic verification plan/}).waitFor()
   channel=(await request('GET','/industry-channels',superActor)).body.channels.find(c=>c.code==='clinic_healthcare').id
   const draft=await request('POST',`/industry-channels/${channel}/versions`,superActor,{version:1,displayName:'Local service experience',title:'How was your service experience?'});assert.equal(draft.status,201);version=draft.body.id
   assert.equal((await request('POST',`/industry-channels/${channel}/versions/${version}/publish`,superActor,{})).status,200)
   reseller=await provision(page,'reseller','E2E Reseller','reseller@example.invalid',root)
   await accept('reseller@example.invalid')
  })
  await checked('browser reseller and sub-reseller login, invitation acceptance and merchant onboarding hierarchy',async()=>{
   page=await context.newPage();resellerActor=await browserLogin(page,'reseller@example.invalid')
   sub=await provision(page,'sub_reseller','E2E Sub Reseller','sub@example.invalid',reseller);await accept('sub@example.invalid')
   page=await context.newPage();subActor=await browserLogin(page,'sub@example.invalid')
   merchant=await provision(page,'merchant','E2E Clinic','merchant@example.invalid',sub);await accept('merchant@example.invalid')
   assert.equal((await request('GET',`/merchants/${merchant}`,subActor)).body.industryChannel.code,'clinic_healthcare')
  })
  await checked('browser branch, Google destination, immutable publication, short link and QR preview/download',async()=>{
   await page.getByRole('link',{name:/Continue merchant onboarding/}).click();await page.getByLabel('Branch name',{exact:true}).fill('E2E Reception');await page.getByLabel('Branch code',{exact:true}).fill('main');await page.getByLabel('IANA timezone',{exact:true}).fill('Asia/Kolkata')
   await page.getByRole('button',{name:'Create branch',exact:true}).click();await page.getByLabel('Google Place ID',{exact:true}).fill('ChIJ_e2e_fixture');await page.getByRole('button',{name:'Add Google destination',exact:true}).click();await expect(page.getByRole('button',{name:'Update Google destination'})).toBeVisible()
   await expect(page.getByText('Business setup complete',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Publish funnel & create short link',exact:true}).click()
   await expect(page.getByRole('link',{name:new RegExp(api+'/api/v1/public/funnels/')})).toBeVisible();branch=(await request('GET',`/merchants/${merchant}/branches`,subActor)).body.branches[0].id;link=(await request('GET',`/branches/${branch}/short-links`,subActor)).body.shortLinks[0]
   await page.getByRole('button',{name:'Generate QR code',exact:true}).click();await expect(page.getByRole('img',{name:/Review QR/})).toBeVisible()
   const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const download=await dl;await download.saveAs(path.join(evidence,'qr.svg'))
   asset=(await request('GET',`/branches/${branch}/qr`,subActor)).body.qrAssets[0];const bytes=await readFile(path.join(evidence,'qr.svg'));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256)
   await page.screenshot({path:path.join(evidence,'onboarding-desktop.png'),fullPage:true})
  })
  await checked('actual merchant keyword/logo upload and authorized print-ready PDF download',async()=>{
   await page.getByLabel('Three to five business phrases, one per line (empty clears)').fill('service experience\nclean environment\nwaiting time')
   await page.getByRole('button',{name:'Save business keywords',exact:true}).click();await expect(page.getByText('Business keywords saved.',{exact:true})).toBeVisible()
   const png=PNG.sync.write(new PNG({width:2,height:2}))
   await page.getByLabel('Static PNG logo, up to 512 × 512 pixels and 64 KiB').setInputFiles({name:'synthetic-logo.png',mimeType:'image/png',buffer:png})
   const uploaded=page.waitForResponse(r=>r.url().includes('/presentation/logo?')&&r.request().method()==='POST');await page.getByRole('button',{name:'Upload business logo',exact:true}).click();assert.equal((await uploaded).status(),200);await expect(page.getByText('Business logo saved.',{exact:true})).toBeVisible()
   const ready=(await request('GET',`/merchants/${merchant}/presentation`,subActor)).body;assert.equal(ready.seedKeywords.length,3)
   const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download print-ready PDF',exact:true}).click();const download=await pending;await download.saveAs(path.join(evidence,'qr-print.pdf'));assert.equal((await readFile(path.join(evidence,'qr-print.pdf'))).subarray(0,8).toString(),'%PDF-1.4')
  })
  await checked('real printed short-link redirect, mobile parallel options, Google navigation and anonymous feedback',async()=>{
   await publicPage.setViewportSize({width:390,height:844});await publicPage.goto(link.publicUrl);await expect(publicPage).toHaveURL(web+'/r/'+link.code)
   const google=publicPage.getByRole('link',{name:/Leave a Google review/});await expect(google).toBeVisible();await expect(publicPage.getByRole('button',{name:'Share private feedback',exact:true})).toBeVisible()
   const popup=context.waitForEvent('page');await google.click();const opened=await popup;await expect.poll(()=>external.some(u=>u==='https://search.google.com/local/writereview')).toBe(true);await opened.close()
   await publicPage.getByRole('button',{name:'Share private feedback',exact:true}).click();await publicPage.getByLabel('Overall service experience',{exact:true}).selectOption('1');await publicPage.getByRole('button',{name:'Send private feedback'}).click();await expect(publicPage.getByRole('status')).toContainText('Your feedback was received');await expect(google).toBeVisible();assert.equal(await publicPage.locator('textarea').count(),0);assert.ok(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await publicPage.screenshot({path:path.join(evidence,'public-mobile.png'),fullPage:true})
  })
  await checked('browser merchant feedback retrieval/status change and real subscription assignment/panel',async()=>{
   page=await context.newPage();merchantPage=page;merchantActor=await browserLogin(page,'merchant@example.invalid');await page.getByRole('link',{name:'Private feedback',exact:true}).first().click();await page.getByRole('button',{name:/View feedback/}).click();await page.getByRole('button',{name:'Update feedback status'}).click();await expect(page.getByText('Status: in progress',{exact:true})).toBeVisible();feedbackId=(await request('GET','/feedback',merchantActor)).body.feedback[0].id
   await page.screenshot({path:path.join(evidence,'feedback-desktop.png'),fullPage:true});const prior=(await request('GET',`/merchants/${merchant}/subscription`,superActor)).body.subscription;assert.equal((await request('PATCH',`/merchants/${merchant}/subscriptions/${prior.id}/status`,superActor,{status:'canceled',lockVersion:prior.lockVersion})).status,200);page=superPage;await page.getByRole('link',{name:'Overview',exact:true}).first().click();await page.getByRole('link',{name:'Accounts',exact:true}).first().click();await page.getByRole('row',{name:/E2E Clinic/}).getByRole('link',{name:/Business/}).click()
   await page.getByText('Assign a subscription',{exact:true}).click();await page.getByLabel('Published subscription plan').selectOption(plan);const end=new Date(Date.now()+86400000);const local=new Date(end.getTime()-end.getTimezoneOffset()*60000).toISOString().slice(0,16);await page.getByLabel('Period end (your local time)').fill(local);await page.getByRole('button',{name:'Assign subscription',exact:true}).click();await expect(page.getByText(/Subscription assigned and usage counters initialized/)).toBeVisible()
   subscription=(await request('GET',`/merchants/${merchant}/subscription`,superActor)).body.subscription;assert.ok(subscription);assert.equal((await query('SELECT COUNT(*) AS n FROM usage_counters WHERE subscription_id=?',[subscription.id]))[0].n,'5')
   page=merchantPage;await page.getByRole('link',{name:'Business & branches',exact:true}).first().click();await expect(page.getByRole('heading',{name:'Synthetic verification plan · Version 1'})).toBeVisible();await expect(page.getByRole('row',{name:/Period feedback submissions/})).toContainText('0');await expect(page.getByText('Assign a subscription',{exact:true})).toHaveCount(0)
   await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(evidence,'subscription-mobile.png'),fullPage:true})
  })
  await checked('real direct Platform-to-Merchant and Reseller-to-Merchant provisioning',async()=>{
   for(const [who,parent,email,name]of [[superActor,root,'direct@example.invalid','Platform direct'],[resellerActor,reseller,'resdirect@example.invalid','Reseller direct']]){
    const r=await request('POST','/merchants',who,{parentId:parent,name,industryChannelCode:'salon_spa',invitation:{email,displayName:'Direct owner'}});assert.equal(r.status,201);assert.equal((await request('POST',`/merchants/${r.body.tenant.id}/subscriptions`,superActor,{planId:plan,periodEnd:new Date(Date.now()+86400000).toISOString()})).status,201);await accept(email);assert.equal(r.body.tenant.parentId,parent);if(parent===root)direct=r.body.tenant.id;else resellerDirect=r.body.tenant.id
   }
  })
  await checked('real peer/cross-merchant/hierarchy/subscription/feedback authorization and immutable channel rejection',async()=>{
   const r=await request('POST','/tenants',superActor,{parentId:root,kind:'reseller',name:'Peer reseller',invitation:{email:'peer@example.invalid',displayName:'Peer'}});assert.equal(r.status,201);await accept('peer@example.invalid');peerActor=await actor('peer@example.invalid')
   for(const token of [peerActor,await actor('direct@example.invalid')])for(const url of [`/merchants/${merchant}/subscription`,`/branches/${branch}`,`/feedback/${feedbackId}`])assert.equal((await request('GET',url,token)).status,404)
   assert.equal((await request('GET',`/merchants/${direct}/subscription`,resellerActor)).status,404);assert.equal((await request('GET',`/merchants/${resellerDirect}/subscription`,subActor)).status,404)
   assert.equal((await request('POST','/tenants',subActor,{parentId:sub,kind:'sub_reseller',name:'Forbidden peer',invitation:{email:'bad@example.invalid',displayName:'Bad'}})).status,403)
   assert.equal((await request('POST',`/merchants/${merchant}/subscriptions`,merchantActor,{planId:plan,periodEnd:new Date(Date.now()+86400000).toISOString()})).status,403)
   assert.equal((await request('PATCH',`/feedback/${feedbackId}/status`,null,{status:'resolved',reasonCode:'completed',lockVersion:2})).status,401)
   assert.equal((await request('PATCH',`/industry-channels/${channel}/versions/${version}`,superActor,{title:'Mutated'})).status,409)
   const projection=await request('GET','/public/funnels/'+link.code);assert.equal(projection.status,200);for(const name of ['tenantId','merchantId','branchId','email','password_hash','permissions','subscription'])assert.ok(!JSON.stringify(projection.body).includes('"'+name+'"'))
  })
  await checked('real usage persistence, concurrent initialization, historical snapshots versus live gauges',async()=>{
   const counterBefore=await query('SELECT metric,used FROM usage_counters WHERE subscription_id=? ORDER BY metric',[subscription.id]);const ledgerBefore=(await query('SELECT COUNT(*) AS n FROM usage_records WHERE subscription_id=?',[subscription.id]))[0].n
   const init=await Promise.all([1,2].map(()=>request('POST',`/merchants/${merchant}/subscriptions/${subscription.id}/usage/initialize`,superActor,{})));assert.ok(init.every(r=>r.status===200&&r.body.createdCounters===0));assert.deepEqual(await query('SELECT metric,used FROM usage_counters WHERE subscription_id=? ORDER BY metric',[subscription.id]),counterBefore);assert.equal((await query('SELECT COUNT(*) AS n FROM usage_records WHERE subscription_id=?',[subscription.id]))[0].n,ledgerBefore)
   assert.equal((await request('POST',`/merchants/${merchant}/branches`,merchantActor,{code:'second',name:'Second location',timezone:'UTC'})).status,201)
   const usage=await request('GET',`/merchants/${merchant}/usage`,merchantActor);assert.equal(usage.body.metrics.find(m=>m.metric==='branches').used,'2');assert.equal(counterBefore.find(c=>c.metric==='branches').used,'1');assert.equal((await request('GET',`/merchants/${merchant}/usage/history`,merchantActor)).body.gaugeHistoryCoverage,'initialization_snapshots_and_reconciliation_events')
   const projection=(await request('GET','/public/funnels/'+link.code)).body;assert.equal((await request('POST',`/public/funnels/${link.code}/feedback`,null,{submissionToken:projection.options.privateFeedback.submissionToken.token,overallRating:4})).status,200);assert.equal((await request('GET',`/merchants/${merchant}/usage/feedback_submissions`,merchantActor)).body.metrics[0].used,'1')
  })
  await checked('real missing counter, expired allocation and suspended ancestor handling',async()=>{
   // Synthetic incomplete/elapsed fixtures only: no reset/delete or production DML.
   await query("UPDATE subscriptions SET status='canceled',ends_at=UTC_TIMESTAMP(6) WHERE tenant_id IN (?,?) AND current_slot=1",[direct,resellerDirect])
   await query("INSERT INTO subscriptions(tenant_id,plan_id,status,starts_at,current_period_start,current_period_end) VALUES (?,?,'active',UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 DAY))",[direct,plan])
   const missing=await request('GET',`/merchants/${direct}/usage`,superActor);assert.ok(missing.body.metrics.every(m=>m.availability==='counter_missing'&&m.remaining===null))
   await query("INSERT INTO subscriptions(tenant_id,plan_id,status,starts_at,current_period_start,current_period_end) VALUES (?,?,'active','2020-01-01','2020-01-01','2020-02-01')",[resellerDirect,plan]);assert.equal((await request('GET',`/merchants/${resellerDirect}/subscription`,superActor)).body.subscription.effectiveStatus,'expired')
   const account=(await request('GET','/tenants/'+reseller,superActor)).body;assert.equal((await request('POST',`/tenants/${reseller}/suspend`,superActor,{lockVersion:account.lockVersion})).status,200);assert.equal((await request('GET',`/merchants/${merchant}/subscription`,merchantActor)).status,403);assert.equal((await request('GET',`/merchants/${merchant}/subscription`,superActor)).body.subscription.effectiveStatus,'suspended');assert.equal((await request('GET','/public/funnels/'+link.code)).status,404)
   const suspended=(await request('GET','/tenants/'+reseller,superActor)).body;assert.equal((await request('POST',`/tenants/${reseller}/reinstate`,superActor,{lockVersion:suspended.lockVersion})).status,200)
  })
  await checked('actual archived feedback history and scoped analytics remain consistent',async()=>{
   page=merchantPage;await page.getByRole('link',{name:'Private feedback',exact:true}).first().click();await page.getByRole('button',{name:'View feedback '+feedbackId,exact:true}).click()
   await page.getByLabel('Status transition and reason').selectOption('resolved|completed');await page.getByRole('button',{name:'Update feedback status',exact:true}).click();await expect(page.getByText('Status: resolved',{exact:true})).toBeVisible()
   await page.getByLabel('Status transition and reason').selectOption('archived|completed');await page.getByRole('button',{name:'Update feedback status',exact:true}).click();await expect(page.getByText('Status: archived',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Update feedback status',exact:true})).toHaveCount(0)
   const data=(await request('GET',`/feedback/analytics?merchantId=${merchant}`,merchantActor)).body;assert.equal(data.googlePosts,null);assert.equal(data.conversionToGooglePosts,null);const actual=(await query('SELECT COUNT(*) AS n FROM private_feedback WHERE tenant_id=?',[merchant]))[0].n;assert.equal(data.ratings.reduce((n,row)=>n+BigInt(row.count),0n).toString(),actual)
  })
  await checked('real disabled links and archived branch unavailability, audit evidence and browser logout',async()=>{
   assert.equal((await request('POST',`/branches/${branch}/archive`,merchantActor,{lockVersion:1})).status,409)
   assert.equal((await request('POST',`/short-links/${link.id}/disable`,merchantActor,{lockVersion:link.lockVersion})).status,200);assert.equal((await request('GET','/public/funnels/'+link.code)).status,404)
   assert.equal((await request('POST',`/branches/${branch}/archive`,merchantActor,{lockVersion:1})).status,200);assert.equal((await request('GET','/public/funnels/'+link.code)).status,404)
   await publicPage.reload();await expect(publicPage.getByRole('alert')).toContainText('unavailable');await expect(publicPage.getByRole('link',{name:/Leave a Google review/})).toHaveCount(0)
   const actions=(await query('SELECT DISTINCT action FROM audit_logs')).map(a=>a.action);for(const action of ['tenant.created','funnel.published','qr.generated','public.feedback_submitted','feedback.status_changed','subscription.assigned'])assert.ok(actions.includes(action),action)
   await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();assert.equal(await page.evaluate(()=>sessionStorage.getItem('magicreview.session.v1')),null);assert.deepEqual(pageErrors,[])
  })
  await writeFile(path.join(evidence,'result.json'),JSON.stringify({database:'MariaDB 11.8.9',passed:results,apiResponsesMocked:false,externalNavigationBlocked:external,unhandledBrowserErrors:pageErrors},null,2))
 }finally{
  if(browser)await browser.close();if(frontend)await frontend.close();if(backend)await new Promise(resolve=>backend.close(resolve));for(const c of connections)c.destroy();if(pool)await pool.end();await fixture.close()
 }
})
