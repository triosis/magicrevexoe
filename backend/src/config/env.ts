import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

// Resolve only the backend .env, regardless of the process working directory.
// Host-provided environment variables retain priority over the local file.

const required = z.string().min(1).refine(value => !value.startsWith('REPLACE_WITH_'))
const integer = (fallback: number, max: number) => z.coerce.number().int().min(1).max(max).default(fallback)
const origins = z.string().min(1).transform(value => value.split(',').map(origin => origin.trim()))
  .refine(values => values.every(origin => {
    try {
      const url = new URL(origin)
      return ['http:', 'https:'].includes(url.protocol) && url.origin === origin
    } catch { return false }
  }))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: integer(3001, 65535),
  CORS_ORIGINS: origins,
  DB_HOST: required,
  DB_PORT: integer(3306, 65535),
  DB_NAME: required,
  DB_USER: required,
  DB_PASSWORD: required,
  DB_CONNECTION_LIMIT: integer(5, 50),
  DB_TLS_MODE: z.enum(['disabled', 'required']).optional(),
  DB_TLS_CA_FILE: z.string().min(1).optional(),
  DB_TLS_CA_SHA256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
})

export type Env = z.infer<typeof schema>

export function loadEnv(): Env {
  // Production uses the service manager's environment, never a local credential file.
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })
  }
  return validateEnvironment(process.env)
}

export function validateEnvironment(environment: NodeJS.ProcessEnv): Env {
  const result = schema.safeParse(environment)
  if (!result.success) {
    // Never include input values: they may contain credentials.
    const fields = [...new Set(result.error.issues.map(issue => issue.path.join('.')))]
    throw new Error(`Missing or invalid environment variables: ${fields.join(', ')}. Check backend/.env.example; numeric values must be positive integers within their limits and CORS_ORIGINS must contain exact HTTP(S) origins.`)
  }
  if (result.data.NODE_ENV === 'production') {
    const fields: string[] = []
    for (const name of ['PUBLIC_FUNNEL_ORIGIN', 'PUBLIC_WEB_ORIGIN']) {
      try { const url = new URL(environment[name] ?? ''); if (url.protocol !== 'https:' || url.origin !== environment[name]) fields.push(name) } catch { fields.push(name) }
    }
    if (result.data.CORS_ORIGINS.some(origin => !origin.startsWith('https://')) || !result.data.CORS_ORIGINS.includes(environment.PUBLIC_WEB_ORIGIN ?? '')) fields.push('CORS_ORIGINS')
    if (environment.AUTH_RECOVERY_URL !== `${environment.PUBLIC_WEB_ORIGIN}/recover`) fields.push('AUTH_RECOVERY_URL')
    if (result.data.DB_TLS_MODE === 'disabled') fields.push('DB_TLS_MODE')
    for (const name of ['DB_TLS_CA_FILE', 'DB_TLS_CA_SHA256', 'AUTH_ACCESS_SECRET', 'AUTH_MFA_KEY', 'AUTH_SMTP_HOST', 'AUTH_SMTP_PORT', 'AUTH_SMTP_USER', 'AUTH_SMTP_PASSWORD', 'AUTH_MAIL_FROM', 'AUTH_RECOVERY_URL']) {
      if (!environment[name] || environment[name]?.startsWith('REPLACE_WITH_')) fields.push(name)
    }
    if (result.data.DB_PASSWORD.length < 16 || new Set(result.data.DB_PASSWORD).size < 8) fields.push('DB_PASSWORD')
    const smtpPassword = environment.AUTH_SMTP_PASSWORD ?? ''
    if (smtpPassword.length < 16 || new Set(smtpPassword).size < 8) fields.push('AUTH_SMTP_PASSWORD')
    if (fields.length) throw Error(`Missing or invalid production environment variables: ${[...new Set(fields)].join(', ')}`)
  }
  return result.data
}
