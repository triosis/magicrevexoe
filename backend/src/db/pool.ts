import { createPool } from 'mysql2/promise'
import type { Env } from '../config/env.js'
import { isIP } from 'node:net'
import { approvedCa } from '../config/tls.js'

export function databaseTls(env: Env) {
  const mode = env.DB_TLS_MODE ?? (env.NODE_ENV === 'production' ? 'required' : 'disabled')
  if (mode === 'disabled') {
    if (env.NODE_ENV === 'production' || env.DB_TLS_CA_FILE || env.DB_TLS_CA_SHA256) throw Error('Invalid database TLS configuration')
    return undefined
  }
  // mysql2 skips its explicit hostname check for IP literals. Require a DNS name.
  if (isIP(env.DB_HOST) || !/^[a-zA-Z0-9.-]+$/.test(env.DB_HOST)) throw Error('Verified database TLS requires a DNS hostname')
  return { ca: approvedCa(env.DB_TLS_CA_FILE, env.DB_TLS_CA_SHA256), rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' as const }
}

export function createDatabasePool(env: Env) {
  const ssl = databaseTls(env)
  return createPool({
    ...(ssl ? { ssl } : {}),
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    waitForConnections: false,
    connectTimeout: 3000,
    enableKeepAlive: true,
    charset: 'utf8mb4',
    timezone: 'Z',
    multipleStatements: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
  })
}

// Reuse any pending probe so repeated health requests cannot exhaust the pool.
export function createReadinessCheck(pool: ReturnType<typeof createDatabasePool>) {
  let pending: Promise<void> | undefined
  return async (): Promise<void> => {
    pending ??= pool.query({ sql: 'SELECT 1', timeout: 3000 })
      .then(() => undefined).finally(() => { pending = undefined })
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        pending,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Database readiness timeout')), 4000) }),
      ])
    } finally { clearTimeout(timer) }
  }
}
