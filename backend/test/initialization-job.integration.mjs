import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdtemp,writeFile,readFile,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {targetPolicy} from '../dist/migrations/operator.js'
import {digest} from '../dist/migrations/schema.js'
import {wildcardReleaseFingerprint} from '../dist/migrations/hostinger-wildcard.js'
import {createDatabasePool} from '../dist/db/pool.js'
import {configuredAuth} from '../dist/auth/configuration.js'
import express from 'express'
import {createServer,request} from 'node:https'
import {once} from 'node:events'
import {createHash} from 'node:crypto'
import {initializationRoutes} from '../dist/setup/http.js'
import {certificate} from './tls-fixture.mjs'

test('HTTPS setup dispatches explicit jobs through real operator and bootstrap CLIs on disposable MariaDB',{timeout:90000},async()=>{
 const fixture=await startDisposableMariaDB(),database='magicreview_migration_job',user='job_migration',password=randomBytes(32).toString('hex'),ownerPassword=randomBytes(24).toString('base64')
 const q=s=>'`'+s.replaceAll('`','``')+'`',state=await mkdtemp(join(tmpdir(),'magicreview-job-integration-')),tls=await certificate()
 let pool
 try{
  await fixture.admin.query(`CREATE DATABASE ${q(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  const [rows]=await fixture.admin.query("SELECT Db FROM mysql.db WHERE User='PUBLIC' AND Db LIKE 'test%'")
  for(const row of rows)await fixture.admin.query('REVOKE ALL PRIVILEGES ON '+q(row.Db)+'.* FROM PUBLIC')
  await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[user,password])
  await fixture.admin.query(`GRANT SELECT,CREATE,ALTER,TRIGGER ON ${q(database.replaceAll('_','\\_'))}.* TO ?@'localhost'`,[user])
  for(const table of ['schema_migrations','industry_channels','roles','permissions','role_permissions'])await fixture.admin.query(`GRANT CREATE,INSERT${table==='schema_migrations'?',UPDATE':''} ON ${q(database)}.${q(table)} TO ?@'localhost'`,[user])
  const policy=targetPolicy.parse({environment:'local',host:'127.0.0.1',port:fixture.options.port,database,serverHostname:(await fixture.admin.query('SELECT @@hostname AS h'))[0][0].h,expectedAccount:user+'@localhost'})
  const targetFile=join(state,'target.json');await writeFile(targetFile,JSON.stringify(policy))
  const releaseFingerprint=await wildcardReleaseFingerprint(),env={MIGRATION_DB_USER:user,MIGRATION_DB_PASSWORD:password}
  async function job(action,p=policy,inputs=env){
   const target=action==='bootstrap'?join(state,'bootstrap-target.json'):targetFile
   if(action==='bootstrap')await writeFile(target,JSON.stringify(p))
   const file=join(state,action+'-job.json');await writeFile(file,JSON.stringify({action,targetFile:target,stateDirectory:state,releaseFingerprint,operatorReference:'TEST-ONLY-OPERATOR',recoveryReference:'TEST-ONLY-RECOVERY',confirmation:`INITIALIZE:${action}:${digest(p)}`}))
   const token=randomBytes(32).toString('base64url'),app=express()
   app.use(initializationRoutes({...inputs,INITIALIZATION_HTTP_ENABLED:'OWNER_APPROVED_MANUAL_SETUP',INITIALIZATION_JOB_FILE:file,INITIALIZATION_TOKEN_SHA256:createHash('sha256').update(token).digest('hex'),INITIALIZATION_EXPIRES_AT:new Date(Date.now()+60000).toISOString()}))
   const server=createServer({key:tls.privateKey,cert:tls.ca},app);server.listen(0,'127.0.0.1');await once(server,'listening')
   try{
    const status=await new Promise((done,fail)=>{const req=request({host:'127.0.0.1',port:server.address().port,servername:'localhost',ca:tls.ca,path:'/internal/initialization',method:'POST',headers:{Authorization:'Bearer '+token}},res=>{res.resume();res.on('end',()=>done(res.statusCode))});req.on('error',fail);req.end()})
    if(status!==200)throw Error('Guarded HTTPS setup refused')
   }finally{await new Promise(r=>server.close(r))}
  }
  await job('preflight');assert.equal(JSON.parse(await readFile(join(state,'preflight.json'))).pending.length,85)
  assert.equal(Number((await fixture.admin.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[database]))[0][0].n),0)
  await job('apply');await assert.rejects(job('apply'))
  assert.equal(Number((await fixture.admin.query(`SELECT COUNT(*) AS n FROM ${q(database)}.schema_migrations WHERE status='applied'`))[0][0].n),85)
  assert.equal(Number((await fixture.admin.query('SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?',[database]))[0][0].n),46)
  const bootstrap={...policy,expectedAccount:'root@localhost',allowedTriggerDefiners:[user+'@localhost']}
  // No email input: the configured fixed owner must flow through job and CLI.
  const email='rxadmin@revexoe.com'
  const inputs={BOOTSTRAP_DB_USER:'root',BOOTSTRAP_DB_PASSWORD:fixture.options.password,BOOTSTRAP_PLATFORM_NAME:'Synthetic local job',BOOTSTRAP_OWNER_NAME:'Synthetic local owner',BOOTSTRAP_OWNER_PASSWORD:ownerPassword}
  await job('bootstrap',bootstrap,inputs);await assert.rejects(job('bootstrap',bootstrap,inputs))
  pool=createDatabasePool({DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:database,DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:1})
  const auth=configuredAuth(pool,{NODE_ENV:'test',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:email})
  await assert.rejects(auth.login(email,'wrong'),e=>e.status===401)
  const login=await auth.login(email,ownerPassword);assert.ok(login.accessToken);assert.equal(login.mfaRequired,undefined)
  const principal=await auth.authenticate(login.accessToken),me=await auth.me(principal),selected=await auth.selectTenant(principal,me.memberships[0].membershipId)
  assert.equal((await auth.authenticate(selected.accessToken)).membership.roleCode,'super_admin')
  for(const file of await readdir(state)){const text=await readFile(join(state,file),'utf8');assert.equal(text.includes(ownerPassword)||text.includes(password)||text.includes(fixture.options.password),false,'Private job artifacts must not contain credentials')}
 }finally{await pool?.end();await fixture.close()}
})
