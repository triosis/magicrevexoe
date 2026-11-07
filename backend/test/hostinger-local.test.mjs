import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {databaseTransport,hostingerLocalAcknowledgement} from '../dist/config/database-transport.js'
import {validateEnvironment} from '../dist/config/env.js'
import {databaseTls} from '../dist/db/pool.js'
import {configuredAuth} from '../dist/auth/configuration.js'
import {targetPolicy,operatorTransport,operatorMigrations,verifyTarget} from '../dist/migrations/operator.js'
const approvalId='TEST-ONLY-LOCAL-IMPLEMENTATION'
const local={NODE_ENV:'production',DB_TLS_MODE:'HOSTINGER_LOCAL',DB_HOST:'127.0.0.1',DB_PORT:'3306',HOSTINGER_LOCAL_APPROVAL:hostingerLocalAcknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:approvalId}
const env={...local,CORS_ORIGINS:'https://web.example.invalid',PUBLIC_WEB_ORIGIN:'https://web.example.invalid',PUBLIC_FUNNEL_ORIGIN:'https://api.example.invalid',AUTH_RECOVERY_URL:'https://web.example.invalid/recover',DB_NAME:'test_only',DB_USER:'test_only',DB_PASSWORD:randomBytes(24).toString('hex'),AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),AUTH_SMTP_HOST:'localhost',AUTH_SMTP_PORT:'465',AUTH_SMTP_USER:'synthetic',AUTH_SMTP_PASSWORD:randomBytes(24).toString('hex'),AUTH_MAIL_FROM:'sender@example.invalid'}
const policy=()=>targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,database:'test_only',serverHostname:'test-instance',expectedAccount:'test@localhost',transport:'HOSTINGER_LOCAL',hostingerLocalApprovalId:approvalId})
const approval={acknowledgement:hostingerLocalAcknowledgement,approvalId}
test('explicit complete local environment validates without dummy CA and retains auth/MFA configuration',()=>{
 const parsed=validateEnvironment(env);assert.equal(databaseTransport(parsed).mode,'HOSTINGER_LOCAL');assert.equal(databaseTls(parsed),undefined);assert.ok(configuredAuth({},env));for(const name of ['AUTH_ACCESS_SECRET','AUTH_MFA_KEY','AUTH_SMTP_PASSWORD'])assert.throws(()=>validateEnvironment({...env,[name]:undefined}));assert.throws(()=>configuredAuth({},{...env,AUTH_MFA_KEY:env.AUTH_ACCESS_SECRET}),/AUTH_MFA_KEY/)
})
test('local runtime rejects alternate literal/remote hosts and noncanonical or omitted ports',()=>{
 for(const DB_HOST of ['localhost','::1','127.0.0.2','127.1','2130706433','127.0.0.1.evil.invalid','10.0.0.1','127.0.0.1 '])assert.throws(()=>validateEnvironment({...env,DB_HOST}));for(const DB_PORT of [undefined,'','3307','03306','3306.0',' 3306'])assert.throws(()=>validateEnvironment({...env,DB_PORT}));assert.throws(()=>databaseTransport({...local,DB_PORT:3307}))
})
test('local runtime refuses absent/wrong acknowledgement, placeholder approval and mixed CA',()=>{
 for(const HOSTINGER_LOCAL_APPROVAL of [undefined,'true','approved',hostingerLocalAcknowledgement+' '])assert.throws(()=>validateEnvironment({...env,HOSTINGER_LOCAL_APPROVAL}));for(const HOSTINGER_LOCAL_APPROVAL_ID of [undefined,'','short','REPLACE_WITH_RECORD','bad\nreference'])assert.throws(()=>validateEnvironment({...env,HOSTINGER_LOCAL_APPROVAL_ID}));for(const name of ['DB_TLS_CA_FILE','DB_TLS_CA_SHA256'])for(const value of ['', 'a'.repeat(64)])assert.throws(()=>validateEnvironment({...env,[name]:value}))
})
test('acknowledgement never changes required/default TLS mode or permits remote disabled transport',()=>{
 assert.throws(()=>validateEnvironment({...env,DB_TLS_MODE:undefined}),/DB_TLS_CA/);assert.throws(()=>databaseTls({...env,DB_TLS_MODE:'required'}),/DNS hostname/);assert.throws(()=>databaseTls({...env,DB_TLS_MODE:'required',DB_HOST:'db.example.invalid'}),/approved TLS CA/);for(const NODE_ENV of ['production','development','test'])assert.throws(()=>databaseTls({...env,NODE_ENV,DB_HOST:'remote.example.invalid',DB_TLS_MODE:'disabled'}));assert.throws(()=>databaseTransport({...local,DB_TLS_MODE:'unrecognised'}))
})
test('operator local target requires exact production endpoint, approval reference and no CA',()=>{
 const p=policy();assert.equal(operatorTransport(p,approval).mode,'HOSTINGER_LOCAL');for(const change of [{host:'localhost'},{host:'::1'},{host:'remote.invalid'},{port:3307},{environment:'local'},{environment:'staging'},{hostingerLocalApprovalId:undefined},{tlsCaFile:'unused.pem'},{tlsCaSha256:'a'.repeat(64)}])assert.equal(targetPolicy.safeParse({...p,...change}).success,false);assert.equal(targetPolicy.safeParse({...p,transport:undefined}).success,false)
})
test('operator refuses absent or mismatched acknowledgement before acquiring a connection',async()=>{
 const pool={getConnection(){throw Error('should not connect')}};const p=policy();for(const supplied of [undefined,{approvalId,acknowledgement:'true'},{...approval,approvalId:'TEST-OTHER-RECORD'}])await assert.rejects(operatorMigrations(pool,[],{},p,'preflight',{localTransportApproval:supplied}));await assert.rejects(verifyTarget({},p),/APPROVAL_MISMATCH/)
})
test('transport selection does not waive independent production migration confirmation',async()=>{
 await assert.rejects(operatorMigrations({},[],{},policy(),'apply',{localTransportApproval:approval}),/PRODUCTION_CONFIRMATION/)
})
