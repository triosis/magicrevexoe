import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {configuredAuth} from '../dist/auth/configuration.js'
test('password-only owner policy is explicit, exact and retains MFA key validation',()=>{
 const e={NODE_ENV:'test',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64')}
 assert.ok(configuredAuth({},e));assert.ok(configuredAuth({},{...e,AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:'rxadmin@revexoe.com'}))
 for(const v of ['','other@example.invalid','RXADMIN@REVEXOE.COM','rxadmin@revexoe.com '])assert.throws(()=>configuredAuth({},{...e,AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:v}),/Invalid AUTH_PASSWORD_ONLY/)
 assert.throws(()=>configuredAuth({},{...e,AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL:'rxadmin@revexoe.com',AUTH_MFA_KEY:'invalid'}),/AUTH_MFA_KEY/)
})
