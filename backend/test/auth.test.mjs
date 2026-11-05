import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {SignJWT} from 'jose'
import {hashPassword,verifyPassword} from '../dist/auth/passwords.js'
import {AccessTokens,identifier,opaqueToken,tokenDigest} from '../dist/auth/tokens.js'
import {RateLimiter} from '../dist/auth/routes.js'
import {configuredAuth} from '../dist/auth/configuration.js'

test('Argon2id uses unique salts and rejects wrong passwords and invalid encodings',async()=>{
 const password=randomBytes(24).toString('base64url')
 const first=await hashPassword(password),second=await hashPassword(password)
 assert.match(first,/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);assert.notEqual(first,second)
 assert.equal(await verifyPassword(first,password),true);assert.equal(await verifyPassword(first,'incorrect'),false)
 assert.equal(await verifyPassword(null,password),false);assert.equal(await verifyPassword('bad-hash',password),false)
})

test('access JWTs enforce signature, issuer, audience, expiry and password-only assurance',async()=>{
 const key=randomBytes(32),tokens=new AccessTokens(key)
 const identity={sub:'9007199254740993',sid:'2',av:1,amr:['pwd']}
 const issued=await tokens.issue(identity);assert.deepEqual(await tokens.verify(issued),identity)
 await assert.rejects(new AccessTokens(randomBytes(32)).verify(issued))
 for(const [issuer,audience,expiration] of [['wrong','magicreview-client','5m'],['magicreview-api','wrong','5m'],['magicreview-api','magicreview-client','-1s']]){
  const invalid=await new SignJWT(identity).setProtectedHeader({alg:'HS256',typ:'at+jwt'}).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expiration).setJti('fixture').sign(key)
  await assert.rejects(tokens.verify(invalid))
 }
 const opaque=opaqueToken();assert.equal(opaque.length,43);assert.equal(tokenDigest(opaque).length,32)
 assert.equal(identifier.safeParse('18446744073709551616').success,false)
 assert.equal(identifier.safeParse('9007199254740993').success,true)
 assert.equal(identifier.safeParse('1 OR 1=1').success,false)
})

test('rate limiting bounds memory, expires windows and fails closed at capacity',()=>{
 let now=100
 const limiter=new RateLimiter(()=>now,2)
 limiter.consume('login-a',1,100);assert.throws(()=>limiter.consume('login-a',1,100),/Too many/)
 limiter.consume('login-b',1,100);assert.throws(()=>limiter.consume('login-c',1,100),/Too many/)
 now=201;assert.doesNotThrow(()=>limiter.consume('login-c',1,100))
})

test('auth is unavailable without a configured signing key; malformed secrets fail safely',()=>{
 assert.equal(configuredAuth({},{}),undefined)
 assert.throws(()=>configuredAuth({},{AUTH_ACCESS_SECRET:'private-invalid-value'}),error=>error.message==='Invalid AUTH_ACCESS_SECRET configuration')
 assert.throws(()=>configuredAuth({},{AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_SMTP_HOST:'fixture.invalid'}),/Invalid authentication email configuration/)
 assert.throws(()=>configuredAuth({},{NODE_ENV:'production'}),/Missing authentication configuration/)
 const key=randomBytes(32).toString('base64')
 assert.throws(()=>configuredAuth({},{NODE_ENV:'production',AUTH_ACCESS_SECRET:key}),/Missing AUTH_MFA_KEY/)
 assert.throws(()=>configuredAuth({},{AUTH_ACCESS_SECRET:Buffer.alloc(32).toString('base64')}),/Invalid AUTH_ACCESS_SECRET/)
 assert.throws(()=>configuredAuth({},{AUTH_ACCESS_SECRET:key,AUTH_MFA_KEY:key}),/Invalid AUTH_MFA_KEY/)
 assert.throws(()=>configuredAuth({},{AUTH_ACCESS_SECRET:key,AUTH_MFA_KEY:Buffer.alloc(32).toString('base64')}),/Invalid AUTH_MFA_KEY/)
 assert.ok(configuredAuth({},{NODE_ENV:'production',AUTH_ACCESS_SECRET:key,AUTH_MFA_KEY:randomBytes(32).toString('base64')}))
})
