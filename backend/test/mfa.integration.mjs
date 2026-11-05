import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {authenticator} from './mfa-fixtures.mjs'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {AuthService} from '../dist/auth/service.js'
import {hashPassword} from '../dist/auth/passwords.js'
import {AccessTokens,tokenDigest,opaqueToken} from '../dist/auth/tokens.js'
import {TenantService} from '../dist/tenants/service.js'

test('MFA real factors and sessions on disposable MariaDB 11.8.9',{timeout:120000},async t=>{
 const fixture=await startDisposableMariaDB(),connections=new Set(),key=randomBytes(32),mfaKey=randomBytes(32),password=randomBytes(24).toString('base64url')
 await fixture.admin.query('CREATE DATABASE magicreview_migration_mfa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 const pool=createDatabasePool({DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_mfa',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:5});pool.on('connection',c=>connections.add(c))
 const q=async(sql,args=[]) => (await pool.execute(sql,args))[0]
 const insert=async(table,values)=>String((await q(`INSERT INTO ${table} (${Object.keys(values).join(',')}) VALUES (${Object.keys(values).map(()=>'?').join(',')})`,Object.values(values))).insertId)
 const auth=new AuthService(pool,key,undefined,undefined,mfaKey),tenants=new TenantService(pool,auth)
 let user,mid,challenge,otp,active,codes,merchant,enrollmentCode
 const email='platform-mfa@example.invalid'
 try{
  await runMigrations(pool,await loadMigrations(new URL('../migrations/',import.meta.url)),'up')
  const root=await insert('tenants',{public_id:randomBytes(16),kind:'platform',name:'MFA fixture'})
  const encoded=await hashPassword(password)
  async function account(address,tenant,kind,role){const id=await insert('users',{public_id:randomBytes(16),email:address,email_key:Buffer.from(address),display_name:'Synthetic MFA user',password_hash:encoded,status:'active',email_verified_at:new Date()});const membership=await insert('tenant_memberships',{tenant_id:tenant,tenant_kind:kind,user_id:id,role_id:(await q('SELECT id FROM roles WHERE code=?',[role]))[0].id,status:'active'});return {id,membership}}
  const created=await account(email,root,'platform','super_admin');user=created.id;mid=created.membership
  await t.test('password login returns only a restricted challenge; access and refresh denied',async()=>{
   challenge=await auth.login(email,password);assert.equal(challenge.mfaRequired,true);assert.equal(challenge.enrollmentRequired,true);assert.equal(challenge.accessToken,undefined);assert.equal(challenge.refreshToken,undefined)
   await assert.rejects(auth.authenticate(challenge.challengeToken));await assert.rejects(auth.refresh(challenge.challengeToken))
   const sid=(await q('SELECT id FROM auth_sessions WHERE token_hash=?',[tokenDigest(challenge.challengeToken)]))[0].id
   const forged=await new AccessTokens(key).issue({sub:user,sid,av:1,mid,amr:['pwd','mfa']});await assert.rejects(auth.authenticate(forged))
   await assert.rejects(tenants.withActor({identity:{sub:user,sid,av:1,mid,amr:['pwd','mfa']}},async()=>{}))
  })
  await t.test('QR enrollment is private, encrypted at rest, pending until a valid code',async()=>{
   const [png,again]=await Promise.all([auth.enrollMfa(challenge.challengeToken),auth.enrollMfa(challenge.challengeToken)]);assert.deepEqual(png,again);assert.equal(png.subarray(1,4).toString(),'PNG');otp=authenticator(png)
   assert.equal(otp.issuer,'MagicReview AI');assert.equal(otp.digits,6);assert.equal(otp.period,30)
   const row=(await q('SELECT * FROM user_mfa WHERE user_id=?',[user]))[0];assert.equal(row.enabled_at,null);assert.ok(!row.pending_cipher.includes(Buffer.from(otp.secret.base32)))
   let invalid='000000';while(otp.validate({token:invalid,window:1})!==null)invalid=String(Number(invalid)+1).padStart(6,'0');await assert.rejects(auth.verifyMfa(challenge.challengeToken,invalid,true));assert.equal((await q('SELECT failed_attempts FROM user_mfa WHERE user_id=?',[user]))[0].failed_attempts,1)
   enrollmentCode=otp.generate();active=await auth.verifyMfa(challenge.challengeToken,enrollmentCode,true);codes=[...active.recoveryCodes];assert.equal(codes.length,10);assert.ok(await auth.authenticate(active.accessToken));await assert.rejects(auth.verifyMfa(challenge.challengeToken,otp.generate(),true))
   assert.equal((await q('SELECT COUNT(*) AS n FROM mfa_recovery_codes WHERE user_id=? AND consumed_at IS NULL',[user]))[0].n,'10')
   assert.ok((await q('SELECT code_hash FROM mfa_recovery_codes WHERE user_id=?',[user])).every(r=>r.code_hash.length===32&&!codes.includes(r.code_hash.toString())))
  })
  await t.test('TOTP replay rejected, recovery single-use, and concurrent challenge consumption has one winner',async()=>{
   challenge=await auth.login(email,password);assert.equal(challenge.enrollmentRequired,false)
   await assert.rejects(auth.verifyMfa(challenge.challengeToken,enrollmentCode))
   active=await auth.verifyMfa(challenge.challengeToken,otp.generate({timestamp:Date.now()+30000}));assert.ok(await auth.authenticate(active.accessToken));challenge=await auth.login(email,password)
   const code=codes.shift(),outcomes=await Promise.allSettled([auth.verifyMfa(challenge.challengeToken,code),auth.verifyMfa(challenge.challengeToken,code)])
   assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);active=outcomes.find(r=>r.status==='fulfilled').value
   challenge=await auth.login(email,password);await assert.rejects(auth.verifyMfa(challenge.challengeToken,code))
   active=await auth.verifyMfa(challenge.challengeToken,codes.shift())
  })
  await t.test('rotation preserves MFA; refresh replay and logout revoke verified sessions',async()=>{
   const rotated=await auth.refresh(active.refreshToken);assert.equal((await auth.authenticate(rotated.accessToken)).identity.amr.length,2)
   await assert.rejects(auth.refresh(active.refreshToken));await assert.rejects(auth.authenticate(rotated.accessToken))
   challenge=await auth.login(email,password);active=await auth.verifyMfa(challenge.challengeToken,codes.shift());const principal=await auth.authenticate(active.accessToken);await auth.logout(principal);await assert.rejects(auth.authenticate(active.accessToken))
  })
  await t.test('persistent per-account MFA limit survives service restart and new challenges',async()=>{
   challenge=await auth.login(email,password);for(let i=0;i<5;i++)await assert.rejects(auth.verifyMfa(challenge.challengeToken,'invalid'))
   const restarted=new AuthService(pool,key,undefined,undefined,mfaKey),another=await restarted.login(email,password)
   await assert.rejects(restarted.verifyMfa(another.challengeToken,codes[0]),e=>e.status===429)
   // Test-only clock fixture: expire the lock without waiting fifteen minutes.
   await q('UPDATE user_mfa SET locked_until=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE user_id=?',[user]);active=await auth.verifyMfa(challenge.challengeToken,codes.shift())
  })
  await t.test('regeneration requires password and factor, invalidates old codes and all sessions',async()=>{
   const principal=await auth.authenticate(active.accessToken),old=[...codes]
   await assert.rejects(auth.manageMfa(principal,'incorrect',codes[0]))
   const result=await auth.manageMfa(principal,password,codes.shift());codes=result.recoveryCodes;await assert.rejects(auth.authenticate(active.accessToken))
   challenge=await auth.login(email,password);await assert.rejects(auth.verifyMfa(challenge.challengeToken,old[1]));active=await auth.verifyMfa(challenge.challengeToken,codes.shift())
  })
  await t.test('failure rolls back factor consumption, session issuance and audit atomically',async()=>{
   challenge=await auth.login(email,password);const code=codes.shift(),original=auth.response
   auth.response=async()=>{throw Error('Synthetic response-signing failure')}
   await assert.rejects(auth.verifyMfa(challenge.challengeToken,code));auth.response=original
   assert.equal((await q('SELECT consumed_at FROM mfa_recovery_codes WHERE user_id=? AND code_hash=?',[user,tokenDigest(code)]))[0].consumed_at,null)
   active=await auth.verifyMfa(challenge.challengeToken,code)
  })
  await t.test('non-platform compatibility, tenant/role denial, and late platform role elevation require MFA',async()=>{
   const tenant=await insert('tenants',{public_id:randomBytes(16),kind:'reseller',parent_id:root,parent_kind:'platform',name:'Reseller fixture'})
   merchant=await account('reseller-mfa@example.invalid',tenant,'reseller','reseller_admin');const login=await auth.login('reseller-mfa@example.invalid',password);assert.ok(login.accessToken);const principal=await auth.authenticate(login.accessToken)
   await assert.rejects(auth.selectTenant(principal,mid));await assert.rejects(auth.manageMfa(principal,password,codes[0]))
   await insert('tenant_memberships',{tenant_id:root,tenant_kind:'platform',user_id:merchant.id,role_id:(await q("SELECT id FROM roles WHERE code='super_admin'"))[0].id,status:'active'})
   await assert.rejects(auth.authenticate(login.accessToken));await assert.rejects(auth.refresh(login.refreshToken))
  })
  await t.test('password recovery revokes sessions without clearing MFA or bypassing the challenge',async()=>{
   const token=opaqueToken();await insert('auth_tokens',{user_id:user,purpose:'reset_password',token_hash:tokenDigest(token),expires_at:new Date(Date.now()+60000)});await auth.consumeToken(token,password,'reset_password');await assert.rejects(auth.authenticate(active.accessToken));assert.ok((await q('SELECT enabled_at FROM user_mfa WHERE user_id=?',[user]))[0].enabled_at);challenge=await auth.login(email,password);assert.equal(challenge.enrollmentRequired,false);active=await auth.verifyMfa(challenge.challengeToken,codes.shift())
  })
  await t.test('disable requires reauthentication, revokes sessions, next login requires enrollment again',async()=>{
   const principal=await auth.authenticate(active.accessToken)
   await auth.manageMfa(principal,password,codes.shift(),true);await assert.rejects(auth.authenticate(active.accessToken))
   challenge=await auth.login(email,password);assert.equal(challenge.enrollmentRequired,true);await assert.rejects(auth.verifyMfa(challenge.challengeToken,codes[0]))
   assert.equal((await q('SELECT enabled_at FROM user_mfa WHERE user_id=?',[user]))[0].enabled_at,null)
  })
  await t.test('expired challenges, missing encryption keys, and secret-free atomic audit events',async()=>{
   await q('UPDATE auth_sessions SET expires_at=DATE_ADD(created_at,INTERVAL 1 MICROSECOND) WHERE token_hash=?',[tokenDigest(challenge.challengeToken)]);await assert.rejects(auth.enrollMfa(challenge.challengeToken))
   await assert.rejects(new AuthService(pool,key).login(email,password),e=>e.status===503)
   const events=await q("SELECT action,outcome,safe_metadata FROM audit_logs WHERE action LIKE 'auth.mfa_%'");for(const action of ['auth.mfa_enabled','auth.mfa_recovery_used','auth.mfa_recovery_regenerated','auth.mfa_disabled','auth.mfa_rejected'])assert.ok(events.some(e=>e.action===action))
   assert.ok(events.filter(e=>e.action==='auth.mfa_rejected').every(e=>e.outcome==='denied'));assert.ok(events.filter(e=>e.action==='auth.mfa_recovery_used').length>=4)
   const serialized=JSON.stringify(events);assert.ok(!serialized.includes(otp.secret.base32));assert.ok(!serialized.includes(password));for(const code of codes)assert.ok(!serialized.includes(code))
  })
 }finally{for(const c of connections)c.destroy();await new Promise(r=>setImmediate(r));await pool.end();await fixture.close()}
})
