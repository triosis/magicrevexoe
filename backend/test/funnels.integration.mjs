import {fundTestMerchant} from './quota-fixtures.mjs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {randomBytes,createHash} from 'node:crypto'
import {PNG} from 'pngjs'
import jsQR from 'jsqr'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from './mfa-fixtures.mjs'
import {hashPassword} from '../dist/auth/passwords.js'
import {TenantService} from '../dist/tenants/service.js'
import {BusinessService} from '../dist/business/service.js'
import {FunnelService} from '../dist/funnels/service.js'
import {createApp} from '../dist/app.js'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'

test('QR, short links and public parallel funnels on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set()
 await fixture.admin.query('CREATE DATABASE magicreview_migration_funnels CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:['https://example.invalid'],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_funnels',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c))
 const auth=new AuthService(pool,randomBytes(32)),tenants=new TenantService(pool,auth),business=new BusinessService(tenants,auth),funnels=new FunnelService(pool,tenants,auth,'https://api.example.invalid','https://app.example.invalid')
 const actors={},cases=[],channels={},roles={};let server,base,root,reseller,sub,peer,peerMerchant
 async function query(sql,args=[]){return(await pool.execute(sql,args))[0]}
 async function insert(table,values){const keys=Object.keys(values);return String((await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(values))).insertId)}
 async function tenant(kind,parent,parentKind,channel){return insert('tenants',{public_id:randomBytes(16),kind,parent_id:parent,parent_kind:parentKind,name:'Public business',...(channel?{industry_channel_id:channel}:{})})}
 async function request(method,path,actor,body,headers={}){const response=await fetch(base+'/api/v1'+path,{method,headers:{...(actor?{Authorization:'Bearer '+actors[actor].token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json(),headers:response.headers}}
 const p=()=>`/public/funnels/${cases[0].link.code}`
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  for(const c of await query('SELECT * FROM industry_channels'))channels[c.code]=c.id
  for(const r of await query('SELECT * FROM roles'))roles[r.code]=r.id
  root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'Platform'})
  reseller=await tenant('reseller',root,'platform');sub=await tenant('sub_reseller',reseller,'reseller');peer=await tenant('reseller',root,'platform');peerMerchant=await tenant('merchant',peer,'reseller',channels.salon_spa)
  for(const [code,channelId]of Object.entries(channels)){
   const merchant=await tenant('merchant',sub,'sub_reseller',channelId)
   const version=await insert('channel_versions',{industry_channel_id:channelId,version:1,status:'published',display_name:code,public_copy:JSON.stringify({title:'How was your visit?',google_label:'Leave a Google review',private_label:'Share private feedback'}),feedback_labels:JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'}),published_at:new Date()})
   const branch=await insert('branches',{public_id:randomBytes(16),tenant_id:merchant,industry_channel_id:channelId,code:'main',name:'Public branch',timezone:'UTC',address:'Business location'})
   const destination=await insert('review_destinations',{tenant_id:merchant,branch_id:branch,provider:'google',place_id:'ChIJ_fixture',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_fixture'})
   cases.push({code,merchant,version,branch,destination})
  }
  const password=randomBytes(24).toString('base64url'),hash=await hashPassword(password)
  for(const [key,id,kind,role]of [['super',root,'platform','super_admin'],['reseller',reseller,'reseller','reseller_admin'],['sub',sub,'sub_reseller','sub_reseller_admin'],['merchant',cases[0].merchant,'merchant','merchant_admin'],['staff',cases[0].merchant,'merchant','merchant_staff'],['peer',peer,'reseller','reseller_admin'],['other',peerMerchant,'merchant','merchant_admin']]){
   const email=key+'@example.invalid',user=await insert('users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Private admin identity',password_hash:hash,status:'active',email_verified_at:new Date()})
   const mid=await insert('tenant_memberships',{tenant_id:id,tenant_kind:kind,user_id:user,role_id:roles[role],status:'active'}),login=await auth.login(email,password),selected=await auth.selectTenant(await auth.authenticate(login.accessToken),mid)
   actors[key]={token:selected.accessToken,principal:await auth.authenticate(selected.accessToken)}
  }
  for(const row of await query("SELECT id FROM tenants WHERE kind='merchant'"))await fundTestMerchant(pool,row.id)
  server=createServer(createApp({env,auth,tenants,business,funnels,checkDatabase:async()=>{},isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port
  await t.test('authorized publication and secure links support all three channels with immutable revisions',async()=>{
   for(const c of cases){
    const created=await request('POST',`/branches/${c.branch}/funnels`,'reseller',{channelVersionId:c.version,brandTitle:'Welcome',accentHex:'#123456',locale:'en'})
    assert.equal(created.status,201);c.funnel=created.body.id
    const link=await request('POST',`/branches/${c.branch}/short-links`,'sub',{funnelId:c.funnel});assert.equal(link.status,201);c.link=link.body
    assert.match(c.link.code,/^[A-Za-z0-9_-]{22}$/);assert.equal(c.link.publicUrl,'https://api.example.invalid/api/v1/public/funnels/'+c.link.code)
    await assert.rejects(query('UPDATE funnel_configurations SET brand_title=? WHERE id=?',['Changed',c.funnel]))
   }
   assert.equal(new Set(cases.map(c=>c.link.code)).size,3)
   await assert.rejects(insert('short_links',{tenant_id:cases[0].merchant,branch_id:cases[0].branch,funnel_configuration_id:cases[0].funnel,code:cases[0].link.code}))
   const unconfigured=new FunnelService(pool,tenants,auth)
   await assert.rejects(unconfigured.createLink(actors.merchant.principal,cases[0].branch,cases[0].funnel),e=>e.status===503)
   assert.equal((await request('POST',`/branches/${cases[0].branch}/funnels`,'merchant',{channelVersionId:cases[1].version,brandTitle:'Wrong channel',accentHex:'#123456',locale:'en'})).status,409)
   assert.equal((await request('POST',`/branches/${cases[0].branch}/short-links`,'merchant',{funnelId:cases[1].funnel})).status,409)
   assert.equal((await request('POST',`/branches/${cases[0].branch}/short-links`,'merchant',{funnelId:cases[0].funnel,url:'https://evil.invalid'})).status,400)
  })
  await t.test('public responses minimize data and expose independent structured options for every industry',async()=>{
   const browser=await fetch(base+'/api/v1/public/funnels/'+cases[0].link.code,{headers:{Accept:'text/html'},redirect:'manual'})
   assert.equal(browser.status,303);assert.equal(browser.headers.get('location'),'https://app.example.invalid/r/'+cases[0].link.code)
   assert.equal(browser.headers.get('cache-control'),'no-store')
   const invalid=await fetch(base+'/api/v1/public/funnels/invalid',{headers:{Accept:'text/html'},redirect:'manual'})
   assert.equal(invalid.status,404);assert.equal(invalid.headers.get('location'),null)
   for(const c of cases){
    const r=await request('GET','/public/funnels/'+c.link.code);assert.equal(r.status,200)
    assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.body.industryChannel.code,c.code)
    assert.equal(r.body.options.googleReview.independent,true);assert.equal(r.body.options.privateFeedback.independent,true)
    assert.equal(r.body.options.googleReview.url,'https://search.google.com/local/writereview?placeid=ChIJ_fixture')
    assert.deepEqual(r.body.options.privateFeedback.fields.map(f=>f.name),['overallRating','serviceRating','cleanlinessRating','waitingTimeRating'])
    assert.ok(r.body.options.privateFeedback.fields.every(f=>f.type==='integer'))
    assert.equal(r.body.feedbackPolicy.medicalDetailsAllowed,false)
    const text=JSON.stringify(r.body);for(const forbidden of ['tenantId','merchantId','branchId','placeId','password','Private admin identity','example.invalid','object_key','channelVersionId'])assert.ok(!text.includes(forbidden),forbidden)
    assert.equal((await request('POST','/public/funnels/'+c.link.code+'/events',null,{event:'google_option_selected'})).status,200)
    assert.equal((await request('POST','/public/funnels/'+c.link.code+'/events',null,{event:'private_feedback_option_selected'})).status,200)
   }
  })
  await t.test('no rating gating, arbitrary events or medical/free-text payload can be submitted',async()=>{
   for(const rating of [1,5])assert.equal((await request('GET',p()+'?rating='+rating)).status,400)
   for(const body of [{event:'google_option_selected',rating:5},{event:'private_feedback_option_selected',medicalDetails:'details'},{event:'private_feedback_option_selected',text:'narrative'},{event:'review_completed'},{event:'google_option_selected',tenantId:'1'}])assert.equal((await request('POST',p()+'/events',null,body)).status,400)
   assert.equal((await request('PATCH',p(),null,{googleVisible:false})).status,404)
   const r=await request('GET',p());assert.equal(r.body.options.googleReview.independent,true)
  })
  await t.test('SVG/PNG QR generation, content decoding and regeneration preserve stable short URLs',async()=>{
   const c=cases[0]
   for(const format of ['svg','png']){
    const first=await request('POST',`/branches/${c.branch}/qr`,'merchant',{shortLinkId:c.link.id,format});assert.equal(first.status,200)
    const repeat=await request('POST',`/branches/${c.branch}/qr`,'merchant',{shortLinkId:c.link.id,format});assert.equal(repeat.body.id,first.body.id)
    const regen=await request('POST',`/branches/${c.branch}/qr`,'merchant',{shortLinkId:c.link.id,format,regenerate:true});assert.equal(regen.body.sha256,first.body.sha256)
    const response=await fetch(base+first.body.contentUrl,{headers:{Authorization:'Bearer '+actors.merchant.token}}),bytes=Buffer.from(await response.arrayBuffer())
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
    assert.equal(createHash('sha256').update(bytes).digest('hex'),first.body.sha256)
    if(format==='png'){const png=PNG.sync.read(bytes);assert.equal(jsQR(new Uint8ClampedArray(png.data),png.width,png.height)?.data,c.link.publicUrl)}else assert.match(bytes.toString(),/^<svg/)
    c.qr=first.body
   }
   const list=await request('GET',`/branches/${c.branch}/qr`,'staff');assert.equal(list.body.qrAssets.length,2)
   const row=(await query('SELECT object_key FROM qr_assets WHERE id=?',[c.qr.id]))[0];assert.ok(row.object_key.startsWith(c.merchant+'/'))
  })
  await t.test('all administrative scopes and merchant staff read boundaries are enforced',async()=>{
   const c=cases[0]
   for(const actor of ['super','reseller','sub','merchant','staff'])assert.equal((await request('GET',`/branches/${c.branch}/short-links`,actor)).status,200)
   for(const actor of ['peer','other']){
    assert.equal((await request('GET',`/branches/${c.branch}/qr`,actor)).status,404)
    assert.equal((await request('POST',`/branches/${c.branch}/qr`,actor,{shortLinkId:c.link.id})).status,404)
    assert.equal((await request('POST',`/short-links/${c.link.id}/disable`,actor,{lockVersion:1})).status,404)
    assert.equal((await request('GET',`/qr-assets/${c.qr.id}/content`,actor)).status,404)
   }
   assert.equal((await request('POST',`/branches/${c.branch}/qr`,'staff',{shortLinkId:c.link.id})).status,403)
   assert.equal((await request('GET',`/branches/${c.branch}/qr`)).status,401)
  })
  await t.test('merchant/ancestor suspension, archived branches, retired channels and invalid destinations fail closed',async()=>{
   const c=cases[0]
   for(const id of [c.merchant,sub,reseller,root]){
    await query("UPDATE tenants SET status='suspended' WHERE id=?",[id]);assert.equal((await request('GET',p())).status,404)
    await query("UPDATE tenants SET status='active' WHERE id=?",[id])
   }
   await query("UPDATE branches SET status='archived' WHERE id=?",[c.branch]);assert.equal((await request('GET',p())).status,404)
   assert.equal((await request('POST',`/branches/${c.branch}/qr`,'merchant',{shortLinkId:c.link.id})).status,409)
   await query("UPDATE branches SET status='active' WHERE id=?",[c.branch])
   await query("UPDATE industry_channels SET status='retired' WHERE id=?",[channels[c.code]]);assert.equal((await request('GET',p())).status,404)
   await query("UPDATE industry_channels SET status='active' WHERE id=?",[channels[c.code]])
   await query("UPDATE review_destinations SET status='disabled' WHERE id=?",[c.destination]);assert.equal((await request('GET',p())).status,404)
   await query("UPDATE review_destinations SET status='active' WHERE id=?",[c.destination])
   // Existing CHECK also independently rejects unsafe destinations.
   await assert.rejects(query('UPDATE review_destinations SET review_url=? WHERE id=?',['https://evil.invalid',c.destination]))
   assert.equal((await request('GET',p())).status,200)
  })
  await t.test('unknown/invalid/expired/disabled codes have the same safe error and no redirect',async()=>{
   const c=cases[0],unknown=randomBytes(16).toString('base64url')
   const missing=await request('GET','/public/funnels/'+unknown);assert.equal(missing.status,404)
   const bad=await request('GET','/public/funnels/invalid');assert.deepEqual(bad.body,missing.body);assert.equal(bad.headers.get('location'),null)
   await query('UPDATE short_links SET expires_at=? WHERE id=?',[new Date(Date.now()-60000),c.link.id]);assert.equal((await request('GET',p())).status,404)
   await assert.rejects(funnels.generateQr(actors.merchant.principal,c.branch,{shortLinkId:c.link.id,format:'svg',regenerate:false}))
   await query('UPDATE short_links SET expires_at=NULL WHERE id=?',[c.link.id])
   const disabled=await request('POST',`/short-links/${c.link.id}/disable`,'merchant',{lockVersion:1});assert.equal(disabled.status,200)
   assert.deepEqual((await request('GET',p())).body,missing.body)
   assert.equal((await request('POST',`/short-links/${c.link.id}/disable`,'merchant',{lockVersion:1})).status,409)
   assert.equal((await request('POST',p()+'/events',null,{event:'google_option_selected'})).status,404)
   c.link=await funnels.createLink(actors.merchant.principal,c.branch,c.funnel)
  })
  await t.test('minimum events and resource mutations are atomic with append-only safe audit',async()=>{
   const c=cases[0],events=await query("SELECT action,safe_metadata,actor_user_id FROM audit_logs WHERE action LIKE 'public.%'")
   for(const name of ['public.funnel_viewed','public.google_option_selected','public.private_feedback_option_selected'])assert.ok(events.some(e=>e.action===name))
   for(const e of events){assert.equal(e.actor_user_id,null);assert.deepEqual(typeof e.safe_metadata==='string'?JSON.parse(e.safe_metadata):e.safe_metadata,{})}
   for(const name of ['qr.generated','qr.regenerated','short_link.created','funnel.published'])assert.ok((await query('SELECT id FROM audit_logs WHERE action=?',[name])).length)
   await query("CREATE TRIGGER fixture_reject_funnel_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action IN ('short_link.created','qr.generated','public.google_option_selected') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END")
   const before=(await query('SELECT COUNT(*) AS n FROM short_links'))[0].n
   await assert.rejects(funnels.createLink(actors.merchant.principal,c.branch,c.funnel));assert.equal((await query('SELECT COUNT(*) AS n FROM short_links'))[0].n,before)
   await assert.rejects(funnels.generateQr(actors.merchant.principal,c.branch,{shortLinkId:c.link.id,format:'svg',regenerate:false}))
   assert.equal((await query('SELECT COUNT(*) AS n FROM qr_assets WHERE short_link_id=?',[c.link.id]))[0].n,'0')
   await assert.rejects(funnels.event(c.link.code,'google_option_selected'))
  })
  await t.test('public limiter rejects repeated requests and ignores spoofed forwarding headers',async()=>{
   let limited=false
   for(let i=0;i<130;i++){const r=await request('GET',p(),null,undefined,{'X-Forwarded-For':'203.0.113.'+(i%250)});if(r.status===429){assert.equal(r.headers.get('retry-after'),'900');limited=true;break}assert.equal(r.status,200)}
   assert.ok(limited)
  })
 }finally{if(server)await new Promise(resolve=>server.close(resolve));for(const c of sessions)c.destroy();await new Promise(resolve=>setImmediate(resolve));await pool.end();await fixture.close()}
})
