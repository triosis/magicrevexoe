import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createServer, createSecureContext, TLSSocket } from 'node:tls'
import { createServer as netServer } from 'node:net'
import { certificate } from './tls-fixture.mjs'
import { startDisposableMariaDB } from './mariadb-fixture.mjs'
import { createDatabasePool } from '../dist/db/pool.js'
import { configuredSmtp } from '../dist/auth/smtp.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import {verifyDatabase} from '../dist/db/diagnostic.js'

test('verified runtime database TLS on disposable MariaDB 11.8.9', { timeout: 120000 }, async t => {
  const cert = await certificate(), wrong = await certificate('other.invalid')
  const fixture = await startDisposableMariaDB(cert), pools = [], sessions = new Set()
  const env = { NODE_ENV: 'test', DB_HOST: 'localhost', DB_PORT: fixture.options.port, DB_USER: 'root', DB_PASSWORD: fixture.options.password, DB_CONNECTION_LIMIT: 1, DB_TLS_MODE: 'required', DB_TLS_CA_FILE: cert.cert, DB_TLS_CA_SHA256: cert.digest }
  const pool = values => { const p = createDatabasePool({ ...env, ...values }); p.on('connection', c => sessions.add(c)); pools.push(p); return p }
  try {
    await t.test('approved CA and matching DNS establish encrypted SQL connection', async () => {
      const p = pool({}), [[version]] = await p.query('SELECT VERSION() AS v')
      assert.match(version.v, /^11\.8\.9/)
      const [rows] = await p.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")
      assert.ok(rows[0].Value)
    })
    await t.test('read-only diagnostic uses verified TLS and confirms the supported engine',async()=>{
      const result=await verifyDatabase({...env,NODE_ENV:'production',DB_NAME:'information_schema'})
      assert.deepEqual(result,{status:'verified',encrypted:true,engine:'MariaDB',series:'11.8',readOnlyProbe:true,schemaAndGrantsVerified:false})
    })
    await t.test('production diagnostic CLI validates full configuration and redacts failed credentials',async()=>{
      const system=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(key.toUpperCase())))
      const {randomBytes}=await import('node:crypto')
      const configuration={...system,...env,NODE_ENV:'production',DB_NAME:'information_schema',CORS_ORIGINS:'https://web.example.invalid',PUBLIC_WEB_ORIGIN:'https://web.example.invalid',PUBLIC_FUNNEL_ORIGIN:'https://api.example.invalid',AUTH_RECOVERY_URL:'https://web.example.invalid/recover',AUTH_ACCESS_SECRET:randomBytes(32).toString('base64'),AUTH_MFA_KEY:randomBytes(32).toString('base64'),AUTH_SMTP_HOST:'localhost',AUTH_SMTP_PORT:'465',AUTH_SMTP_USER:'synthetic',AUTH_SMTP_PASSWORD:randomBytes(24).toString('hex'),AUTH_MAIL_FROM:'sender@example.invalid'}
      const options={cwd:fileURLToPath(new URL('..',import.meta.url)),env:Object.fromEntries(Object.entries(configuration).map(([k,v])=>[k,String(v)]))}
      const execute=promisify(execFile)
      const {stdout,stderr}=await execute(process.execPath,['dist/db/diagnostic-cli.js','--confirm-read-only'],options)
      assert.equal(JSON.parse(stdout).status,'verified');assert.equal(stderr,'')
      await assert.rejects(execute(process.execPath,['dist/db/diagnostic-cli.js','--confirm-read-only'],{...options,env:{...options.env,DB_PASSWORD:'synthetic-invalid-credential-9283'}}),error=>{
        assert.equal(error.code,1);assert.equal(error.stdout,'');assert.equal(JSON.parse(error.stderr).status,'failed')
        for(const value of [configuration.DB_PASSWORD,configuration.AUTH_ACCESS_SECRET,configuration.AUTH_MFA_KEY,'synthetic-invalid-credential-9283'])assert.ok(!error.stderr.includes(value))
        return true
      })
    })
    await t.test('untrusted certificate rejected', async () => {
      await assert.rejects(pool({ DB_TLS_CA_FILE: wrong.cert, DB_TLS_CA_SHA256: wrong.digest }).query('SELECT 1'))
    })
    await t.test('trusted certificate with wrong hostname rejected', async () => {
      // Same loopback host, valid chain but deliberately different server SAN.
      // A separate server presents that wrong SAN; no DNS or external connection.
      const other = await startDisposableMariaDB(wrong)
      try { await assert.rejects(pool({ DB_PORT: other.options.port, DB_PASSWORD: other.options.password, DB_TLS_CA_FILE: wrong.cert, DB_TLS_CA_SHA256: wrong.digest }).query('SELECT 1'), /hostname|altnames|certificate/i) }
      finally { await other.close() }
    })
  } finally { for (const session of sessions) session.destroy(); await Promise.all(pools.map(p => p.end())); await fixture.close() }
})

