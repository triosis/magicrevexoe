import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import type { Env } from './config/env.js'
import { errorHandler, HttpError } from './middleware/error-handler.js'
import { authRoutes } from './auth/routes.js'
import type { AuthService } from './auth/service.js'
import { tenantRoutes } from './tenants/routes.js'
import type { TenantService } from './tenants/service.js'
import { businessRoutes } from './business/routes.js'
import type { BusinessService } from './business/service.js'
import { funnelRoutes } from './funnels/routes.js'
import type { FunnelService } from './funnels/service.js'

type Dependencies = {
  env: Env
  isShuttingDown: () => boolean
  checkDatabase: () => Promise<void>
  auth?: AuthService | undefined
  tenants?: TenantService | undefined
  business?: BusinessService | undefined
  funnels?: FunnelService | undefined
}

// Only emit known driver codes and fixed descriptions. Driver messages can
// contain usernames, hostnames, database names, SQL, or other sensitive data.
const databaseFailures: Record<string, string> = {
  ER_ACCESS_DENIED_ERROR: 'Authentication failed; verify DB_USER, DB_PASSWORD and allowed connection host.',
  ER_DBACCESS_DENIED_ERROR: 'Database access denied; verify user assignment and database privileges.',
  ER_BAD_DB_ERROR: 'Database does not exist; verify the full DB_NAME.',
  ENOTFOUND: 'Database hostname could not be resolved; verify DB_HOST.',
  EAI_AGAIN: 'Database hostname resolution temporarily failed.',
  ECONNREFUSED: 'Database connection refused; verify DB_HOST, DB_PORT and service availability.',
  ETIMEDOUT: 'Database connection timed out; verify network access and database availability.',
  PROTOCOL_SEQUENCE_TIMEOUT: 'Database query timed out.',
  ER_CON_COUNT_ERROR: 'Database connection limit reached.',
}

export function safeDatabaseFailure(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  if (typeof code === 'string' && Object.hasOwn(databaseFailures, code)) {
    return `${code}: ${databaseFailures[code]}`
  }
  return 'UNKNOWN: Database readiness failed; no raw driver details logged.'
}

export function createApp({ env, isShuttingDown, checkDatabase, auth, tenants, business, funnels }: Dependencies) {
  let lastDatabaseFailure = ''
  let lastDatabaseFailureAt = 0
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({
    origin(origin, callback) {
      // No Origin header is normal for health probes and server-to-server calls.
      // CORS is a browser policy, not authentication or API authorization.
      if (!origin) { callback(null, false); return }
      if (env.CORS_ORIGINS.includes(origin)) { callback(null, true); return }
      callback(new HttpError(403, 'Origin is not allowed'))
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  }))
  app.use(express.json({ limit: '16kb' }))
  app.use('/api/v1/auth',authRoutes(auth))
  app.use('/api/v1/tenants',tenantRoutes(auth,tenants))
  app.use('/api/v1',funnelRoutes(auth,funnels))
  app.use('/api/v1',businessRoutes(auth,business))
  app.get('/health/live', (_request, response) => {
    response.set('Cache-Control', 'no-store').status(200).json({ status: 'alive' })
  })
  app.get('/health/ready', async (_request, response) => {
    response.set('Cache-Control', 'no-store')
    if (isShuttingDown()) {
      response.status(503).json({ status: 'not_ready', database: 'unchecked' })
      return
    }
    try {
      await checkDatabase()
      lastDatabaseFailure = ''
      response.status(isShuttingDown() ? 503 : 200).json({ status: isShuttingDown() ? 'not_ready' : 'ready', database: 'up' })
    } catch (error) {
      const failure = safeDatabaseFailure(error)
      if (failure !== lastDatabaseFailure || Date.now() - lastDatabaseFailureAt >= 30_000) {
        console.error(`Database readiness failed: ${failure}`)
        lastDatabaseFailure = failure
        lastDatabaseFailureAt = Date.now()
      }
      response.status(503).json({ status: 'not_ready', database: 'unavailable' })
    }
  })
  app.use((_request, _response, next) => next(new HttpError(404, 'Not found')))
  app.use(errorHandler)
  return app
}
