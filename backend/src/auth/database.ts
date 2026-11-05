import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
export type Database = Pool | PoolConnection
export type Values = (string | number | Buffer | Date | null)[]
export async function select<T extends RowDataPacket = RowDataPacket>(db: Database, sql: string, values: Values = []): Promise<T[]> {
  const [result] = await db.execute<T[]>(sql, values)
  return result
}
// All mutex users must acquire the same unique point record with the same
// projection. A covering secondary-index read can otherwise invert PK locks.
export async function lockPlatform(db: PoolConnection, write = true) {
  return (await select<RowDataPacket & {id:string;status:string}>(db,
    `SELECT id,status FROM tenants WHERE platform_slot=1 ${write?'FOR UPDATE':'LOCK IN SHARE MODE'}`))[0]
}
export async function transaction<T>(pool: Pool, operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection()
  try {
    await connection.query("SET SESSION time_zone='+00:00'")
    await connection.beginTransaction()
    const result = await operation(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback().catch(() => undefined)
    throw error
  } finally { connection.release() }
}
