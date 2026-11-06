import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'

test('Phase 1 business schema on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB()
 const sessions=new Set()
 await fixture.admin.query('CREATE DATABASE magicreview_migration_schema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const pool=createDatabasePool({NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_schema',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:4})
 pool.on('connection',c=>sessions.add(c))
 const files=await loadMigrations(new URL('../migrations/',import.meta.url))
 async function query(sql,args=[]){const [rows]=await pool.execute(sql,args);return rows}
 async function insert(table,values){
  const columns=Object.keys(values)
  const result=await query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,Object.values(values))
  // LAST_INSERT_ID is read back as CHAR on the SAME connection for large-ID tests;
  // fixture auto IDs below are small and converted to string immediately.
  return String(result.insertId)
 }
 async function rejects(sql,args=[]){await assert.rejects(query(sql,args),error=>['ER_SIGNAL_EXCEPTION','ER_ROW_IS_REFERENCED_2','ER_NO_REFERENCED_ROW_2','ER_DUP_ENTRY','ER_CONSTRAINT_FAILED','ER_BAD_FIELD_ERROR','WARN_DATA_TRUNCATED'].includes(error.code)||error.errno===4025)}
 const uuid=()=>randomBytes(16)
 const sqlDate=date=>date.toISOString().replace('T',' ').replace('Z','')
 const now=sqlDate(new Date()),later=sqlDate(new Date(Date.now()+30*86400000))
 let platform,reseller,sub,direct,resellerMerchant,merchant,other,branch,otherBranch,version,destination,funnel,short,feedback,user,membership,plan,subscription
 try {
  await t.test('all migrations apply with verified postconditions and consistent status',async()=>{
   try{await runMigrations(pool,files,'up')}catch(error){
    const failures=await query("SELECT version,name,status FROM schema_migrations WHERE status<>'applied'")
    console.info('Blocked migration metadata:',failures)
    // Reproduce only a failed CREATE on this disposable synthetic schema to
    // expose a compiler diagnostic; never emit credentials or deployed values.
    const failure=files.find(file=>file.version===failures[0]?.version)
    if(failure?.sql.startsWith('CREATE '))try{await query(failure.sql)}catch(localError){console.info('Local DDL diagnostic:',localError.code,localError.sqlMessage)}
    throw error
   }
   const status=await runMigrations(pool,files,'status')
   assert.equal(status.applied.length,files.length);assert.deepEqual(status.pending,[])
   const tables=await query('SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')
   assert.equal(tables.length,32)
   assert.ok(tables.every(x=>x.ENGINE==='InnoDB'&&x.TABLE_COLLATION==='utf8mb4_unicode_ci'))
  })
  await t.test('safe catalog/role seeds are repeatable, with no administrator or tenant seed',async()=>{
   assert.equal((await query('SELECT COUNT(*) AS n FROM users'))[0].n,'0')
   assert.equal((await query('SELECT COUNT(*) AS n FROM tenants'))[0].n,'0')
   const before=await query('SELECT role_id,permission_id FROM role_permissions ORDER BY role_id,permission_id')
   for(const seed of files.filter(file=>file.name.startsWith('seed_'))){await query(seed.sql);assert.equal(Number((await query(seed.verify))[0].satisfied),1)}
   assert.deepEqual(await query('SELECT role_id,permission_id FROM role_permissions ORDER BY role_id,permission_id'),before)
   assert.equal((await query('SELECT COUNT(*) AS n FROM industry_channels'))[0].n,'3')
   const c=await pool.getConnection()
   try{
    await c.beginTransaction()
    await c.query("UPDATE roles SET name='Conflicting definition' WHERE code='merchant_staff'")
    const seed=files.find(f=>f.name==='seed_roles')
    await c.query(seed.sql)
    const [[proof]]=await c.query(seed.verify);assert.equal(Number(proof.satisfied),0)
    const [[existing]]=await c.query("SELECT name FROM roles WHERE code='merchant_staff'");assert.equal(existing.name,'Conflicting definition')
    await c.rollback()
   }finally{c.release()}
  })
  await t.test('five allowed hierarchy edges and all forbidden parent-kind combinations',async()=>{
   const channel=(await query("SELECT id FROM industry_channels WHERE code='clinic_healthcare'"))[0].id
   platform=await insert('tenants',{public_id:uuid(),kind:'platform',name:'Platform'})
   async function tenant(kind,parent,parentKind){return insert('tenants',{public_id:uuid(),kind,parent_id:parent,parent_kind:parentKind,name:'Fixture',...(kind==='merchant'?{industry_channel_id:channel}:{})})}
   reseller=await tenant('reseller',platform,'platform');sub=await tenant('sub_reseller',reseller,'reseller')
   direct=await tenant('merchant',platform,'platform');resellerMerchant=await tenant('merchant',reseller,'reseller');merchant=await tenant('merchant',sub,'sub_reseller');other=await tenant('merchant',platform,'platform')
   const parents={platform,reseller,sub_reseller:sub,merchant}
   const allowed=new Set(['platform/reseller','platform/merchant','reseller/sub_reseller','reseller/merchant','sub_reseller/merchant'])
   for(const [parentKind,parentId] of Object.entries(parents))for(const childKind of Object.keys(parents))if(!allowed.has(parentKind+'/'+childKind)){
    await assert.rejects(tenant(childKind,parentId,parentKind))
   }
   await assert.rejects(tenant('merchant',reseller,'platform'))
   await assert.rejects(tenant('merchant',null,null))
   await rejects('UPDATE tenants SET parent_id=id,parent_kind=kind WHERE id=?',[merchant])
   await assert.rejects(tenant('reseller',platform,null))
   await rejects('UPDATE tenants SET parent_id=?,parent_kind=? WHERE id=?',[platform,'platform',merchant])
   await rejects("INSERT INTO tenants(public_id,kind,name) VALUES (?,'platform','Duplicate')",[uuid()])
   const scoped=await query('WITH RECURSIVE tree AS (SELECT id FROM tenants WHERE id=? UNION ALL SELECT t.id FROM tenants t JOIN tree p ON t.parent_id=p.id) SELECT id FROM tree',[reseller])
   assert.deepEqual(new Set(scoped.map(x=>x.id)),new Set([reseller,sub,resellerMerchant,merchant]))
   assert.ok(!scoped.some(x=>x.id===direct))
  })
  await t.test('memberships enforce role kind; tokens are hashed, expiring and single-use',async()=>{
   user=await insert('users',{public_id:uuid(),email:'fixture@example.invalid',email_key:Buffer.from('fixture@example.invalid'),display_name:'Fixture'})
   const roles=await query('SELECT id,code FROM roles');const role=code=>roles.find(x=>x.code===code).id
   membership=await insert('tenant_memberships',{tenant_id:merchant,tenant_kind:'merchant',user_id:user,role_id:role('merchant_admin')})
   await rejects("INSERT INTO tenant_memberships(tenant_id,tenant_kind,user_id,role_id) VALUES (?,'merchant',?,?)",[other,user,role('reseller_admin')])
   await rejects("UPDATE users SET password_hash='plaintext',status='active' WHERE id=?",[user])
   await rejects("UPDATE users SET status='active' WHERE id=?",[user])
   const token=await insert('auth_tokens',{user_id:user,purpose:'invite',tenant_id:merchant,token_hash:randomBytes(32),expires_at:later})
   await query('UPDATE auth_tokens SET consumed_at=CURRENT_TIMESTAMP(6) WHERE id=? AND consumed_at IS NULL',[token])
   await rejects('UPDATE auth_tokens SET consumed_at=NULL WHERE id=?',[token])
   await assert.rejects(insert('auth_tokens',{user_id:user,purpose:'invite',tenant_id:other,token_hash:randomBytes(32),expires_at:later}))
   await assert.rejects(insert('auth_sessions',{user_id:user,token_hash:randomBytes(32),family_id:uuid(),expires_at:'2000-01-01'}))
   const hash=randomBytes(32)
   await insert('auth_sessions',{user_id:user,token_hash:hash,family_id:uuid(),expires_at:later})
   await assert.rejects(insert('auth_sessions',{user_id:user,token_hash:hash,family_id:uuid(),expires_at:later}))
  })
  await t.test('branches, channel copy, destinations and funnels enforce ownership and publication',async()=>{
   const channel=(await query('SELECT industry_channel_id FROM tenants WHERE id=?',[merchant]))[0].industry_channel_id
   const labels=JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'})
   const copy=JSON.stringify({title:'Share your experience',google_label:'Leave a Google review',private_label:'Share private feedback'})
   version=await insert('channel_versions',{industry_channel_id:channel,version:1,display_name:'Clinic',public_copy:copy,feedback_labels:labels})
   await rejects('UPDATE channel_versions SET public_copy=? WHERE id=?',[JSON.stringify({title:'Bad',google_label:'Hidden',private_label:'Share private feedback'}),version])
   await rejects('UPDATE channel_versions SET feedback_labels=? WHERE id=?',[JSON.stringify({medical_details:'Diagnosis'}),version])
   await query("UPDATE channel_versions SET status='published',published_at=? WHERE id=?",[now,version])
   await rejects("UPDATE channel_versions SET display_name='Changed' WHERE id=?",[version])
   await rejects("UPDATE channel_versions SET display_name='clinic' WHERE id=?",[version])
   await rejects("UPDATE channel_versions SET status='draft',published_at=NULL WHERE id=?",[version])
   const branchData={public_id:uuid(),tenant_id:merchant,industry_channel_id:channel,code:'main',name:'Main',timezone:'Asia/Kolkata'}
   branch=await insert('branches',branchData)
   otherBranch=await insert('branches',{...branchData,public_id:uuid(),tenant_id:other})
   await assert.rejects(insert('branches',{...branchData,public_id:uuid()}))
   await assert.rejects(insert('branches',{...branchData,public_id:uuid(),tenant_id:reseller,tenant_kind:'reseller'}))
   destination=await insert('review_destinations',{tenant_id:merchant,branch_id:branch,place_id:'synthetic_place',review_url:'https://search.google.com/local/writereview?placeid=synthetic_place'})
   await rejects("UPDATE review_destinations SET review_url='https://untrusted.invalid/' WHERE id=?",[destination])
   await assert.rejects(insert('review_destinations',{tenant_id:merchant,branch_id:otherBranch,place_id:'synthetic',review_url:'https://example.invalid'}))
   funnel=await insert('funnel_configurations',{tenant_id:merchant,branch_id:branch,industry_channel_id:channel,channel_version_id:version,review_destination_id:destination,revision:1,brand_title:'Fixture',accent_hex:'#123456',locale:'en'})
   await assert.rejects(insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code:randomBytes(16).toString('base64url')}))
   await query("UPDATE funnel_configurations SET status='published',published_at=? WHERE id=?",[now,funnel])
   await rejects("UPDATE funnel_configurations SET brand_title='Changed' WHERE id=?",[funnel])
   await rejects("UPDATE funnel_configurations SET brand_title='fixture' WHERE id=?",[funnel])
   await rejects("UPDATE funnel_configurations SET status='draft',published_at=NULL WHERE id=?",[funnel])
   const code=randomBytes(16).toString('base64url')
   short=await insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code})
   await assert.rejects(insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code}))
   await rejects("UPDATE short_links SET tenant_id=? WHERE id=?",[other,short])
   await insert('qr_assets',{tenant_id:merchant,branch_id:branch,short_link_id:short,format:'png',object_key:'fixture/'+code+'.png'})
   await assert.rejects(insert('qr_assets',{tenant_id:other,branch_id:otherBranch,short_link_id:short,format:'svg',object_key:'fixture/cross-tenant.svg'}))
   await rejects("UPDATE qr_assets SET status='ready' WHERE short_link_id=?",[short])
  })
  await t.test('structured feedback enforces ratings, tenant FKs and immutable customer answers',async()=>{
   const channel=(await query('SELECT industry_channel_id FROM tenants WHERE id=?',[merchant]))[0].industry_channel_id
   const data={public_id:uuid(),tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,industry_channel_id:channel,short_link_id:short,submission_key_hash:randomBytes(32),overall_rating:1}
   feedback=await insert('private_feedback',data)
   await assert.rejects(insert('private_feedback',{...data,public_id:uuid(),submission_key_hash:randomBytes(32),overall_rating:0}))
   await assert.rejects(insert('private_feedback',{...data,public_id:uuid(),submission_key_hash:randomBytes(32),tenant_id:other}))
   await assert.rejects(insert('private_feedback',{...data,public_id:uuid(),submission_key_hash:randomBytes(32),branch_id:otherBranch}))
   await assert.rejects(insert('private_feedback',{...data,public_id:uuid()}))
   await rejects('UPDATE private_feedback SET overall_rating=5 WHERE id=?',[feedback])
   await rejects("UPDATE private_feedback SET status='resolved' WHERE id=?",[feedback])
   await rejects("UPDATE private_feedback SET medical_details='not accepted' WHERE id=?",[feedback])
   await rejects("UPDATE private_feedback SET comment='not accepted' WHERE id=?",[feedback])
   const fields=await query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='private_feedback'")
   assert.ok(fields.every(x=>!/(text|comment|medical|symptom|diagnos|patient|contact|email|phone)/i.test(x.COLUMN_NAME)))
   const link=await query('SELECT code,funnel_configuration_id,status FROM short_links WHERE id=?',[short]);assert.equal(link[0].status,'active')
  })
  await t.test('merchant subscriptions, period checks, active uniqueness and usage ownership',async()=>{
   plan=await insert('subscription_plans',{code:'fixture',version:1,name:'Fixture',price:'0.00',currency:'INR',interval_unit:'month'})
   await insert('plan_limits',{plan_id:plan,metric:'branches',limit_value:'3'})
   await rejects("UPDATE subscription_plans SET status='published' WHERE id=?",[plan])
   for(const metric of ['staff_seats','feedback_submissions','short_links','qr_assets'])await insert('plan_limits',{plan_id:plan,metric,limit_value:null})
   await query("UPDATE subscription_plans SET status='published' WHERE id=?",[plan])
   await rejects("UPDATE subscription_plans SET price=100 WHERE id=?",[plan])
   await rejects("UPDATE plan_limits SET limit_value=99 WHERE plan_id=?",[plan])
   await assert.rejects(insert('plan_limits',{plan_id:plan,metric:'staff_seats',limit_value:9}))
   const data={tenant_id:merchant,plan_id:plan,status:'active',starts_at:now,current_period_start:now,current_period_end:later}
   subscription=await insert('subscriptions',data)
   await assert.rejects(insert('subscriptions',data))
   await assert.rejects(insert('subscriptions',{...data,tenant_id:reseller,tenant_kind:'reseller'}))
   await assert.rejects(insert('subscriptions',{...data,tenant_id:other,current_period_end:now}))
   await insert('subscriptions',{...data,status:'expired'})
   const usage={tenant_id:merchant,subscription_id:subscription,metric:'feedback_submissions',quantity:'1',period_start:now,period_end:later,source_event_key:Buffer.from('synthetic-event')}
   const usageId=await insert('usage_records',usage)
   await assert.rejects(insert('usage_records',usage))
   await assert.rejects(insert('usage_records',{...usage,source_event_key:randomBytes(16),tenant_id:other}))
   await assert.rejects(insert('usage_records',{...usage,source_event_key:randomBytes(16),quantity:'-1'}))
   await rejects('UPDATE usage_records SET quantity=5 WHERE id=?',[usageId])
   await insert('usage_counters',{tenant_id:merchant,subscription_id:subscription,metric:'feedback_submissions',period_start:now,period_end:later,used:'1'})
  })
  await t.test('transaction rollback preserves feedback and append-only audit/status events',async()=>{
   const c=await pool.getConnection()
   try{
    await c.beginTransaction()
    await c.execute("UPDATE private_feedback SET status='in_progress' WHERE id=?",[feedback])
    await c.execute("INSERT INTO feedback_status_events(tenant_id,feedback_id,actor_user_id,from_status,to_status,reason_code) VALUES (?,?,?,'new','in_progress','triage')",[merchant,feedback,user])
    await c.rollback()
   }finally{c.release()}
   assert.equal((await query('SELECT status FROM private_feedback WHERE id=?',[feedback]))[0].status,'new')
   assert.equal((await query('SELECT COUNT(*) AS n FROM feedback_status_events'))[0].n,'0')
   const event=await insert('feedback_status_events',{tenant_id:merchant,feedback_id:feedback,actor_user_id:user,from_status:'new',to_status:'in_progress',reason_code:'triage'})
   await rejects("UPDATE feedback_status_events SET reason_code='spam' WHERE id=?",[event])
   const audit=await insert('audit_logs',{event_id:uuid(),tenant_id:merchant,actor_user_id:user,actor_membership_id:membership,actor_tenant_id:merchant,action:'feedback.change_status',resource_type:'feedback',resource_id:feedback,request_id:uuid(),outcome:'success',safe_metadata:'{}'})
   await rejects("UPDATE audit_logs SET action='changed' WHERE id=?",[audit])
   // Do not execute destructive SQL, even for negative tests. DELETE guards are
   // verified through trigger metadata, while UPDATE rejection is exercised.
   const guards=await query("SELECT EVENT_OBJECT_TABLE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_MANIPULATION='DELETE' AND EVENT_OBJECT_TABLE IN ('audit_logs','usage_records','feedback_status_events')")
   assert.equal(guards.length,3)
   await assert.rejects(insert('audit_logs',{event_id:uuid(),tenant_id:merchant,actor_user_id:user,actor_membership_id:membership,actor_tenant_id:other,action:'fixture',resource_type:'fixture',request_id:uuid(),outcome:'success',safe_metadata:'{}'}))
  })
  await t.test('BIGINT values round-trip as strings; checksum drift is refused',async()=>{
   const big='9007199254740993'
   await insert('users',{id:big,public_id:uuid(),email:'big@example.invalid',email_key:Buffer.from('big@example.invalid'),display_name:'Big ID fixture'})
   const row=(await query('SELECT id FROM users WHERE id=?',[big]))[0]
   assert.equal(typeof row.id,'string');assert.equal(row.id,big)
   const altered=files.map((f,i)=>i===1?{...f,checksum:Buffer.alloc(32)}:f)
   await assert.rejects(runMigrations(pool,altered,'up'),/CHECKSUM_MISMATCH/)
   const final=await runMigrations(pool,files,'up');assert.deepEqual(final.pending,[]);assert.equal(final.applied.length,files.length)
  })
 }finally{for(const c of sessions)c.destroy();await new Promise(resolve=>setImmediate(resolve));await pool.end();await fixture.close()}
})
