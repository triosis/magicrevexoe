import {fundTestMerchant} from './quota-fixtures.mjs'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from './mfa-fixtures.mjs'
import {hashPassword} from '../dist/auth/passwords.js'
import {TenantService} from '../dist/tenants/service.js'
import {FunnelService} from '../dist/funnels/service.js'
import {FeedbackService} from '../dist/feedback/service.js'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'

test('feedback concurrency diagnostics on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),sessions=new Set()
 await fixture.admin.query('CREATE DATABASE magicreview_migration_feedback CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:['https://example.invalid'],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_feedback',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
 const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c))
 const auth=new AuthService(pool,randomBytes(32)),tenants=new TenantService(pool,auth),funnels=new FunnelService(pool,tenants,auth,'https://api.example.invalid'),feedback=new FeedbackService(tenants,auth,funnels)
 const actors={},roles={},channels={},cases=[];let root,reseller,sub,peer,otherSub,peerMerchant,_direct
 async function query(sql,args=[]){return(await pool.execute(sql,args))[0]}
 async function insert(table,values){const keys=Object.keys(values);return String((await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(values))).insertId)}
 async function tenant(kind,parent,parentKind,channel){return insert('tenants',{public_id:randomBytes(16),kind,parent_id:parent,parent_kind:parentKind,name:'Business fixture',...(channel?{industry_channel_id:channel}:{})})}
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  for(const c of await query('SELECT * FROM industry_channels'))channels[c.code]=c.id
  for(const r of await query('SELECT * FROM roles'))roles[r.code]=r.id
  roles.fixture_readonly=await insert('roles',{code:'fixture_readonly',tenant_kind:'merchant',name:'Local test read-only role'})
  await insert('role_permissions',{role_id:roles.fixture_readonly,permission_id:(await query("SELECT id FROM permissions WHERE code='feedback.read'"))[0].id})
  root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'Platform'})
  reseller=await tenant('reseller',root,'platform');sub=await tenant('sub_reseller',reseller,'reseller');otherSub=await tenant('sub_reseller',reseller,'reseller');peer=await tenant('reseller',root,'platform');peerMerchant=await tenant('merchant',peer,'reseller',channels.salon_spa);_direct=await tenant('merchant',root,'platform',channels.salon_spa)
  for(const [channel,channelId]of Object.entries(channels)){
   const merchant=await tenant('merchant',sub,'sub_reseller',channelId)
   const version=await insert('channel_versions',{industry_channel_id:channelId,version:1,status:'published',display_name:channel,public_copy:JSON.stringify({title:'Visit',google_label:'Leave a Google review',private_label:'Share private feedback'}),feedback_labels:JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'}),published_at:new Date()})
   const branch=await insert('branches',{public_id:randomBytes(16),tenant_id:merchant,industry_channel_id:channelId,code:'main',name:'Branch',timezone:'UTC'})
   const destination=await insert('review_destinations',{tenant_id:merchant,branch_id:branch,place_id:'ChIJ_fixture',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_fixture'})
   const funnel=await insert('funnel_configurations',{tenant_id:merchant,branch_id:branch,industry_channel_id:channelId,channel_version_id:version,review_destination_id:destination,revision:1,status:'published',brand_title:'Visit',accent_hex:'#123456',locale:'en',published_at:new Date()})
   const code=randomBytes(16).toString('base64url'),link=await insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code})
   cases.push({channel,channelId,merchant,branch,destination,funnel,version,code,link})
  }
  const first=cases[0],extraBranch=await insert('branches',{public_id:randomBytes(16),tenant_id:first.merchant,industry_channel_id:first.channelId,code:'second',name:'Second branch',timezone:'UTC'})
  const extraDestination=await insert('review_destinations',{tenant_id:first.merchant,branch_id:extraBranch,place_id:'ChIJ_second',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_second'})
  const extraFunnel=await insert('funnel_configurations',{tenant_id:first.merchant,branch_id:extraBranch,industry_channel_id:first.channelId,channel_version_id:first.version,review_destination_id:extraDestination,revision:1,status:'published',brand_title:'Second',accent_hex:'#123456',locale:'en',published_at:new Date()})
  const extraCode=randomBytes(16).toString('base64url');await insert('short_links',{tenant_id:first.merchant,branch_id:extraBranch,funnel_configuration_id:extraFunnel,code:extraCode});cases.push({...first,branch:extraBranch,funnel:extraFunnel,code:extraCode})
  const password=randomBytes(24).toString('base64url'),hash=await hashPassword(password)
  for(const [key,id,kind,role]of [['super',root,'platform','super_admin'],['reseller',reseller,'reseller','reseller_admin'],['sub',sub,'sub_reseller','sub_reseller_admin'],['otherSub',otherSub,'sub_reseller','sub_reseller_admin'],['peer',peer,'reseller','reseller_admin'],['merchant',cases[0].merchant,'merchant','merchant_admin'],['staff',cases[0].merchant,'merchant','merchant_staff'],['reader',cases[0].merchant,'merchant','fixture_readonly'],['other',peerMerchant,'merchant','merchant_admin']]){
   const email=key.toLowerCase()+'@example.invalid',user=await insert('users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Administrator fixture',password_hash:hash,status:'active',email_verified_at:new Date()})
   const mid=await insert('tenant_memberships',{tenant_id:id,tenant_kind:kind,user_id:user,role_id:roles[role],status:'active'}),login=await auth.login(email,password),selected=await auth.selectTenant(await auth.authenticate(login.accessToken),mid)
   actors[key]={token:selected.accessToken,principal:await auth.authenticate(selected.accessToken)}
  }
  for(const row of await query("SELECT id FROM tenants WHERE kind='merchant'"))await fundTestMerchant(pool,row.id)


  const directory=new URL('../../.tmp-frontend/deadlock/',import.meta.url);await mkdir(directory,{recursive:true})
  const oldPublic="SELECT id FROM tenants WHERE kind='platform' AND status='active' FOR UPDATE",oldQuota="SELECT id FROM tenants WHERE kind='platform' FOR UPDATE"
  const newPublic="SELECT id,status FROM tenants WHERE platform_slot=1 FOR UPDATE",newQuota="SELECT id,status FROM tenants WHERE platform_slot=1 FOR UPDATE"
  const plans=[];for(const sql of [oldPublic,oldQuota,newPublic,newQuota])plans.push({sql,plan:(await pool.query('EXPLAIN '+sql))[0]});await writeFile(new URL('plans.json',directory),JSON.stringify(plans,null,2))
  // MariaDB const-table lock waits can occur during optimization (Statistics)
  // before INNODB_TRX publishes them. Read the live engine transaction list.
  const waits=async()=>{const [rows]=await fixture.admin.query('SHOW ENGINE INNODB STATUS');const active=rows[0].Status.split('LIST OF TRANSACTIONS FOR EACH SESSION:')[1]?.split('FILE I/O')[0]??'';return active.split('---TRANSACTION').filter(block=>block.includes('LOCK WAIT')).map(block=>({requester:Number(/MariaDB thread id ([0-9]+)/.exec(block)?.[1]),lock_index:/RECORD LOCKS[^\n]* index ([^\s]+)/.exec(block)?.[1]}))}
  const until=async predicate=>{const end=Date.now()+5000;do{const rows=await waits();if(predicate(rows))return rows;await new Promise(resolve=>setTimeout(resolve,10))}while(Date.now()<end);const [engine]=await fixture.admin.query('SHOW ENGINE INNODB STATUS');await writeFile(new URL('wait-timeout.txt',directory),engine[0].Status);const [trx]=await fixture.admin.query('SELECT trx_id,trx_state,trx_mysql_thread_id,trx_query FROM information_schema.INNODB_TRX');console.log(JSON.stringify({waits:await waits(),trx}));throw Error('Expected database lock wait was not observed')}
  const snapshot=async name=>{const [status]=await fixture.admin.query('SHOW ENGINE INNODB STATUS');await writeFile(new URL(name,directory),status[0].Status)}
  const deadlocks=async()=>Number((await fixture.admin.query("SHOW GLOBAL STATUS LIKE 'Innodb_deadlocks'"))[0][0].Value)
  let expectedDeadlocks=await deadlocks()
  const issue=(c=cases[0])=>({submissionToken:auth.feedbackTokens.issue(c.code,1).token,overallRating:3})
  const idOf=async confirmation=>(await query('SELECT id FROM private_feedback WHERE public_id=?',[Buffer.from(confirmation.confirmationId,'hex')]))[0].id
  const submissions=async()=>(await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='public.feedback_submitted'"))[0].n
  const concurrently=async operations=>{
   const gate=await pool.getConnection();let jobs=[];try{await gate.beginTransaction();await gate.query(newQuota);jobs=operations.map(work=>work());await until(rows=>rows.length>=operations.length);await gate.commit();return await Promise.allSettled(jobs)}finally{await gate.rollback();gate.release();await Promise.allSettled(jobs)}
  }
  await t.test('legacy SQL reproduces actual index/primary-record cycle with 1213/40001',async()=>{
   const a=await pool.getConnection(),b=await pool.getConnection();let pending,other
   try{
    const bid=(await b.query('SELECT CONNECTION_ID() AS id'))[0][0].id;await a.beginTransaction();await b.beginTransaction();await a.query(oldPublic)
    pending=b.query(oldQuota).catch(error=>error);const wait=await until(rows=>rows.some(r=>Number(r.requester)===Number(bid)));await writeFile(new URL('legacy-waits.json',directory),JSON.stringify(wait,null,2))
    other=a.query(oldQuota).catch(error=>error);await Promise.race([pending,other]);await snapshot('legacy-innodb-status.txt');await a.rollback();await b.rollback();const outcomes=await Promise.all([pending,other]);const error=outcomes.find(o=>o?.errno===1213);assert.ok(error);assert.equal(error.code,'ER_LOCK_DEADLOCK');assert.equal(error.sqlState,'40001');expectedDeadlocks++;assert.equal(await deadlocks(),expectedDeadlocks);await writeFile(new URL('legacy-error.json',directory),JSON.stringify({code:error.code,errno:error.errno,sqlState:error.sqlState,sql:error.sql},null,2))
   }finally{await a.rollback();await b.rollback();a.release();b.release()}
  })
  await t.test('fixed unique point lookup queues safely and reacquires without index inversion',async()=>{
   for(let i=0;i<20;i++){
    const a=await pool.getConnection(),b=await pool.getConnection();try{const bid=(await b.query('SELECT CONNECTION_ID() AS id'))[0][0].id;await a.beginTransaction();await b.beginTransaction();await a.query(newPublic);const pending=b.query(newQuota);await until(rows=>rows.some(r=>Number(r.requester)===Number(bid)));await a.query(newQuota);await a.commit();await pending;await b.commit()}finally{await a.rollback();await b.rollback();a.release();b.release()}
   }
   for(const p of plans.slice(2))assert.equal(p.plan[0].key,'uq_platform_slot')
  })
  await t.test('original simultaneous identical submissions repeatedly deduplicate without retries',async()=>{
   for(let i=0;i<300;i++){const input=issue(),results=await Promise.all([feedback.submit(cases[0].code,input),feedback.submit(cases[0].code,input)]);assert.deepEqual(results[0],results[1])}
  })
  await t.test('simultaneous distinct submits across merchants and branches preserve each record',async()=>{
   const before=BigInt(await submissions());const jobs=await concurrently([()=>feedback.submit(cases[0].code,issue()),()=>feedback.submit(cases[1].code,issue(cases[1])),()=>feedback.submit(cases[2].code,issue(cases[2])),()=>feedback.submit(cases[3].code,issue(cases[3]))]);assert.ok(jobs.every(j=>j.status==='fulfilled'));assert.equal(BigInt(await submissions()),before+4n)
  })
  await t.test('simultaneous status CAS gives exactly one status event and no partial audit',async()=>{
   const saved=await feedback.submit(cases[0].code,issue()),id=await idOf(saved),input={status:'in_progress',reasonCode:'triage',lockVersion:1};const outcomes=await concurrently([()=>feedback.changeStatus(actors.merchant.principal,id,input),()=>feedback.changeStatus(actors.super.principal,id,input)]);assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);assert.equal(outcomes.find(o=>o.status==='rejected').reason.status,409);assert.equal((await query('SELECT COUNT(*) AS n FROM feedback_status_events WHERE feedback_id=?',[id]))[0].n,'1');assert.equal((await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='feedback.status_changed' AND resource_id=?",[id]))[0].n,'1')
  })
  await t.test('submission and status update together commit consistently',async()=>{
   const id=await idOf(await feedback.submit(cases[0].code,issue()));const result=await concurrently([()=>feedback.submit(cases[0].code,issue()),()=>feedback.changeStatus(actors.merchant.principal,id,{status:'resolved',reasonCode:'completed',lockVersion:1})]);assert.ok(result.every(r=>r.status==='fulfilled'));const row=(await query('SELECT status,resolved_at,lock_version FROM private_feedback WHERE id=?',[id]))[0];assert.equal(row.status,'resolved');assert.ok(row.resolved_at);assert.equal(row.lock_version,2)
  })
  await t.test('four workers repeat mixed merchant submissions/status changes with exact accounting',async()=>{
   const before=BigInt(await submissions());await Promise.all(Array.from({length:4},async(_,worker)=>{for(let i=0;i<50;i++){const c=cases[(worker+i)%cases.length],input=issue(c),saved=await feedback.submit(c.code,input);assert.deepEqual(await feedback.submit(c.code,input),saved);await feedback.changeStatus(actors.super.principal,await idOf(saved),{status:'in_progress',reasonCode:'triage',lockVersion:1})}}));assert.equal(BigInt(await submissions()),before+200n)
   for(const c of cases){const count=(await query('SELECT COUNT(*) AS n FROM private_feedback WHERE tenant_id=?',[c.merchant]))[0].n,counter=(await query("SELECT used FROM usage_counters WHERE tenant_id=? AND metric='feedback_submissions'",[c.merchant]))[0].used,ledger=(await query("SELECT SUM(quantity) AS n FROM usage_records WHERE tenant_id=? AND metric='feedback_submissions'",[c.merchant]))[0].n;assert.equal(count,counter);assert.equal(count,ledger)}
   assert.equal((await query("SELECT COUNT(*) AS n FROM private_feedback f LEFT JOIN audit_logs a ON a.resource_id=f.id AND a.tenant_id=f.tenant_id AND a.action='public.feedback_submitted' WHERE a.id IS NULL"))[0].n,'0')
  })
  await t.test('audit failure rolls back new feedback, counter and ledger without harming concurrent work',async()=>{
   await query("CREATE TRIGGER fixture_concurrency_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='public.feedback_submitted' AND NEW.tenant_id="+cases[0].merchant+" THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END")
   const before=(await query('SELECT COUNT(*) AS n FROM private_feedback WHERE tenant_id=?',[cases[0].merchant]))[0].n;const outcome=await concurrently([()=>feedback.submit(cases[0].code,issue()),()=>feedback.submit(cases[1].code,issue(cases[1]))]);assert.equal(outcome[0].status,'rejected');assert.equal(outcome[1].status,'fulfilled');assert.equal((await query('SELECT COUNT(*) AS n FROM private_feedback WHERE tenant_id=?',[cases[0].merchant]))[0].n,before);assert.equal((await query("SELECT used FROM usage_counters WHERE tenant_id=? AND metric='feedback_submissions'",[cases[0].merchant]))[0].used,before)
   assert.equal((await query('SELECT COUNT(*) AS n FROM private_feedback'))[0].n,'508');assert.equal(await submissions(),'508')
   assert.equal((await query('SELECT COUNT(*) AS n FROM feedback_status_events'))[0].n,'202')
   assert.equal((await query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='feedback.status_changed'"))[0].n,'202')
   assert.equal((await query('SELECT COUNT(*) AS n FROM private_feedback f WHERE lock_version<>1+(SELECT COUNT(*) FROM feedback_status_events e WHERE e.tenant_id=f.tenant_id AND e.feedback_id=f.id)'))[0].n,'0')
   for(const c of cases){const count=(await query('SELECT COUNT(*) AS n FROM private_feedback WHERE tenant_id=?',[c.merchant]))[0].n;assert.equal((await query("SELECT used FROM usage_counters WHERE tenant_id=? AND metric='feedback_submissions'",[c.merchant]))[0].used,count);assert.equal((await query("SELECT SUM(quantity) AS n FROM usage_records WHERE tenant_id=? AND metric='feedback_submissions'",[c.merchant]))[0].n,count)}
  })
  assert.equal(await deadlocks(),expectedDeadlocks,'corrected service traffic must add no engine deadlocks, even if a caller could retry')
  await writeFile(new URL('result.json',directory),JSON.stringify({workers:4,workerRounds:50,duplicatePairs:300,pointLockRounds:20,feedbackRows:508,statusEvents:202,expectedLegacyDeadlocks:1,additionalApplicationDeadlocks:0},null,2))
  await snapshot('final-innodb-status.txt')
 }finally{for(const c of sessions)c.destroy();await pool.end();await fixture.close()}
})
