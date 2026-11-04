import { z } from 'zod'
import { createDatabasePool } from '../db/pool.js'
import { loadMigrations, MigrationError, runMigrations } from './runner.js'

// Intentionally no dotenv or loadEnv: never inherit a production .env target.
const configuration = z.object({
  MIGRATION_DB_HOST: z.enum(['127.0.0.1','::1']),
  MIGRATION_DB_PORT: z.coerce.number().int().min(1).max(65535),
  MIGRATION_DB_NAME: z.string().regex(/^magicreview_migration_[a-z0-9_]+$/),
  MIGRATION_DB_USER: z.string().min(1),
  MIGRATION_DB_PASSWORD: z.string().min(1),
})

async function main() {
  const command = process.argv[2]
  if (!['status','up'].includes(command ?? '') || process.argv.length !== 3) throw new MigrationError('USAGE_MIGRATE_STATUS_OR_UP')
  const parsed = configuration.safeParse(process.env)
  if (!parsed.success) throw new MigrationError('INVALID_LOCAL_MIGRATION_CONFIGURATION')
  const config = parsed.data
  const migrations = await loadMigrations(new URL('../../migrations/', import.meta.url))
  const pool = createDatabasePool({ NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 3001,
    CORS_ORIGINS: [], DB_HOST: config.MIGRATION_DB_HOST, DB_PORT: config.MIGRATION_DB_PORT,
    DB_NAME: config.MIGRATION_DB_NAME, DB_USER: config.MIGRATION_DB_USER,
    DB_PASSWORD: config.MIGRATION_DB_PASSWORD, DB_CONNECTION_LIMIT: 1 })
  try { console.info(JSON.stringify(await runMigrations(pool, migrations, command as 'status' | 'up'))) }
  finally { await pool.end() }
}
main().catch(error => {
  console.error(error instanceof MigrationError ? error.code : 'MIGRATION_OPERATION_FAILED')
  process.exitCode = 1
})
