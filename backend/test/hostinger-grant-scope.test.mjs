import assert from 'node:assert/strict'
import {test} from 'node:test'
import {inspectCloudGrants} from '../dist/migrations/cloud-startup.js'
import {inspectGrants} from '../dist/migrations/privileges.js'

// Public target identifiers supplied by the owner; no connection or secret data.
const database='u676472791_magicreview_db',account='`u676472791_magicrev_user`@`127.0.0.1`'
const usage='GRANT USAGE ON *.* TO '+account
const raw='GRANT ALL PRIVILEGES ON `'+database+'`.* TO '+account
const exact='GRANT ALL PRIVILEGES ON `'+database.replaceAll('_','\\_')+'`.* TO '+account

test('Hostinger formatting with unescaped underscores stays blocked, not normalized to exact scope',()=>{
 for(const profile of ['initial-maintenance','runtime-dbwide'])assert.throws(()=>inspectCloudGrants([usage,raw],database,profile),/CLOUD_STARTUP_GRANT_SCOPE_MISMATCH/)
 assert.ok(inspectCloudGrants([usage,exact],database,'initial-maintenance'))
 assert.throws(()=>inspectCloudGrants([usage,exact],database,'runtime-dbwide'),/CLOUD_STARTUP_INVALID_PRIVILEGE_SET/)
 for(const profile of ['migration','runtime'])assert.throws(()=>inspectGrants([usage,exact],database,profile))
})
test('Cloud exact scope never admits percent patterns, similar literals, unrelated authority or grant option',()=>{
 const scopes=['u676472791%','u676472791\\_magicreview%','u676472791XmagicreviewYdb','u676472791\\_magicreview\\_db_extra','other_schema']
 for(const scope of scopes)assert.throws(()=>inspectCloudGrants([usage,'GRANT ALL PRIVILEGES ON `'+scope+'`.* TO '+account],database,'initial-maintenance'),/CLOUD_STARTUP_GRANT_SCOPE_MISMATCH/)
 for(const bad of ['GRANT ALL PRIVILEGES ON *.* TO '+account,exact+' WITH GRANT OPTION','GRANT `some_role` TO '+account,exact.replace(' TO '+account,' TO PUBLIC')])assert.throws(()=>inspectCloudGrants([usage,bad],database,'initial-maintenance'))
})
test('fingerprint ignores synthetic authentication/time-limit suffixes and order but binds authority/profile',()=>{
 // Deliberately non-hash placeholder; never copy real SHOW GRANTS auth material.
 const decorated=usage+" IDENTIFIED VIA mysql_native_password USING 'SYNTHETIC_NOT_AN_AUTH_HASH' WITH MAX_STATEMENT_TIME 5"
 const expected=inspectCloudGrants([usage,exact],database,'initial-maintenance')
 assert.equal(inspectCloudGrants([exact,decorated],database,'initial-maintenance'),expected)
 assert.equal(inspectCloudGrants([exact,usage,exact],database,'initial-maintenance'),expected)
 const runtime=exact.replace('ALL PRIVILEGES','SELECT, INSERT, UPDATE, TRIGGER')
 assert.equal(inspectCloudGrants([decorated,runtime],database,'runtime-dbwide'),inspectCloudGrants([runtime,usage],database,'runtime-dbwide'))
 assert.notEqual(inspectCloudGrants([runtime],database,'runtime-dbwide'),expected)
})
