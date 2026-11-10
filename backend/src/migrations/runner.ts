import { createHash, randomBytes } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise'

export class MigrationError extends Error {
  constructor(public readonly code: string) { super(code) }
}
export type Migration = { version: string; name: string; sql: string; checksum: Buffer; verify?: string }
type LedgerRow = RowDataPacket & { version: string; name: string; checksum: Buffer; status: string }
function fail(code: string): never { throw new MigrationError(code) }

export function supportedVersion(version: string): boolean {
  // Deliberately support only the verified 11.8 series, not unknown future majors.
  return /^(?:5\.5\.5-)?11\.8\.\d+(?:[-+].*)?$/i.test(version) && /MariaDB/i.test(version)
}

export async function loadMigrations(directory: URL): Promise<Migration[]> {
  const all = await readdir(directory)
  const files = all.filter(name => name.endsWith('.sql') && !name.endsWith('.verify.sql')).sort()
  const migrations: Migration[] = []
  for (const [index, file] of files.entries()) {
    const match = /^(\d{6})_([a-z][a-z0-9_]{0,159})\.sql$/.exec(file)
    if (!match || Number(match[1]) !== index) fail('INVALID_MIGRATION_SEQUENCE')
    const sql = await readFile(new URL(file, directory), 'utf8')
    if (!sql.trim() || sql.includes('\r') || sql.charCodeAt(0) === 0xfeff) fail('INVALID_MIGRATION_ENCODING')
    const migration: Migration = { version: match[1]!, name: match[2]!, sql, checksum: createHash('sha256').update(sql, 'utf8').digest() }
    if (index > 0) {
      const verifyFile = file.replace(/\.sql$/, '.verify.sql')
      if (!all.includes(verifyFile)) fail('MISSING_MIGRATION_POSTCONDITION')
      const verify = await readFile(new URL(verifyFile, directory), 'utf8')
      if (!/^SELECT\s/i.test(verify.trim()) || verify.includes('\r') || verify.includes('\0')) fail('INVALID_MIGRATION_POSTCONDITION')
      migration.verify = verify
      migration.checksum = createHash('sha256').update(sql).update('\0').update(verify).digest()
    }
    migrations.push(migration)
  }
  if (migrations[0]?.name !== 'schema_migrations') fail('MISSING_BOOTSTRAP_MIGRATION')
  return migrations
}

export function validateHistory(migrations: Migration[], rows: LedgerRow[]): void {
  for (const [index, row] of rows.entries()) {
    const file = migrations[index]
    if (!file || row.version !== file.version) fail('MIGRATION_HISTORY_DIVERGED')
    if (row.name !== file.name || !Buffer.isBuffer(row.checksum) || !row.checksum.equals(file.checksum)) fail('MIGRATION_CHECKSUM_MISMATCH')
    if (row.status !== 'applied') fail('INCOMPLETE_MIGRATION_REQUIRES_REVIEW')
  }
}

async function rows(connection: PoolConnection, sql: string, values: (string | number | Buffer)[] = []): Promise<RowDataPacket[]> {
  const [result] = await connection.execute<RowDataPacket[]>(sql, values)
  return result
}

async function verifyLedger(connection: PoolConnection): Promise<void> {
  const tables = await rows(connection, `SELECT ENGINE, TABLE_COLLATION FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migrations'`)
  if (tables[0]?.ENGINE !== 'InnoDB' || tables[0]?.TABLE_COLLATION !== 'utf8mb4_unicode_ci') fail('INCOMPATIBLE_MIGRATION_LEDGER')
  const columns = await rows(connection, `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLLATION_NAME
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migrations' ORDER BY ORDINAL_POSITION`)
  const expected = [
    ['version','char(6)','NO',null,'ascii_bin'], ['name','varchar(160)','NO',null,'utf8mb4_unicode_ci'],
    ['checksum','binary(32)','NO',null,null], [ 'status',"enum('applying','applied','failed')",'NO',null,'utf8mb4_unicode_ci'],
    ['started_at','datetime(6)','NO','current_timestamp(6)',null], ['applied_at','datetime(6)','YES','NULL',null],
    ['execution_ms','bigint(20) unsigned','YES','NULL',null], ['last_verified_step','int(10) unsigned','NO','0',null],
    ['failure_code','varchar(64)','YES','NULL','ascii_bin'], ['runner_id','binary(16)','NO',null,null],
  ]
  if (columns.length !== expected.length || columns.some((column, index) => {
    const definition = expected[index]!
    return column.COLUMN_NAME !== definition[0] || column.COLUMN_TYPE.toLowerCase() !== definition[1]
      || column.IS_NULLABLE !== definition[2] || column.COLUMN_DEFAULT !== definition[3]
      || column.COLLATION_NAME !== definition[4] || column.EXTRA !== ''
  })) fail('INCOMPATIBLE_MIGRATION_LEDGER')
  const indexes = await rows(connection, `SELECT INDEX_NAME,COLUMN_NAME,NON_UNIQUE FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migrations'`)
  if (indexes.length !== 1 || indexes[0]?.INDEX_NAME !== 'PRIMARY' || indexes[0]?.COLUMN_NAME !== 'version' || Number(indexes[0]?.NON_UNIQUE) !== 0) fail('INCOMPATIBLE_MIGRATION_LEDGER')
  const triggers = await rows(connection, `SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='schema_migrations'`)
  if (triggers.length) fail('INCOMPATIBLE_MIGRATION_LEDGER')
}

