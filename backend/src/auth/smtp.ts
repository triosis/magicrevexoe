import { createTransport } from 'nodemailer'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { approvedCa } from '../config/tls.js'
import type { TokenDelivery } from './service.js'

const schema = z.object({
  AUTH_SMTP_HOST: z.string().regex(/^[a-zA-Z0-9.-]+$/),
  AUTH_SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  AUTH_SMTP_SECURITY: z.enum(['implicit', 'starttls']).optional(),
  AUTH_SMTP_TLS_SERVERNAME: z.string().regex(/^[a-zA-Z0-9.-]+$/).optional(),
  AUTH_SMTP_USER: z.string().min(1), AUTH_SMTP_PASSWORD: z.string().min(1),
  AUTH_MAIL_FROM: z.string().email(),
  AUTH_RECOVERY_URL: z.string().url().refine(value => {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search
  }),
})

export function configuredSmtp(environment: NodeJS.ProcessEnv) {
  const names = [...Object.keys(schema.shape), 'AUTH_SMTP_CA_FILE', 'AUTH_SMTP_CA_SHA256']
  if (!names.some(name => environment[name] !== undefined)) return undefined
  const parsed = schema.safeParse(environment)
  if (!parsed.success) throw Error('Invalid authentication email configuration')
  const settings = parsed.data
  const security = settings.AUTH_SMTP_SECURITY ?? (settings.AUTH_SMTP_PORT === 465 ? 'implicit' : settings.AUTH_SMTP_PORT === 587 ? 'starttls' : undefined)
  if (!security) throw Error('Custom SMTP ports require AUTH_SMTP_SECURITY')
  const ca = environment.AUTH_SMTP_CA_FILE || environment.AUTH_SMTP_CA_SHA256 ? approvedCa(environment.AUTH_SMTP_CA_FILE, environment.AUTH_SMTP_CA_SHA256) : undefined
  const transport = createTransport({
    host: settings.AUTH_SMTP_HOST, port: settings.AUTH_SMTP_PORT, secure: security === 'implicit', requireTLS: true,
    auth: { user: settings.AUTH_SMTP_USER, pass: settings.AUTH_SMTP_PASSWORD },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', ...(settings.AUTH_SMTP_TLS_SERVERNAME ? { servername: settings.AUTH_SMTP_TLS_SERVERNAME } : {}), ...(ca ? { ca } : {}) },
    logger: false, debug: false, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  })
  // Never log native error/message/response objects, recipients, credentials or tokens.
  function result(operation: 'verify' | 'delivery', status: 'verified' | 'accepted' | 'failed', started: number, error?: unknown) {
    const raw = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    const code = typeof raw === 'string' && ['EAUTH', 'ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS', 'EENVELOPE', 'EMESSAGE', 'ETLS'].includes(raw) ? raw : status === 'failed' ? 'UNKNOWN' : 'OK'
    console.info(JSON.stringify({ event: `smtp.${operation}`, id: randomUUID(), status, code, durationMs: Date.now() - started }))
  }
  const verify = async () => {
    const started = Date.now()
    try { if (await transport.verify() !== true) throw Error(); result('verify', 'verified', started) }
    catch (error) { result('verify', 'failed', started, error); throw Error('Account email transport verification failed') }
  }
  const send: TokenDelivery = async message => {
    const started = Date.now()
    try {
      const url = new URL(settings.AUTH_RECOVERY_URL)
      url.hash = new URLSearchParams({ token: message.token, purpose: message.purpose }).toString()
      // One attempt only. A lost DATA acknowledgement is ambiguous; automatic retry can duplicate mail.
      const delivered = await transport.sendMail({ from: settings.AUTH_MAIL_FROM, to: message.email,
        subject: message.purpose === 'invite' ? 'MagicReview AI account invitation' : 'MagicReview AI account recovery',
        text: `Use this single-use link to continue: ${url.toString()}\nIf you did not request this, ignore this message.` })
      if (!delivered.accepted?.length || delivered.rejected?.length) throw Error()
      result('delivery', 'accepted', started)
    } catch (error) { result('delivery', 'failed', started, error); throw Error('Account email delivery failed; acceptance may be unknown') }
  }
  return { verify, send, close: () => transport.close() }
}
