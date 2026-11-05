import { createServer } from 'node:http'
import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createDatabasePool, createReadinessCheck } from './db/pool.js'
import { configuredAuth } from './auth/configuration.js'
import { TenantService } from './tenants/service.js'
import { BusinessService } from './business/service.js'
import { FunnelService } from './funnels/service.js'
import { FeedbackService } from './feedback/service.js'
import {SubscriptionService} from './subscriptions/service.js'
import {CatalogService} from './subscriptions/catalog.js'
import {configuredClaude} from './ai/provider.js'
import {DraftService} from './ai/service.js'
import {BillingService} from './billing/service.js'
import {configuredRazorpay} from './billing/provider.js'

async function main() {
  const env = loadEnv()
  const pool = createDatabasePool(env)
  let shuttingDown = false
  const auth=configuredAuth(pool,process.env)
  const tenants=auth?new TenantService(pool,auth,auth.invitationDelivery()):undefined
  const business=auth&&tenants?new BusinessService(tenants,auth):undefined
  const funnels=auth&&tenants?new FunnelService(pool,tenants,auth,process.env.PUBLIC_FUNNEL_ORIGIN,process.env.PUBLIC_WEB_ORIGIN):undefined
  const feedback=auth&&tenants&&funnels?new FeedbackService(tenants,auth,funnels):undefined
  const subscriptions=tenants?new SubscriptionService(tenants):undefined
  const catalog=tenants?new CatalogService(tenants):undefined
  const provider=configuredClaude(process.env)
  const drafts=funnels&&auth?new DraftService(funnels,auth,provider):undefined
  const paymentProvider=configuredRazorpay(process.env)
  const billing=tenants&&subscriptions?new BillingService(pool,tenants,subscriptions,paymentProvider):undefined
  const app = createApp({ env, checkDatabase: createReadinessCheck(pool), isShuttingDown: () => shuttingDown, auth,tenants,business,funnels,feedback,subscriptions,catalog,drafts,billing })
  const server = createServer(app)
  server.requestTimeout = 30_000
  server.headersTimeout = 15_000
  server.keepAliveTimeout = 5000

  async function shutdown(reason: string, exitCode = 0) {
    if (shuttingDown) return
    shuttingDown = true
    process.exitCode = exitCode
    console.info(`Backend shutting down (${reason}).`)
    const deadline = setTimeout(() => {
      console.error('Shutdown deadline exceeded; forcing exit.')
      server.closeAllConnections()
      process.exit(1)
    }, 10_000)
    try {
      // Drain active HTTP requests before closing connections they may be using.
      await new Promise<void>(resolve => { server.close(() => resolve()) })
      await pool.end()
    } catch {
      console.error('Backend resource cleanup failed.')
      process.exitCode = 1
    } finally { clearTimeout(deadline) }
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
  server.on('error', () => { console.error('HTTP server failed to start or run; check HOST and PORT.'); void shutdown('HTTP error', 1) })
  server.listen(env.PORT, env.HOST, () => {
    console.info(`Backend listening on ${env.HOST}:${env.PORT}; database readiness is checked separately.`)
  })
}

main().catch(error => {
  // Configuration errors contain variable names only, never their values.
  console.error(error instanceof Error ? error.message : 'Backend startup failed.')
  process.exitCode = 1
})
