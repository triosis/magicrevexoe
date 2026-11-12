import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createServer} from 'node:https'
import {once} from 'node:events'
import {createServer as vite} from 'vite'
import {chromium,expect} from '@playwright/test'
import {startDisposableMariaDB} from '../backend/test/mariadb-fixture.mjs'
import {certificate} from '../backend/test/tls-fixture.mjs'
import {createDatabasePool,createReadinessCheck} from '../backend/dist/db/pool.js'
import {loadMigrations,runMigrations} from '../backend/dist/migrations/runner.js'
import {bootstrapPlatform} from '../backend/dist/setup/bootstrap.js'
import {platformOwnerEmail} from '../backend/dist/config/platform-owner.js'
import {configuredAuth} from '../backend/dist/auth/configuration.js'
import {TenantService} from '../backend/dist/tenants/service.js'
import {createApp} from '../backend/dist/app.js'

// Synthetic fixture only: no dotenv, remote database input or production request.
test('fixed owner real browser password login and protected dashboard',{timeout:90000},async()=>{
 const fixture=await startDisposableMariaDB(),tls=await certificate(),connections=new Set()
 let pool,backend,frontend,browser
 try{
  const database='magicreview_migration_browser_owner',password=randomBytes(24).toString('base64url')
  await fixture.admin.query('CREATE DATABASE '+database+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const env={NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:database,DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5}
  pool=createDatabasePool(env);pool.on('connection',c=>connections.add(c))
  await runMigrations(pool,await loadMigrations(new URL('../backend/migrations/',import.meta.url)),'up')
  assert.equal((await bootstrapPlatform(pool,{platformName:'Synthetic browser owner',email:platformOwnerEmail,displayName:'Synthetic owner',password})).created,true)
  const auth=configuredAuth(pool,{NODE_ENV:'test',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:platformOwnerEmail})
  backend=createServer({key:tls.privateKey,cert:tls.ca});backend.listen(0,'127.0.0.1');await once(backend,'listening')
  const api='https://127.0.0.1:'+backend.address().port
  const oldApi=process.env.VITE_API_URL
  process.env.VITE_API_URL=api+'/api/v1'
  try{frontend=await vite({envDir:false,server:{host:'127.0.0.1',port:0,https:{key:tls.privateKey,cert:tls.ca}}});await frontend.listen()}
  finally{if(oldApi===undefined)delete process.env.VITE_API_URL;else process.env.VITE_API_URL=oldApi}
  const web='https://127.0.0.1:'+frontend.httpServer.address().port;env.CORS_ORIGINS=[web]
  backend.on('request',createApp({env,auth,tenants:new TenantService(pool,auth),checkDatabase:createReadinessCheck(pool),isShuttingDown:()=>false}))
  browser=await chromium.launch({channel:'chrome',headless:true})
  // Self-signed certificates are confined to newly generated loopback fixtures.
  const context=await browser.newContext({ignoreHTTPSErrors:true})
  const external=[],errors=[]
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(true);return route.abort()})
  const page=await context.newPage();page.on('pageerror',()=>errors.push(true))
  await page.goto(web+'/app');await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()
  await page.getByLabel('Email',{exact:true}).fill(platformOwnerEmail)
  await page.getByLabel('Password',{exact:true}).fill('synthetic-wrong-password')
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByText('Invalid credentials',{exact:true})).toBeVisible()
  await page.getByLabel('Password',{exact:true}).fill(password)
  const selected=page.waitForResponse(r=>r.url()===api+'/api/v1/auth/select-tenant'&&r.request().method()==='POST')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect(page).toHaveURL(web+'/app');await expect(page.getByRole('heading',{name:'Super Admin overview',exact:true})).toBeVisible()
  await expect(page.getByRole('img',{name:'Private MFA enrollment QR'})).toHaveCount(0)
  const token=(await(await selected).json()).accessToken,principal=await auth.authenticate(token)
  assert.equal(principal.membership.roleCode,'super_admin');assert.deepEqual(principal.identity.amr,['pwd'])
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()
  await assert.rejects(auth.authenticate(token),e=>e.status===401)
  await page.goto(web+'/app');await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()
  assert.equal(external.length,0);assert.equal(errors.length,0)
 }finally{await browser?.close();await frontend?.close();if(backend)await new Promise(r=>backend.close(r));for(const c of connections)c.destroy();await pool?.end();await fixture.close()}
})
