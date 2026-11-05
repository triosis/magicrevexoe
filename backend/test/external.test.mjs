import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { validateEnvironment } from '../dist/config/env.js'
import { databaseTls } from '../dist/db/pool.js'
import { configuredAuth } from '../dist/auth/configuration.js'
import { configuredSmtp } from '../dist/auth/smtp.js'
import { productionApi } from '../../scripts/frontend-config.mjs'
import { destinationInput } from '../dist/business/validation.js'

const env = { NODE_ENV: 'production', CORS_ORIGINS: 'https://revexoe.com', DB_HOST: 'db.example.invalid', DB_NAME: 'synthetic', DB_USER: 'synthetic', DB_PASSWORD: randomBytes(24).toString('hex'), DB_TLS_CA_FILE: 'synthetic.pem', DB_TLS_CA_SHA256: 'a'.repeat(64), AUTH_ACCESS_SECRET: randomBytes(32).toString('base64'), AUTH_MFA_KEY: randomBytes(32).toString('base64'), PUBLIC_FUNNEL_ORIGIN: 'https://api.revexoe.com', PUBLIC_WEB_ORIGIN: 'https://revexoe.com', AUTH_SMTP_HOST: 'smtp.example.invalid', AUTH_SMTP_PORT: '465', AUTH_SMTP_USER: 'synthetic', AUTH_SMTP_PASSWORD: 'synthetic-only', AUTH_MAIL_FROM: 'sender@example.invalid', AUTH_RECOVERY_URL: 'https://revexoe.com/recover' }
test('production configuration requires secrets, SMTP, HTTPS origins and verified DB TLS', () => {
  env.AUTH_SMTP_PASSWORD = randomBytes(24).toString('hex')
  assert.equal(validateEnvironment(env).PORT, 3001)
  for (const name of ['AUTH_ACCESS_SECRET', 'AUTH_MFA_KEY', 'AUTH_SMTP_HOST', 'DB_TLS_CA_FILE', 'PUBLIC_FUNNEL_ORIGIN', 'PUBLIC_WEB_ORIGIN']) assert.throws(() => validateEnvironment({ ...env, [name]: undefined }), new RegExp(name))
  for (const overrides of [{ DB_PASSWORD: 'weak' }, { DB_TLS_MODE: 'disabled' }, { CORS_ORIGINS: 'http://revexoe.com' }, { PUBLIC_WEB_ORIGIN: 'https://revexoe.com/path' }]) assert.throws(() => validateEnvironment({ ...env, ...overrides }))
  for (const overrides of [{ AUTH_ACCESS_SECRET: 'weak' }, { AUTH_MFA_KEY: env.AUTH_ACCESS_SECRET }]) assert.throws(() => configuredAuth({}, { ...env, ...overrides }), /configuration/)
})
test('database TLS refuses insecure production, IP literals and unapproved CA', () => {
  assert.equal(databaseTls({ NODE_ENV: 'test', DB_HOST: '127.0.0.1' }), undefined)
  assert.throws(() => databaseTls({ NODE_ENV: 'production', DB_TLS_MODE: 'disabled' }), /TLS/)
  assert.throws(() => databaseTls({ ...env, DB_HOST: '127.0.0.1' }), /DNS/)
  assert.throws(() => databaseTls(env), /approved TLS CA/)
})
test('SMTP rejects partial configuration and ambiguous custom transport security', () => {
  assert.equal(configuredSmtp({}), undefined)
  assert.throws(() => configuredSmtp({ AUTH_SMTP_HOST: 'synthetic' }), /configuration/)
  assert.throws(() => configuredSmtp({ ...env, AUTH_SMTP_PORT: '2525' }), /SECURITY/)
  assert.throws(() => configuredSmtp({ ...env, AUTH_RECOVERY_URL: 'http://example.invalid' }), /configuration/)
})
test('production frontend public configuration rejects missing, HTTP and secret-prefixed variables', () => {
  assert.deepEqual(productionApi({ VITE_API_URL: 'https://api.revexoe.com/api/v1' }), { apiOrigin: 'https://api.revexoe.com' })
  for (const value of [undefined, 'http://localhost/api/v1', 'https://api.revexoe.com/api/v1?secret=value', 'https://user:pass@api.revexoe.com/api/v1']) assert.throws(() => productionApi({ VITE_API_URL: value }))
  assert.throws(() => productionApi({ VITE_API_URL: 'https://api.revexoe.com/api/v1', VITE_SECRET: 'do-not-expose' }))
})
test('Google destination has one canonical URL and never accepts unsafe redirects', () => {
  const url = 'https://search.google.com/local/writereview?placeid=synthetic_ID'
  assert.equal(destinationInput('synthetic_ID', url), url)
  for (const unsafe of ['javascript:alert(1)', 'https://evil.invalid', url+'&redirect=https://evil.invalid', 'https://search.google.com.evil.invalid']) assert.throws(() => destinationInput('synthetic_ID', unsafe))
  assert.throws(() => destinationInput('../unsafe'))
})
