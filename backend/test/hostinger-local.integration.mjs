import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,createHash} from 'node:crypto'
import {execFile,spawn} from 'node:child_process'
import {promisify} from 'node:util'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {mkdtemp,writeFile,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {createDatabasePool} from '../dist/db/pool.js'
import {hostingerLocalAcknowledgement} from '../dist/config/database-transport.js'
import {targetPolicy} from '../dist/migrations/operator.js'
import {digest} from '../dist/migrations/schema.js'
import {runtimePrivileges} from '../dist/migrations/privileges.js'
import {bootstrapPlatform} from '../dist/setup/bootstrap.js'
import {authenticator} from './mfa-fixtures.mjs'
const execute=promisify(execFile),cwd=fileURLToPath(new URL('..',import.meta.url)),quote=s=>'`'+s.replaceAll('`','``')+'`'
const system=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))

test('explicit Hostinger local transport on an owned disposable MariaDB 11.8.9 port3306',{timeout:180000},async t=>{
 // Binding3306 must succeed before launching our own instance. Never adopt a listener.
 const fixture=await startDisposableMariaDB(undefined,{port:3306}),sessions=new Set(),pools=[]
 const directory=await mkdtemp(join(tmpdir(),'revexoe-local-operator-')),database='magicreview_migration_local_'+randomBytes(5).toString('hex'),migrationUser='local_migrator',migrationPassword=randomBytes(24).toString('hex'),runtimeUser='local_runtime',runtimePassword=randomBytes(24).toString('hex'),approvalId='TEST-ONLY-HOSTINGER-LOCAL-RECORD'
 const common={...system,NODE_ENV:'production',DB_TLS_MODE:'HOSTINGER_LOCAL',DB_HOST:'127.0.0.1',DB_PORT:'3306',HOSTINGER_LOCAL_APPROVAL:hostingerLocalAcknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:approvalId}
 const pool=(user,password)=>{const p=createDatabasePool({...common,DB_NAME:database,DB_USER:user,DB_PASSWORD:password,DB_CONNECTION_LIMIT:4});p.on('connection',c=>sessions.add(c));pools.push(p);return p}
 let policy,policyFile,reportFile,operatorEnv,admin
 const run=(args,env=operatorEnv)=>execute(process.execPath,['dist/migrations/operator-cli.js',...args],{cwd,env,timeout:20000})
 const failure=async(args,expression,env=operatorEnv)=>assert.rejects(run(args,env),e=>{assert.equal(e.code,1);assert.match(e.stderr,expression);assert.ok(!e.stderr.includes(migrationPassword));return true})
 try{
  await fixture.admin.query('CREATE DATABASE '+quote(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const [publicGrants]=await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'");for(const row of publicGrants)await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+quote(row.Db)+'.* FROM PUBLIC')
  await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[migrationUser,migrationPassword])
  await fixture.admin.query('GRANT SELECT,CREATE,ALTER,TRIGGER ON '+quote(database.replaceAll('_','\\_'))+".* TO ?@'localhost'",[migrationUser])
  for(const table of ['schema_migrations','industry_channels','roles','permissions','role_permissions'])await fixture.admin.query('GRANT CREATE,INSERT'+(table==='schema_migrations'?',UPDATE':'')+' ON '+quote(database)+'.'+quote(table)+" TO ?@'localhost'",[migrationUser])
  const [[identity]]=await fixture.admin.query('SELECT @@hostname AS hostname')
  policy=targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,database,serverHostname:identity.hostname,expectedAccount:migrationUser+'@localhost',transport:'HOSTINGER_LOCAL',hostingerLocalApprovalId:approvalId})
  policyFile=join(directory,'target.json');reportFile=join(directory,'preflight.json');await writeFile(policyFile,JSON.stringify(policy));operatorEnv={...common,MIGRATION_DB_USER:migrationUser,MIGRATION_DB_PASSWORD:migrationPassword};admin=pool('root',fixture.options.password)
  const pre=['preflight','--target',policyFile,'--environment','production']
  await t.test('missing acknowledgement is refused before connection or bootstrap',async()=>{
   const env={...operatorEnv};delete env.HOSTINGER_LOCAL_APPROVAL;await failure(pre,/HOSTINGER_LOCAL/,env);assert.equal((await admin.query('SHOW TABLES'))[0].length,0)
  })
  await t.test('non-mutating preflight binds transport reference and independent confirmation',async()=>{
   await run([...pre,'--report',reportFile]);const report=JSON.parse(await readFile(reportFile));assert.equal(report.initialized,false);assert.equal(report.pending.length,85);assert.equal(report.encrypted,false);assert.equal(report.approvalReference,approvalId);assert.equal((await admin.query('SHOW TABLES'))[0].length,0)
   const apply=['apply','--target',policyFile,'--environment','production','--approval',reportFile,'--audit',join(directory,'missing-confirm.jsonl')];await failure(apply,/PRODUCTION_CONFIRMATION/)
   const changed={...policy,hostingerLocalApprovalId:'TEST-OTHER-APPROVAL-RECORD'};await writeFile(policyFile,JSON.stringify(changed));await failure([...apply,'--confirm-production','APPLY-PRODUCTION:'+digest(changed)],/PREFLIGHT_APPROVAL_MISMATCH/,{...operatorEnv,HOSTINGER_LOCAL_APPROVAL_ID:changed.hostingerLocalApprovalId});assert.equal((await admin.query('SHOW TABLES'))[0].length,0);await writeFile(policyFile,JSON.stringify(policy))
  })
  await t.test('explicit approved CLI creates complete schema and records plaintext transport honestly',async()=>{
   const audit=join(directory,'apply.jsonl');const result=await run(['apply','--target',policyFile,'--environment','production','--approval',reportFile,'--audit',audit,'--confirm-production','APPLY-PRODUCTION:'+digest(policy)])
   assert.ok(result.stdout.includes('execution_completed'));const events=(await readFile(audit,'utf8')).trim().split('\n').map(JSON.parse);const approved=events.find(e=>e.event==='approved_execution_started');assert.equal(approved.transport,'HOSTINGER_LOCAL');assert.equal(approved.approvalReference,approvalId)
   assert.equal((await admin.query('SHOW TABLES'))[0].length,32);assert.equal((await admin.query('SELECT COUNT(*) AS n FROM schema_migrations'))[0][0].n,'85');assert.equal((await admin.query('SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'))[0][0].n,'46')
  })
  await t.test('local operator retains advisory lock exclusion',async()=>{
   const c=await admin.getConnection(),name='magicreview:migrate:'+createHash('sha256').update(database).digest('hex').slice(0,40)
   try{await c.execute('SELECT GET_LOCK(?,0)',[name]);await failure(pre,/LOCK_UNAVAILABLE/)}finally{await c.execute('SELECT RELEASE_LOCK(?)',[name]);c.release()}
  })
  await t.test('separate runtime profile and read-only diagnostic do not claim TLS',async()=>{
   await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[runtimeUser,runtimePassword]);for(const [table,privileges]of Object.entries(runtimePrivileges))await fixture.admin.query('GRANT '+privileges.join(',')+' ON '+quote(database)+'.'+quote(table)+" TO ?@'localhost'",[runtimeUser])
   const runtimePolicy={...policy,expectedAccount:runtimeUser+'@localhost',allowedTriggerDefiners:[migrationUser+'@localhost']},file=join(directory,'runtime.json');await writeFile(file,JSON.stringify(runtimePolicy));const checked=JSON.parse((await run(['check-runtime','--target',file,'--environment','production'],{...common,MIGRATION_DB_USER:runtimeUser,MIGRATION_DB_PASSWORD:runtimePassword})).stdout);assert.equal(checked.encrypted,false)
   const env={...common,DB_NAME:database,DB_USER:runtimeUser,DB_PASSWORD:runtimePassword,CORS_ORIGINS:'https://web.example.invalid',PUBLIC_WEB_ORIGIN:'https://web.example.invalid',PUBLIC_FUNNEL_ORIGIN:'https://api.example.invalid',AUTH_RECOVERY_URL:'https://web.example.invalid/recover',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),AUTH_SMTP_HOST:'localhost',AUTH_SMTP_PORT:'465',AUTH_SMTP_USER:'synthetic',AUTH_SMTP_PASSWORD:randomBytes(24).toString('hex'),AUTH_MAIL_FROM:'sender@example.invalid'}
   const diagnostic=JSON.parse((await execute(process.execPath,['dist/db/diagnostic-cli.js','--confirm-read-only'],{cwd,env,timeout:15000})).stdout);assert.equal(diagnostic.encrypted,false);assert.equal(diagnostic.status,'connected');assert.equal(diagnostic.transport,'unencrypted_loopback');assert.equal(diagnostic.schemaAndGrantsVerified,false)
   const runtime=pool(runtimeUser,runtimePassword);await assert.rejects(runtime.query('ALTER TABLE users ADD COLUMN forbidden_test INT'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR')
  })
  await t.test('actual local-mode server preserves MFA, RBAC, recovery consumption and graceful shutdown',async()=>{
   const password=randomBytes(24).toString('hex'),email='owner-local@example.invalid';await bootstrapPlatform(admin,{platformName:'Synthetic local platform',email,displayName:'Synthetic owner',password})
   const portReservation=createServer();portReservation.listen(0,'127.0.0.1');await once(portReservation,'listening');const port=portReservation.address().port;await new Promise(r=>portReservation.close(r))
   const env={...common,DB_NAME:database,DB_USER:runtimeUser,DB_PASSWORD:runtimePassword,HOST:'127.0.0.1',PORT:String(port),CORS_ORIGINS:'https://web.example.invalid',PUBLIC_WEB_ORIGIN:'https://web.example.invalid',PUBLIC_FUNNEL_ORIGIN:'https://api.example.invalid',AUTH_RECOVERY_URL:'https://web.example.invalid/recover',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),AUTH_SMTP_HOST:'localhost',AUTH_SMTP_PORT:'465',AUTH_SMTP_USER:'synthetic',AUTH_SMTP_PASSWORD:randomBytes(24).toString('hex'),AUTH_MAIL_FROM:'sender@example.invalid'}
   const child=spawn(process.execPath,['--input-type=module','-e',"import './dist/server.js';process.on('message',()=>{process.disconnect();process.emit('SIGTERM')})"],{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});let output='',errors='';child.stderr.on('data',b=>{errors+=b});const started=performance.now()
   try{
    await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));child.stdout.on('data',b=>{output+=b;if(output.includes('Backend listening'))resolve()})});t.diagnostic('HOSTINGER_LOCAL local spawn-to-listen milliseconds: '+Math.round(performance.now()-started));assert.match(errors,/"encrypted":false/);assert.ok(!errors.includes(runtimePassword));const base='http://127.0.0.1:'+port
    assert.equal((await fetch(base+'/health')).status,200);assert.equal((await fetch(base+'/ready')).status,200);assert.equal((await fetch(base+'/api/v1/tenants')).status,401)
    const post=(path,body,token)=>fetch(base+'/api/v1'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)})
    const challenge=await (await post('/auth/login',{email,password})).json();assert.equal(challenge.mfaRequired,true);assert.equal(challenge.accessToken,undefined);assert.equal((await fetch(base+'/api/v1/tenants',{headers:{Authorization:'Bearer '+challenge.challengeToken}})).status,401)
    const enrollment=await post('/auth/mfa/enrollment',{challengeToken:challenge.challengeToken});assert.equal(enrollment.status,200);const otp=authenticator(Buffer.from(await enrollment.arrayBuffer()));const activatedResponse=await post('/auth/mfa/activate',{challengeToken:challenge.challengeToken,code:otp.generate()});assert.equal(activatedResponse.status,200);const activated=await activatedResponse.json();assert.ok(activated.accessToken);assert.equal((await fetch(base+'/api/v1/tenants',{headers:{Authorization:'Bearer '+activated.accessToken}})).status,403)
    const [[membership]]=await admin.query("SELECT id FROM tenant_memberships WHERE tenant_kind='platform'");const selected=await (await post('/auth/select-tenant',{membershipId:membership.id},activated.accessToken)).json();assert.equal((await fetch(base+'/api/v1/tenants',{headers:{Authorization:'Bearer '+selected.accessToken}})).status,200)
    assert.equal((await post('/auth/logout',{},selected.accessToken)).status,204);assert.equal((await fetch(base+'/api/v1/auth/me',{headers:{Authorization:'Bearer '+selected.accessToken}})).status,401)
    const next=await (await post('/auth/login',{email,password})).json();assert.equal((await post('/auth/mfa/verify',{challengeToken:next.challengeToken,code:activated.recoveryCodes[0]})).status,200);const again=await (await post('/auth/login',{email,password})).json();assert.equal((await post('/auth/mfa/verify',{challengeToken:again.challengeToken,code:activated.recoveryCodes[0]})).status,401)
    const stopped=once(child,'exit');child.send('shutdown');assert.equal((await stopped)[0],0)
   }finally{if(child.exitCode===null)child.kill()}
  })
  await t.test('local acknowledgement does not override wrong database account identity',async()=>{
   const file=join(directory,'wrong-account.json');await writeFile(file,JSON.stringify({...policy,expectedAccount:'wrong@localhost'}));await failure(['preflight','--target',file,'--environment','production'],/UNEXPECTED_DATABASE_TARGET/)
  })
 }finally{for(const session of sessions)session.destroy();await Promise.all(pools.map(p=>p.end()));await fixture.close()}
})
