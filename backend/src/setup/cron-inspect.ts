import {readFile} from 'node:fs/promises'
import type {RowDataPacket} from 'mysql2/promise'
import {z} from 'zod'
import {createDatabasePool} from '../db/pool.js'
import {digest} from '../migrations/schema.js'
import {inspectWildcardGrants,wildcardReleaseFingerprint} from '../migrations/hostinger-wildcard.js'

// SELECT/SHOW only. Never print raw grants (which may contain password hashes).
export async function inspectCronTarget(environment:NodeJS.ProcessEnv){
 const config=z.object({DB_HOST:z.string().min(1),DB_PORT:z.coerce.number().int().min(1).max(65535).default(3306),DB_NAME:z.string().min(1),DB_USER:z.string().min(1),DB_PASSWORD:z.string().min(1),DB_TLS_MODE:z.enum(['required','HOSTINGER_LOCAL']).optional(),DB_TLS_CA_FILE:z.string().optional(),DB_TLS_CA_SHA256:z.string().optional(),HOSTINGER_LOCAL_APPROVAL:z.string().optional(),HOSTINGER_LOCAL_APPROVAL_ID:z.string().optional()}).parse(environment)
 const pool=createDatabasePool({...config,NODE_ENV:'production',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_CONNECTION_LIMIT:1})
 try{
  const [[server]]=await pool.query<RowDataPacket[]>('SELECT VERSION() AS version,DATABASE() AS databaseName,@@hostname AS serverHostname,CURRENT_USER() AS expectedAccount')
  const [grants]=await pool.query<RowDataPacket[]>('SHOW GRANTS')
  const [tables]=await pool.query<RowDataPacket[]>('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME')
  const manifest=JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8'))
  return {mode:'inspect',...server,tableCount:tables.length,manifestFingerprint:digest(manifest),releaseFingerprint:await wildcardReleaseFingerprint(),grantFingerprint:inspectWildcardGrants(grants.map(row=>String(Object.values(row)[0])),'initial'),changesMade:false}
 }finally{await pool.end()}
}
