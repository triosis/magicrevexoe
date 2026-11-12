import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {createDatabasePool,createReadinessCheck} from '../dist/db/pool.js'
import {configuredAuth} from '../dist/auth/configuration.js'
import {createApp} from '../dist/app.js'

test('empty database login fails explicitly without leaking credentials or initializing schema',{timeout:30000},async()=>{
 const fixture=await startDisposableMariaDB(),database='magicreview_migration_empty_login',password=randomBytes(24).toString('base64url'),logs=[],original=console.error
 let pool,server
 try{
  await fixture.admin.query('CREATE DATABASE '+database+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:database,DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:2}
  pool=createDatabasePool(env)
  const auth=configuredAuth(pool,{NODE_ENV:'test',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:'rxadmin@revexoe.com'})
  console.error=(...args)=>logs.push(args.join(' '))
  server=createServer(createApp({env,auth,checkDatabase:createReadinessCheck(pool),isShuttingDown:()=>false}));server.listen(0,'127.0.0.1');await once(server,'listening')
  const base='http://127.0.0.1:'+server.address().port
  for(const email of ['rxadmin@revexoe.com','unknown@example.invalid']){
   const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})
   assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store')
   assert.deepEqual(await response.json(),{error:'Service setup is incomplete. Contact the administrator.',code:'APPLICATION_SCHEMA_UNAVAILABLE'})
  }
  assert.equal(logs.length,2);assert.ok(logs.every(line=>line.includes('ER_NO_SUCH_TABLE')&&!line.includes(database)&&!line.includes(password)&&!line.includes('rxadmin')&&!line.includes(fixture.options.password)))
  assert.equal((await fetch(base+'/health')).status,200)
  // Readiness is intentionally connection-only, not proof of initialized schema.
  assert.equal((await fetch(base+'/ready')).status,200)
  assert.equal(Number((await fixture.admin.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[database]))[0][0].n),0)
 }finally{console.error=original;if(server)await new Promise(r=>server.close(r));await pool?.end();await fixture.close()}
})
