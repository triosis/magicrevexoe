import {test} from 'node:test'
import assert from 'node:assert/strict'
import {hostingerWildcardPolicy,checkWildcardApproval,inspectWildcardGrants,wildcardDatabase,wildcardAccount,wildcardAcknowledgement,wildcardReleaseFingerprint} from '../dist/migrations/hostinger-wildcard.js'
import {targetPolicy,operatorMigrations} from '../dist/migrations/operator.js'
import {inspectGrants} from '../dist/migrations/privileges.js'
import {inspectCloudGrants} from '../dist/migrations/cloud-startup.js'
const all='GRANT ALL PRIVILEGES ON `'+wildcardDatabase+'`.* TO `u676472791_magicrev_user`@`127.0.0.1`'
const approval=()=>({phase:'initial',approvalId:'TEST-ONLY-WILDCARD',operatorReference:'TEST-ONLY-OPERATOR',recoveryReference:'TEST-ONLY-RECOVERY',runtimeApprovalReference:'TEST-ONLY-RUNTIME',grantFingerprint:inspectWildcardGrants([all],'initial'),manifestFingerprint:'a'.repeat(64),releaseFingerprint:'b'.repeat(64),notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),riskAcknowledgement:wildcardAcknowledgement})
const policy=()=>targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,database:wildcardDatabase,expectedAccount:wildcardAccount,serverHostname:'synthetic',transport:'HOSTINGER_LOCAL',hostingerLocalApprovalId:'TEST-ONLY-TRANSPORT',hostingerWildcard:approval()})
test('only reviewed global USAGE statement-time limit is accepted and fingerprint-bound',()=>{
 const usage='GRANT USAGE ON *.* TO `u676472791_magicrev_user`@`127.0.0.1`',limited=usage+' WITH MAX_STATEMENT_TIME 180.000000'
 assert.ok(inspectWildcardGrants([limited,all],'initial'))
 assert.notEqual(inspectWildcardGrants([limited,all],'initial'),inspectWildcardGrants([usage,all],'initial'))
 assert.ok(inspectWildcardGrants([usage+" IDENTIFIED BY PASSWORD '*synthetic' WITH MAX_STATEMENT_TIME 180.000000",all],'initial'))
 for(const suffix of [' WITH MAX_STATEMENT_TIME 0.000000',' WITH MAX_STATEMENT_TIME 180',' WITH MAX_STATEMENT_TIME 181.000000',' WITH MAX_STATEMENT_TIME 180.000000 WITH GRANT OPTION',' WITH MAX_USER_CONNECTIONS 5',' WITH MAX_STATEMENT_TIME 180.000000 MAX_QUERIES_PER_HOUR 10'])assert.throws(()=>inspectWildcardGrants([usage+suffix,all],'initial'))
 assert.throws(()=>inspectWildcardGrants([all+' WITH MAX_STATEMENT_TIME 180.000000'],'initial'))
})
test('wildcard authority is isolated from all original grant profiles',()=>{
 for(const phase of ['migration','runtime'])assert.throws(()=>inspectGrants([all],wildcardDatabase,phase))
 for(const phase of ['initial-maintenance','runtime-dbwide'])assert.throws(()=>inspectCloudGrants([all],wildcardDatabase,phase))
 assert.ok(inspectWildcardGrants([all],'initial'));assert.throws(()=>inspectWildcardGrants([all],'runtime'))
})
test('wildcard interpreter rejects extra grants, changed pattern/account, escalation, duplicate and unknown syntax',()=>{
 for(const extra of [all,'GRANT SELECT ON `other`.* TO `u676472791_magicrev_user`@`127.0.0.1`','GRANT SUPER ON *.* TO `u676472791_magicrev_user`@`127.0.0.1`','GRANT `role` TO `u676472791_magicrev_user`@`127.0.0.1`'])assert.throws(()=>inspectWildcardGrants([all,extra],'initial'))
 for(const line of [all.replace('magicreview_db','magicreview%'),all.replace('_magicreview','\\_magicreview'),all.replace('@`127.0.0.1`','@`localhost`'),all+' WITH GRANT OPTION',all.replace('ALL PRIVILEGES','SELECT'),all+' WITH MAX_USER_CONNECTIONS 5'])assert.throws(()=>inspectWildcardGrants([line],'initial'))
 const runtime=all.replace('ALL PRIVILEGES','SELECT, INSERT, UPDATE, TRIGGER');assert.ok(inspectWildcardGrants([runtime],'runtime'))
 assert.throws(()=>inspectWildcardGrants([runtime.replace('TRIGGER','TRIGGER, DELETE')],'runtime'))
})
test('wildcard approval requires independent selection, exact target, bounded window and nonplaceholder references',()=>{
 const p=policy();checkWildcardApproval(p,p.hostingerWildcard.approvalId,'initial')
 for(const id of [undefined,'TEST-ONLY-WRONG'])assert.throws(()=>checkWildcardApproval(p,id))
 for(const patch of [{host:'remote.invalid'},{database:'other'},{expectedAccount:'other@127.0.0.1'},{allowedTriggerDefiners:['other@127.0.0.1']}])assert.throws(()=>targetPolicy.parse({...p,...patch}))
 for(const patch of [{approvalId:'REPLACE_WITH_APPROVAL'},{riskAcknowledgement:'yes'},{notBefore:new Date(Date.now()+10000).toISOString()},{expiresAt:new Date(Date.now()-1).toISOString()},{expiresAt:new Date(Date.now()+7200000).toISOString()}])assert.throws(()=>targetPolicy.parse({...p,hostingerWildcard:{...p.hostingerWildcard,...patch}}))
 assert.throws(()=>checkWildcardApproval(p,p.hostingerWildcard.approvalId,'bootstrap'))
 assert.throws(()=>hostingerWildcardPolicy.parse({...approval(),skip:true}))
})
test('wildcard command mismatch, missing approval and release drift refuse before pool access',async()=>{
 const p=policy(),context={wildcardApprovalId:p.hostingerWildcard.approvalId}
 await assert.rejects(operatorMigrations({},[],{},p,'preflight'),/APPROVAL_REQUIRED/)
 await assert.rejects(operatorMigrations({},[],{},p,'verify-complete',context),/PHASE_MISMATCH/)
 await assert.rejects(operatorMigrations({},[],{},p,'preflight',context),/RELEASE_MISMATCH/)
 assert.match(await wildcardReleaseFingerprint(),/^[a-f0-9]{64}$/)
})
