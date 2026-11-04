import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
export type Database = Pool | PoolConnection
export type Values = (string | number | Buffer | Date | null)[]
export async function select<T extends RowDataPacket = RowDataPacket>(db: Database, sql: string, values: Values = []): Promise<T[]> {
  const [result] = await db.execute<T[]>(sql, values)
  return result
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
