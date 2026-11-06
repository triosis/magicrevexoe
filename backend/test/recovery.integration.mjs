import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {mkdir,readFile,copyFile,open,writeFile,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from '../dist/auth/service.js'
import {hashPassword} from '../dist/auth/passwords.js'
import {opaqueToken,tokenDigest} from '../dist/auth/tokens.js'
import {TenantService} from '../dist/tenants/service.js'
import {FunnelService} from '../dist/funnels/service.js'
import {FeedbackService} from '../dist/feedback/service.js'
import {SubscriptionService} from '../dist/subscriptions/service.js'
import {BusinessService} from '../dist/business/service.js'
import {createApp} from '../dist/app.js'
import {digest} from '../dist/migrations/schema.js'
import {backup,restore,verify} from '../scripts/recovery/utility.mjs'
import {privateDirectory} from '../scripts/recovery/files.mjs'
import {keys,readManifest,writeManifest} from '../scripts/recovery/archive.mjs'
import {integrity} from '../scripts/recovery/snapshot.mjs'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {fundTestMerchant} from './quota-fixtures.mjs'
import {authenticator} from './mfa-fixtures.mjs'

test('actual encrypted backup, verified restoration and restored application on MariaDB 11.8.9',{timeout:180000},async t=>{
 const fixture=await startDisposableMariaDB(),pools=[],sessions=new Set(),outputRoot=await privateDirectory(),key=randomBytes(32).toString('base64'),accessKey=randomBytes(32),mfaKey=randomBytes(32),password=randomBytes(24).toString('base64url')
 const [[host]]=await fixture.admin.query('SELECT @@hostname AS hostname');let index=0,source,good,manifest,restored,rehearsal,merchant,peer,branch,link,code,qr,feedbackId,superMid,merchantMid,recoveryCodes
 const q=async(pool,sql,args=[]) => (await pool.execute(sql,args))[0]
 const insert=async(pool,table,values)=>String((await q(pool,`INSERT INTO ${table} (${Object.keys(values).join(',')}) VALUES (${Object.keys(values).map(()=>'?').join(',')})`,Object.values(values))).insertId)
 async function database(){const database='magicreview_migration_recovery_'+(++index);await fixture.admin.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:database,DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5};const pool=createDatabasePool(env);pool.on('connection',c=>sessions.add(c));pools.push(pool);const policy={environment:'local',host:'127.0.0.1',port:fixture.options.port,database,serverHostname:host.hostname,expectedAccount:'root@localhost',allowedTriggerDefiners:[]};return{pool,policy}}
 const options=x=>({policy:x.policy,user:'root',password:fixture.options.password,bin:process.env.MARIADB_TEST_BIN,outputRoot,encryptionKey:key,keyId:'disposable-v1'})
 const restoreInto=(x,extra={})=>restore({...options(x),manifestFile:good.manifestFile,confirmation:'RESTORE-EMPTY:'+digest(x.policy),...extra})
 try{
  source=await database();await runMigrations(source.pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  const root=await insert(source.pool,'tenants',{public_id:randomBytes(16),kind:'platform',name:'Recovery platform'}),channel=(await q(source.pool,"SELECT id FROM industry_channels WHERE code='salon_spa'"))[0].id
  const reseller=await insert(source.pool,'tenants',{public_id:randomBytes(16),kind:'reseller',parent_id:root,parent_kind:'platform',name:'Recovery reseller'}),sub=await insert(source.pool,'tenants',{public_id:randomBytes(16),kind:'sub_reseller',parent_id:reseller,parent_kind:'reseller',name:'Recovery sub-reseller'})
  merchant=await insert(source.pool,'tenants',{public_id:randomBytes(16),kind:'merchant',parent_id:sub,parent_kind:'sub_reseller',industry_channel_id:channel,name:'Recovery merchant'});peer=await insert(source.pool,'tenants',{public_id:randomBytes(16),kind:'merchant',parent_id:root,parent_kind:'platform',industry_channel_id:channel,name:'Isolated peer'})
  const encoded=await hashPassword(password)
  async function user(email,tenant,kind,role){const id=await insert(source.pool,'users',{public_id:randomBytes(16),email,email_key:Buffer.from(email),display_name:'Recovery fixture',password_hash:encoded,status:'active',email_verified_at:new Date()});const mid=await insert(source.pool,'tenant_memberships',{tenant_id:tenant,tenant_kind:kind,user_id:id,role_id:(await q(source.pool,'SELECT id FROM roles WHERE code=?',[role]))[0].id,status:'active'});return{id,mid}}
  const superUser=await user('super-recovery@example.invalid',root,'platform','super_admin'),owner=await user('merchant-recovery@example.invalid',merchant,'merchant','merchant_admin');superMid=superUser.mid;merchantMid=owner.mid
  const auth=new AuthService(source.pool,accessKey,undefined,undefined,mfaKey),tenants=new TenantService(source.pool,auth),funnels=new FunnelService(source.pool,tenants,auth,'https://api.example.invalid','https://app.example.invalid'),feedback=new FeedbackService(tenants,auth,funnels)
  const challenge=await auth.login('super-recovery@example.invalid',password),otp=authenticator(await auth.enrollMfa(challenge.challengeToken)),activated=await auth.verifyMfa(challenge.challengeToken,otp.generate(),true);recoveryCodes=[...activated.recoveryCodes]
  const platform=await auth.authenticate((await auth.selectTenant(await auth.authenticate(activated.accessToken),superMid)).accessToken)
  const login=await auth.login('merchant-recovery@example.invalid',password),ownerPrincipal=await auth.authenticate((await auth.selectTenant(await auth.authenticate(login.accessToken),merchantMid)).accessToken)
  await insert(source.pool,'auth_tokens',{user_id:owner.id,purpose:'reset_password',token_hash:tokenDigest(opaqueToken()),expires_at:'2030-01-01 00:00:00.123456'})
  const version=await insert(source.pool,'channel_versions',{industry_channel_id:channel,version:1,status:'published',display_name:'Recovery salon',public_copy:JSON.stringify({title:'Visit',google_label:'Leave a Google review',private_label:'Share private feedback'}),feedback_labels:JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'}),published_at:new Date()})
  branch=await insert(source.pool,'branches',{public_id:randomBytes(16),tenant_id:merchant,industry_channel_id:channel,code:'main',name:'Recovery branch - café 💈',timezone:'Asia/Kolkata'})
  const destination=await insert(source.pool,'review_destinations',{tenant_id:merchant,branch_id:branch,place_id:'ChIJ_recovery',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_recovery'})
  const funnel=await insert(source.pool,'funnel_configurations',{tenant_id:merchant,branch_id:branch,industry_channel_id:channel,channel_version_id:version,review_destination_id:destination,revision:1,status:'published',brand_title:'Recovery visit',accent_hex:'#123456',locale:'en',published_at:new Date()})
  code=randomBytes(16).toString('base64url');link=await insert(source.pool,'short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code})
  await fundTestMerchant(source.pool,merchant);await fundTestMerchant(source.pool,peer)
  qr=await funnels.generateQr(platform,branch,{shortLinkId:link,format:'svg',regenerate:false})
  const accepted=await feedback.submit(code,{submissionToken:auth.feedbackTokens.issue(code,1).token,overallRating:4,serviceRating:5});feedbackId=(await q(source.pool,'SELECT id FROM private_feedback WHERE public_id=?',[Buffer.from(accepted.confirmationId,'hex')]))[0].id
  await feedback.changeStatus(ownerPrincipal,feedbackId,{status:'in_progress',reasonCode:'triage',lockVersion:1})

  await t.test('consistent encrypted native backup includes all 32 tables and leaves credentials outside arguments',async()=>{
   const tempBefore=new Set(await readdir(tmpdir()));good=await backup(options(source));assert.deepEqual((await readdir(tmpdir())).filter(name=>name.startsWith('magicreview-recovery-')&&!tempBefore.has(name)),[]);manifest=await readManifest(good.manifestFile,keys(key));assert.equal(good.tableCount,32);assert.equal(good.triggerCount,46);assert.equal(good.restoreVerified,false)
   for(const table of ['tenants','users','auth_sessions','auth_tokens','user_mfa','mfa_recovery_codes','branches','review_destinations','qr_assets','short_links','private_feedback','feedback_status_events','subscriptions','usage_counters','usage_records','audit_logs','schema_migrations'])assert.ok(BigInt(manifest.snapshot.data[table].rows)>0n,table)
   const bytes=await readFile(good.archiveFile);assert.ok(!bytes.includes(Buffer.from(password)));assert.ok(!bytes.includes(Buffer.from('CREATE TABLE')))
   assert.equal((await verify({manifestFile:good.manifestFile,encryptionKey:key})).restoreVerified,false)
  })
  await t.test('fresh actual restore matches complete data, indexes, foreign keys, triggers and immutable migration ledger',async()=>{
   restored=await database();rehearsal=await restoreInto(restored);assert.equal(rehearsal.restoreVerified,true);assert.equal(rehearsal.snapshotDigest,manifest.snapshot.snapshotDigest)
   assert.equal(rehearsal.tableCount,32);assert.equal(rehearsal.triggerCount,46);assert.ok(rehearsal.relationships.foreignKeys>0)
   assert.deepEqual(await q(restored.pool,'SELECT * FROM schema_migrations ORDER BY version'),await q(source.pool,'SELECT * FROM schema_migrations ORDER BY version'))
   assert.deepEqual(await q(restored.pool,"SELECT DATE_FORMAT(expires_at,'%Y-%m-%d %H:%i:%s.%f') AS precise FROM auth_tokens ORDER BY id"),await q(source.pool,"SELECT DATE_FORMAT(expires_at,'%Y-%m-%d %H:%i:%s.%f') AS precise FROM auth_tokens ORDER BY id"))
  })
  async function copyArchive(){const dir=await privateDirectory(),copy=path.join(dir,path.basename(good.manifestFile));await copyFile(good.manifestFile,copy);await copyFile(good.archiveFile,path.join(dir,manifest.archive));return {dir,file:copy,archive:path.join(dir,manifest.archive)}}
  await t.test('truncation, ciphertext corruption, wrong key and tampered/incomplete metadata are rejected before SQL',async()=>{
   const truncated=await copyArchive(),h=await open(truncated.archive,'r+');await h.truncate(50);await h.close();await assert.rejects(verify({manifestFile:truncated.file,encryptionKey:key}),/INTEGRITY/)
   const corrupt=await copyArchive(),c=await open(corrupt.archive,'r+'),changedByte=Buffer.alloc(1);await c.read(changedByte,0,1,25);changedByte[0]^=0xff;await c.write(changedByte,0,1,25);await c.close();await assert.rejects(verify({manifestFile:corrupt.file,encryptionKey:key}),/INTEGRITY/)
   await assert.rejects(verify({manifestFile:good.manifestFile,encryptionKey:randomBytes(32).toString('base64')}),/AUTHENTICATION/)
   const incomplete=await privateDirectory(),bad=path.join(incomplete,'incomplete.json');await writeFile(bad,'{}');await assert.rejects(verify({manifestFile:bad,encryptionKey:key}),/METADATA/)
  })
  await t.test('existing targets, wrong identity and absent confirmation never import or overwrite',async()=>{
   await assert.rejects(restoreInto(source),/TARGET_MUST_BE_EMPTY/)
   const x=await database();await assert.rejects(restoreInto(x,{confirmation:'wrong'}),/CONFIRMATION/)
   const wrong={...x.policy,serverHostname:'unexpected-server'};await assert.rejects(restoreInto(x,{policy:wrong,confirmation:'RESTORE-EMPTY:'+digest(wrong)}),/UNEXPECTED_DATABASE_TARGET/)
   assert.equal((await q(x.pool,'SHOW TABLES')).length,0)
  })
  await t.test('missing backup privileges fail closed without producing a complete artifact',async()=>{
   const user='no_recovery_rights',pw=randomBytes(24).toString('hex');await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[user,pw])
   await assert.rejects(backup({...options(source),user,password:pw,policy:{...source.policy,expectedAccount:user+'@localhost'}}))
  })
  await t.test('a separate SELECT/TRIGGER/LOCK TABLES account can back up without source DDL or DML grants',async()=>{
   const user='recovery_reader',pw=randomBytes(24).toString('hex');await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[user,pw]);const escaped=source.policy.database.replaceAll('_','\\_');await fixture.admin.query(`GRANT SELECT,TRIGGER,LOCK TABLES ON \`${escaped}\`.* TO ?@'localhost'`,[user])
   const result=await backup({...options(source),user,password:pw,policy:{...source.policy,expectedAccount:user+'@localhost'}});assert.equal((await verify({manifestFile:result.manifestFile,encryptionKey:key})).integrityVerified,true)
  })
  await t.test('timestamped repeated backup never overwrites the earlier encrypted artifact',async()=>{
   const bytes=await readFile(good.archiveFile),second=await backup(options(source));assert.notEqual(second.archiveFile,good.archiveFile);assert.deepEqual(await readFile(good.archiveFile),bytes);assert.equal((await verify({manifestFile:second.manifestFile,encryptionKey:key})).integrityVerified,true)
  })
  await t.test('authentic file integrity is distinct from restored row-count verification',async()=>{
   const copy=await copyArchive(),file=path.join(copy.dir,'wrong-count.manifest.json'),changed=structuredClone(manifest);changed.snapshot.data.users.rows=String(BigInt(changed.snapshot.data.users.rows)+1n)
   await writeManifest(file,changed,keys(key));assert.equal((await verify({manifestFile:file,encryptionKey:key})).integrityVerified,true)
   const x=await database();await assert.rejects(restoreInto(x,{manifestFile:file}),/RESTORED_DATABASE_MISMATCH/);await assert.rejects(restoreInto(x),/TARGET_MUST_BE_EMPTY/)
   const wrongRelease=structuredClone(manifest),releaseFile=path.join(copy.dir,'wrong-release.manifest.json');wrongRelease.snapshot.releaseChecksums[0]='00'.repeat(32);await writeManifest(releaseFile,wrongRelease,keys(key));const y=await database();await assert.rejects(restoreInto(y,{manifestFile:releaseFile}),/BACKUP_RELEASE_MISMATCH/);assert.equal((await q(y.pool,'SHOW TABLES')).length,0)
  })
  await t.test('interruption after import leaves an unverified protected target and cannot be automatically retried',async()=>{
   const x=await database(),controller=new AbortController();await assert.rejects(restoreInto(x,{signal:controller.signal,audit:async e=>{if(e.event==='import_completed')controller.abort()}}),/INTERRUPTED/)
   assert.ok((await q(x.pool,'SHOW TABLES')).length>0);await assert.rejects(restoreInto(x),/TARGET_MUST_BE_EMPTY/)
  })
  await t.test('restored foreign keys, publication and append-only triggers reject invalid writes',async()=>{
   await assert.rejects(q(restored.pool,"UPDATE audit_logs SET outcome='denied' WHERE id=(SELECT id FROM (SELECT MIN(id) AS id FROM audit_logs) s)"),e=>e.code==='ER_SIGNAL_EXCEPTION')
   await assert.rejects(q(restored.pool,"UPDATE channel_versions SET display_name='mutated' WHERE id=?",[version]),e=>e.code==='ER_SIGNAL_EXCEPTION')
   await assert.rejects(insert(restored.pool,'review_destinations',{tenant_id:peer,branch_id:branch,place_id:'ChIJ_invalid',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_invalid'}),e=>e.code==='ER_NO_REFERENCED_ROW_2')
   const db=await restored.pool.getConnection();try{assert.ok((await integrity(db)).foreignKeys>0)}finally{db.release()}
  })
  await t.test('explicit referential verification catches an orphan that reenabling foreign_key_checks does not repair',async()=>{
   const x=await database();await restoreInto(x);const db=await x.pool.getConnection()
   try{
    await db.query('SET SESSION foreign_key_checks=0')
    await db.execute("INSERT INTO branches(public_id,tenant_id,industry_channel_id,code,name,timezone) VALUES (?,999999999,?,'orphan','Disposable invalid relationship','UTC')",[randomBytes(16),channel])
    await db.query('SET SESSION foreign_key_checks=1');await assert.rejects(integrity(db),/FOREIGN_KEY_INTEGRITY_FAILED/)
   }finally{await db.query('SET SESSION foreign_key_checks=1');db.release()}
  })
  await t.test('actual backup, integrity and confirmed restore CLI commands produce verified artifacts without credential logs',async()=>{
   const dir=await privateDirectory(),sourcePolicy=path.join(dir,'source.json'),targetPolicy=path.join(dir,'target.json'),x=await database();await writeFile(sourcePolicy,JSON.stringify(source.policy));await writeFile(targetPolicy,JSON.stringify(x.policy))
   async function cli(args){const child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/recovery/cli.mjs',import.meta.url)),...args],{windowsHide:true,env:{...process.env,RECOVERY_DB_USER:'root',RECOVERY_DB_PASSWORD:fixture.options.password,BACKUP_ENCRYPTION_KEY:key,BACKUP_KEY_ID:'disposable-cli'}});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const [code]=await once(child,'exit');assert.equal(code,0,stderr);assert.ok(!stdout.includes(fixture.options.password)&&!stderr.includes(fixture.options.password)&&!stdout.includes(key)&&!stderr.includes(key));return JSON.parse(stdout.trim().split('\n').at(-1))}
   const cliBackup=await cli(['backup','--target',sourcePolicy,'--bin',process.env.MARIADB_TEST_BIN,'--output',outputRoot]);assert.equal((await cli(['verify','--manifest',cliBackup.manifestFile])).restoreVerified,false)
   const result=await cli(['restore','--target',targetPolicy,'--bin',process.env.MARIADB_TEST_BIN,'--output',outputRoot,'--manifest',cliBackup.manifestFile,'--confirm','RESTORE-EMPTY:'+digest(x.policy)]);assert.equal(result.restoreVerified,true)
  })
  await t.test('application services work on restored data with MFA, isolation, public feedback, usage and QR content',async()=>{
   const auth=new AuthService(restored.pool,accessKey,undefined,undefined,mfaKey),tenants=new TenantService(restored.pool,auth),funnels=new FunnelService(restored.pool,tenants,auth,'https://api.example.invalid','https://app.example.invalid'),feedback=new FeedbackService(tenants,auth,funnels),subscriptions=new SubscriptionService(tenants)
   const challenge=await auth.login('super-recovery@example.invalid',password);assert.equal(challenge.mfaRequired,true);await assert.rejects(auth.authenticate(challenge.challengeToken));const verified=await auth.verifyMfa(challenge.challengeToken,recoveryCodes.shift());const platform=await auth.authenticate((await auth.selectTenant(await auth.authenticate(verified.accessToken),superMid)).accessToken)
   const tokens=await auth.login('merchant-recovery@example.invalid',password),selected=await auth.selectTenant(await auth.authenticate(tokens.accessToken),merchantMid),owner=await auth.authenticate(selected.accessToken)
   assert.equal((await feedback.details(owner,feedbackId)).status,'in_progress');await assert.rejects(subscriptions.current(owner,peer),e=>e.status===404)
   const publicFunnel=await funnels.resolve(code);assert.equal(publicFunnel.options.googleReview.independent,true);assert.equal(publicFunnel.options.privateFeedback.independent,true)
   await feedback.submit(code,{submissionToken:publicFunnel.options.privateFeedback.submissionToken.token,overallRating:3})
   assert.equal((await subscriptions.usage(owner,merchant,'feedback_submissions')).metrics[0].used,'2');assert.ok((await funnels.qrContent(platform,qr.id)).content)
   const env={NODE_ENV:'test',CORS_ORIGINS:[]},business=new BusinessService(tenants,auth),server=createServer(createApp({env,auth,tenants,business,funnels,feedback,subscriptions,checkDatabase:async()=>{await q(restored.pool,'SELECT 1')},isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening')
   const base='http://127.0.0.1:'+server.address().port+'/api/v1'
   async function request(url,token,body,method=body?'POST':'GET'){const response=await fetch(base+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()}}
   try{
    const primary=await request('/auth/login',null,{email:'super-recovery@example.invalid',password});assert.equal(primary.body.mfaRequired,true);assert.equal((await request('/auth/me',primary.body.challengeToken)).status,401)
    const factor=await request('/auth/mfa/verify',null,{challengeToken:primary.body.challengeToken,code:recoveryCodes.shift()});assert.equal(factor.status,200)
    assert.equal((await request('/merchants/'+merchant+'/subscription',selected.accessToken)).status,200);assert.equal((await request('/merchants/'+peer+'/subscription',selected.accessToken)).status,404)
    const publicReply=await request('/public/funnels/'+code),body={submissionToken:publicReply.body.options.privateFeedback.submissionToken.token,overallRating:5};const accepted=await request('/public/funnels/'+code+'/feedback',null,body);assert.equal(accepted.status,200);assert.deepEqual((await request('/public/funnels/'+code+'/feedback',null,body)).body,accepted.body)
    assert.equal((await subscriptions.usage(owner,merchant,'feedback_submissions')).metrics[0].used,'3')
    assert.equal((await request('/feedback/'+feedbackId+'/status',selected.accessToken,{status:'resolved',reasonCode:'completed',lockVersion:2},'PATCH')).status,200)
   }finally{await new Promise(resolve=>server.close(resolve))}
  })
  const evidence=new URL('../../.tmp-frontend/recovery/',import.meta.url);await mkdir(evidence,{recursive:true});await writeFile(new URL('result.json',evidence),JSON.stringify({database:'MariaDB 11.8.9',restoreVerified:rehearsal.restoreVerified,tables:rehearsal.tableCount,triggers:rehearsal.triggerCount,relationships:rehearsal.relationships,counts:Object.fromEntries(Object.entries(manifest.snapshot.data).map(([name,data])=>[name,data.rows])),snapshotDigest:rehearsal.snapshotDigest,backupDurationMs:good.durationMs,restoreDurationMs:rehearsal.durationMs,applicationVerified:true,archiveEncrypted:true},null,2))
 }finally{for(const c of sessions)c.destroy();await new Promise(r=>setImmediate(r));for(const pool of pools)await pool.end();await fixture.close()}
})