test('local SMTP STARTTLS upgrades before authentication and refuses plaintext fallback', { timeout: 15000 }, async () => {
  const cert = await certificate(), context = createSecureContext({ cert: cert.ca, key: cert.privateKey }), sockets = new Set()
  let upgraded = false, auth = 0, allowTls = true
  function secured(socket) {
    sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket))
    let buffer = ''
    socket.on('data', chunk => {
      buffer += chunk.toString()
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end+2)
        if (line.startsWith('EHLO')) socket.write('250-local\r\n250 AUTH PLAIN\r\n')
        else if (line.startsWith('AUTH')) { auth++; socket.write('235 authenticated\r\n') }
        else if (line === 'QUIT') socket.end('221 bye\r\n')
      }
    })
  }
  const server = netServer(socket => {
    sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket))
    socket.write('220 local SMTP\r\n')
    const plaintext = chunk => {
      const line = chunk.toString()
      if (line.startsWith('EHLO')) socket.write('250-local\r\n250 STARTTLS\r\n')
      else if (line.startsWith('STARTTLS')) {
        if (!allowTls) { socket.write('454 TLS unavailable\r\n'); return }
        socket.removeListener('data', plaintext)
        socket.write('220 upgrade\r\n', () => { upgraded = true; secured(new TLSSocket(socket, { isServer: true, secureContext: context })) })
      } else if (line.startsWith('AUTH')) assert.fail('Credentials sent before TLS')
    }
    socket.on('data', plaintext)
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const smtp = configuredSmtp({ AUTH_SMTP_HOST: '127.0.0.1', AUTH_SMTP_TLS_SERVERNAME: 'localhost', AUTH_SMTP_PORT: String(server.address().port), AUTH_SMTP_SECURITY: 'starttls', AUTH_SMTP_USER: 'synthetic', AUTH_SMTP_PASSWORD: 'synthetic-only', AUTH_MAIL_FROM: 'test@example.invalid', AUTH_RECOVERY_URL: 'https://example.invalid/recover', AUTH_SMTP_CA_FILE: cert.cert, AUTH_SMTP_CA_SHA256: cert.digest })
  try { await smtp.verify(); assert.equal(upgraded, true); assert.equal(auth, 1); allowTls = false; await assert.rejects(smtp.verify()); assert.equal(auth, 1) }
  finally { smtp.close(); for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)) }
})

test('local TLS SMTP diagnostics and single-attempt delivery', { timeout: 60000 }, async t => {
  const cert = await certificate(), sockets = new Set()
  let accepted = 0, reject = false, disconnect = false
  const server = createServer({ cert: cert.ca, key: cert.privateKey }, socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {})
    socket.write('220 local test SMTP\r\n')
    let buffer = '', data = false
    socket.on('data', chunk => {
      buffer += chunk.toString()
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end+2)
        if (data) { if (line === '.') { data = false; accepted++; if (disconnect) socket.destroy(); else socket.write('250 accepted\r\n') } continue }
        if (/^EHLO/.test(line)) socket.write('250-local\r\n250 AUTH PLAIN\r\n')
        else if (/^AUTH/.test(line)) socket.write('235 authenticated\r\n')
        else if (/^MAIL/.test(line)) socket.write('250 ok\r\n')
        else if (/^RCPT/.test(line)) socket.write(reject ? '550 rejected\r\n' : '250 ok\r\n')
        else if (line === 'DATA') { data = true; socket.write('354 continue\r\n') }
        else if (line === 'QUIT') socket.end('221 bye\r\n')
        else socket.write('250 ok\r\n')
      }
    })
  })
  server.on('tlsClientError', () => {})
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const environment = { AUTH_SMTP_HOST: '127.0.0.1', AUTH_SMTP_TLS_SERVERNAME: 'localhost', AUTH_SMTP_PORT: String(server.address().port), AUTH_SMTP_SECURITY: 'implicit', AUTH_SMTP_USER: 'synthetic', AUTH_SMTP_PASSWORD: 'synthetic-only', AUTH_MAIL_FROM: 'test@example.invalid', AUTH_RECOVERY_URL: 'https://example.invalid/recover', AUTH_SMTP_CA_FILE: cert.cert, AUTH_SMTP_CA_SHA256: cert.digest }
  const smtp = configuredSmtp(environment)
  try {
    await t.test('verify authenticates without sending mail', async () => { await smtp.verify(); assert.equal(accepted, 0) })
    await t.test('explicit operator CLI verifies without mail or sensitive output', async () => {
      const { stdout, stderr } = await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../dist/auth/smtp-cli.js', import.meta.url))], { env: { ...process.env, ...environment }, windowsHide: true })
      assert.match(stdout, /mailbox delivery unverified/); assert.equal(stderr, ''); assert.equal(accepted, 0)
      for (const value of [environment.AUTH_SMTP_PASSWORD, environment.AUTH_SMTP_USER, environment.AUTH_MAIL_FROM, environment.AUTH_RECOVERY_URL, cert.cert]) assert.equal(stdout.includes(value), false)
    })
    await t.test('one accepted invitation', async () => { await smtp.send({ email: 'recipient@example.invalid', token: 'synthetic-token', purpose: 'invite' }); assert.equal(accepted, 1) })
    await t.test('recipient rejection sanitized and not retried', async () => { reject = true; await assert.rejects(smtp.send({ email: 'recipient@example.invalid', token: 'secret-marker', purpose: 'reset_password' }), /^Error: Account email delivery failed; acceptance may be unknown$/); assert.equal(accepted, 1); reject = false })
    await t.test('lost acknowledgement never triggers automatic duplicate delivery', async () => { disconnect = true; await assert.rejects(smtp.send({ email: 'recipient@example.invalid', token: 'secret-marker', purpose: 'invite' })); assert.equal(accepted, 2) })
    await t.test('untrusted CA is rejected', async () => { const untrusted = configuredSmtp({ ...environment, AUTH_SMTP_CA_FILE: undefined, AUTH_SMTP_CA_SHA256: undefined }); try { await assert.rejects(untrusted.verify(), /transport verification failed/) } finally { untrusted.close() } })
    await t.test('wrong SMTP certificate identity is rejected', async () => { const mismatch = configuredSmtp({ ...environment, AUTH_SMTP_TLS_SERVERNAME: 'other.invalid' }); try { await assert.rejects(mismatch.verify(), /transport verification failed/) } finally { mismatch.close() } })
  } finally { smtp.close(); for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)) }
})
