import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {reviewHostingerLocalTransport,proposedApprovalAcknowledgement} from '../proposals/hostinger-local-transport.mjs'
import {validateEnvironment} from '../dist/config/env.js'
import {databaseTls} from '../dist/db/pool.js'
import {configuredAuth} from '../dist/auth/configuration.js'
const candidate={NODE_ENV:'production',DB_TLS_MODE:'HOSTINGER_LOCAL',DB_HOST:'127.0.0.1',DB_PORT:'3306',HOSTINGER_LOCAL_APPROVAL:proposedApprovalAcknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:'SYNTHETIC-TEST-REVIEW'}
test('review-only policy records the exact loopback proposal and explicit acknowledgement',()=>{
 const decision=reviewHostingerLocalTransport(candidate);assert.equal(decision.host,'127.0.0.1');assert.equal(decision.port,3306);assert.equal(decision.proposalOnly,true);assert.equal(decision.requiresSeparateOwnerReleaseApproval,true);assert.ok(Object.isFrozen(decision))
})
test('proposed plaintext transport rejects every nonliteral host and alternate port',()=>{
 for(const host of ['localhost','::1','127.0.0.2','127.1','2130706433','0x7f000001','127.0.0.1.evil.invalid','db.example.invalid','10.0.0.1','0.0.0.0','127.0.0.1 ',''])assert.throws(()=>reviewHostingerLocalTransport({...candidate,DB_HOST:host}))
 for(const port of [undefined,'','3307','03306','3306.0',' 3306',3306])assert.throws(()=>reviewHostingerLocalTransport({...candidate,DB_PORT:port}))
})
test('proposal cannot infer approval from default, truthy or partial fields',()=>{
 for(const key of ['NODE_ENV','DB_TLS_MODE','HOSTINGER_LOCAL_APPROVAL','HOSTINGER_LOCAL_APPROVAL_ID'])assert.throws(()=>reviewHostingerLocalTransport({...candidate,[key]:undefined}))
 for(const acknowledgement of ['true','1','approved','',proposedApprovalAcknowledgement+' '])assert.throws(()=>reviewHostingerLocalTransport({...candidate,HOSTINGER_LOCAL_APPROVAL:acknowledgement}))
 for(const mode of ['required','disabled','hostinger_local',undefined])assert.throws(()=>reviewHostingerLocalTransport({...candidate,DB_TLS_MODE:mode}))
})
test('proposal refuses mixed CA settings, including empty values',()=>{
 for(const key of ['DB_TLS_CA_FILE','DB_TLS_CA_SHA256'])for(const value of ['',null,'REPLACE_WITH_CA','a'.repeat(64)])assert.throws(()=>reviewHostingerLocalTransport({...candidate,[key]:value}))
})
test('implemented local transport still rejects incomplete production security configuration',()=>{
 const env={...candidate,CORS_ORIGINS:'https://web.example.invalid',DB_NAME:'synthetic',DB_USER:'synthetic',DB_PASSWORD:randomBytes(24).toString('hex')};assert.throws(()=>validateEnvironment(env),/production environment variables/);assert.equal(databaseTls(env),undefined)
})
test('local acknowledgement cannot disable or supply a fallback for verified TLS',()=>{
 assert.throws(()=>databaseTls({...candidate,DB_TLS_MODE:'required'}),/DNS hostname/);
 assert.throws(()=>databaseTls({...candidate,DB_TLS_MODE:'required',DB_HOST:'db.example.invalid'}),/approved TLS CA/);
 assert.throws(()=>databaseTls({...candidate,DB_TLS_MODE:'disabled'}),/TLS configuration/)
})
test('operator acknowledgement does not relax access-secret or MFA validators',()=>{
 assert.throws(()=>configuredAuth({},candidate),/Missing authentication/);
 const access=randomBytes(32).toString('base64'),mfa=randomBytes(32).toString('base64');
 assert.throws(()=>configuredAuth({},{...candidate,AUTH_ACCESS_SECRET:'weak',AUTH_MFA_KEY:mfa}),/AUTH_ACCESS_SECRET/);
 assert.throws(()=>configuredAuth({},{...candidate,AUTH_ACCESS_SECRET:access}),/AUTH_MFA_KEY/);
 assert.throws(()=>configuredAuth({},{...candidate,AUTH_ACCESS_SECRET:access,AUTH_MFA_KEY:access}),/AUTH_MFA_KEY/);
 assert.ok(configuredAuth({},{...candidate,AUTH_ACCESS_SECRET:access,AUTH_MFA_KEY:mfa}))
})

test('live development/test pools reject remote plaintext as well as production',()=>{
 for(const NODE_ENV of ['development','test',undefined])for(const DB_HOST of ['db.example.invalid','10.0.0.1','127.0.0.2','localhost','127.0.0.1.evil.invalid'])assert.throws(()=>databaseTls({NODE_ENV,DB_HOST,DB_TLS_MODE:'disabled'}),/literal loopback/);
 assert.equal(databaseTls({NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_TLS_MODE:'disabled'}),undefined);
 assert.equal(databaseTls({NODE_ENV:'test',DB_HOST:'::1',DB_TLS_MODE:'disabled'}),undefined)
})
