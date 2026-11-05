import { configuredSmtp } from './smtp.js'

// Explicit operator command. Does not load .env, connect to the DB, or send mail.
let smtp: ReturnType<typeof configuredSmtp>
try {
  smtp = configuredSmtp(process.env)
  if (!smtp) throw Error()
  await smtp.verify()
  console.info('SMTP connection, TLS and authentication verified; mailbox delivery unverified.')
} catch {
  console.error('SMTP verification failed. Check protected configuration, certificate trust and provider access.')
  process.exitCode = 1
} finally { smtp?.close() }