export type MigrationControls={
 beforeStep?:()=>void
 validateConnection?:(connection:PoolConnection)=>Promise<void>
 inspect?:(connection:PoolConnection,applied:number)=>Promise<void>
 progress?:(event:{event:string;version?:string})=>Promise<void>
 interrupted?:()=>boolean
}
export async function runMigrations(pool: Pool, migrations: Migration[], mode: 'status' | 'up', lockTimeout = 5, controls:MigrationControls={}) {
  const connection = await pool.getConnection()
  let locked = false
  let lockName = ''
  let activeVersion: string | undefined
  const started = Date.now()
  try {
    const server = (await rows(connection, 'SELECT VERSION() AS version, DATABASE() AS db'))[0]!
    if (!supportedVersion(String(server.version))) fail('UNSUPPORTED_DATABASE_VERSION')
    if (!server.db) fail('MISSING_DATABASE_SELECTION')
    const settings = (await rows(connection, `SELECT @@default_storage_engine AS engine, @@character_set_database AS charset,
      @@collation_database AS collation, @@session.foreign_key_checks AS fk_checks,
      @@session.check_constraint_checks AS check_checks, @@session.sql_mode AS sql_mode`))[0]!
    if (String(settings.engine).toLowerCase() !== 'innodb' || settings.charset !== 'utf8mb4'
      || settings.collation !== 'utf8mb4_unicode_ci' || Number(settings.fk_checks) !== 1
      || Number(settings.check_checks) !== 1 || !/STRICT_(TRANS|ALL)_TABLES/.test(settings.sql_mode)) fail('UNSUPPORTED_DATABASE_SETTINGS')
    await connection.query("SET SESSION time_zone='+00:00'")
    // Progress rows must survive later DDL failures. Bound server-side metadata
    // lock waits without changing the application's pooled session settings.
    await connection.query('SET SESSION autocommit=1')
    await connection.query('SET SESSION lock_wait_timeout=10')
    await connection.query('SET SESSION innodb_lock_wait_timeout=10')
    lockName = `magicreview:migrate:${createHash('sha256').update(String(server.db)).digest('hex').slice(0,40)}`
    const lock = (await rows(connection, 'SELECT GET_LOCK(?, ?) AS acquired', [lockName, lockTimeout]))[0]
    if (Number(lock?.acquired) !== 1) fail('MIGRATION_LOCK_UNAVAILABLE')
    locked = true
    await controls.validateConnection?.(connection)
    const tables = await rows(connection, 'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')
    const exists = tables.some(table => table.TABLE_NAME === 'schema_migrations')
    const bootstrap = migrations[0]
    if (!bootstrap || bootstrap.version !== '000000' || bootstrap.name !== 'schema_migrations') fail('MISSING_BOOTSTRAP_MIGRATION')
    if (!exists) {
      if (tables.length) fail('EXISTING_SCHEMA_REQUIRES_BASELINE_REVIEW')
      await controls.inspect?.(connection,0)
      if (mode === 'status') return { initialized: false, applied: [], pending: migrations.map(file => file.version) }
      if(controls.interrupted?.())fail('MIGRATION_INTERRUPTED')
      await controls.progress?.({event:'step_started',version:bootstrap.version})
      if(controls.interrupted?.())fail('MIGRATION_INTERRUPTED')
      controls.beforeStep?.()
      // Bootstrap has no ledger yet. A crash in this narrow gap leaves an empty
      // ledger which is deliberately BLOCKED, never silently accepted next run.
      await connection.query(bootstrap.sql)
      await verifyLedger(connection)
      await connection.execute(`INSERT INTO schema_migrations
        (version,name,checksum,status,applied_at,execution_ms,last_verified_step,runner_id)
        VALUES (?,?,?,'applied',CURRENT_TIMESTAMP(6),?,1,?)`,
      [bootstrap.version, bootstrap.name, bootstrap.checksum, Date.now()-started, randomBytes(16)])
      await controls.inspect?.(connection,1)
      await controls.progress?.({event:'step_applied',version:bootstrap.version})
    }
    await verifyLedger(connection)
    const history = await rows(connection, 'SELECT version,name,checksum,status FROM schema_migrations ORDER BY version') as LedgerRow[]
    if (!history.length) fail('BOOTSTRAP_INCOMPLETE_REQUIRES_REVIEW')
    validateHistory(migrations, history)
    await controls.inspect?.(connection,history.length)
    const pending = migrations.slice(history.length)
    if (mode === 'up') {
      for (const migration of pending) {
        if(controls.interrupted?.())fail('MIGRATION_INTERRUPTED')
        if (!migration.verify) fail('MISSING_MIGRATION_POSTCONDITION')
        const stepStart = Date.now()
        const owner = (await rows(connection, 'SELECT IS_USED_LOCK(?)=CONNECTION_ID() AS owned', [lockName]))[0]
        if (Number(owner?.owned) !== 1) fail('MIGRATION_LOCK_LOST')
        await controls.progress?.({event:'step_started',version:migration.version})
        if(controls.interrupted?.())fail('MIGRATION_INTERRUPTED')
        controls.beforeStep?.()
        await connection.execute(`INSERT INTO schema_migrations (version,name,checksum,status,runner_id) VALUES (?,?,?,'applying',?)`,
          [migration.version,migration.name,migration.checksum,randomBytes(16)])
        activeVersion = migration.version
        // Exactly one reviewed SQL statement per file. The driver rejects multiple
        // statements, without unsafe semicolon splitting (including trigger bodies).
        controls.beforeStep?.()
        await connection.query(migration.sql)
        const verified = await rows(connection, migration.verify)
        if (verified.length !== 1 || Number(verified[0]?.satisfied) !== 1) fail('MIGRATION_POSTCONDITION_FAILED')
        await controls.inspect?.(connection,Number(migration.version)+1)
        const stillOwned=(await rows(connection,'SELECT IS_USED_LOCK(?)=CONNECTION_ID() AS owned',[lockName]))[0]
        if(Number(stillOwned?.owned)!==1)fail('MIGRATION_LOCK_LOST')
        const [result] = await connection.execute<ResultSetHeader>(`UPDATE schema_migrations SET status='applied',applied_at=CURRENT_TIMESTAMP(6),execution_ms=?,last_verified_step=1
          WHERE version=? AND status='applying'`, [Date.now()-stepStart, migration.version])
        if (result.affectedRows !== 1) fail('MIGRATION_LEDGER_UPDATE_FAILED')
        activeVersion = undefined
        await controls.progress?.({event:'step_applied',version:migration.version})
      }
    }
    if(controls.interrupted?.())fail('MIGRATION_INTERRUPTED')
    return { initialized: true, applied: mode === 'up' ? migrations.map(file => file.version) : history.map(row => row.version), pending: mode === 'up' ? [] : pending.map(file => file.version) }
  } catch (error) {
    if (activeVersion) {
      try { await connection.execute("UPDATE schema_migrations SET status='failed',failure_code='EXECUTION_FAILED' WHERE version=? AND status='applying'", [activeVersion]) } catch { /* Lost connection leaves applying; both states block. */ }
    }
    if (error instanceof MigrationError) throw error
    throw new MigrationError('MIGRATION_OPERATION_FAILED')
  } finally {
    try {
      if (locked) {
        const result = (await rows(connection, 'SELECT RELEASE_LOCK(?) AS released', [lockName]))[0]
        if (Number(result?.released) !== 1) fail('MIGRATION_LOCK_RELEASE_FAILED')
      }
    } finally { connection.destroy() }
  }
}
