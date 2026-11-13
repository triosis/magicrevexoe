import type {PoolConnection,RowDataPacket} from 'mysql2/promise'
import {MigrationError} from './runner.js'

export const migrationSqlMode='IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'
export const migrationConnectionCollation='utf8mb4_uca1400_ai_ci'
export async function configureMigrationSession(db:PoolConnection){
 await db.query("SET NAMES utf8mb4 COLLATE utf8mb4_uca1400_ai_ci")
 await db.query("SET SESSION sql_mode='IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'")
 const [[row]]=await db.query<RowDataPacket[]>('SELECT @@session.sql_mode AS mode,@@session.collation_connection AS collation,@@session.character_set_client AS charset')
 if(row?.mode!==migrationSqlMode||row.collation!==migrationConnectionCollation||row.charset!=='utf8mb4')throw new MigrationError('UNSUPPORTED_DATABASE_SETTINGS')
}
