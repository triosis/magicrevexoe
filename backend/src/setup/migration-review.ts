import {readFile} from 'node:fs/promises'
import type {PoolConnection,RowDataPacket} from 'mysql2/promise'
import {loadMigrations} from '../migrations/runner.js'
import {inspectSchema,digest,validateManifest,type SchemaManifest} from '../migrations/schema.js'

// Read-only review of an interrupted migration; never adopts/baselines or repairs.
export async function reviewMigrationState(db:PoolConnection){
 const files=await loadMigrations(new URL('../../migrations/',import.meta.url))
 const manifest=JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8')) as SchemaManifest
 validateManifest(manifest,files)
 const [ledger]=await db.query<RowDataPacket[]>('SELECT version,name,checksum,status,failure_code FROM schema_migrations ORDER BY version')
 const checksumsMatch=ledger.length<=files.length&&ledger.every((r,i)=>r.version===files[i]?.version&&r.name===files[i]?.name&&Buffer.isBuffer(r.checksum)&&r.checksum.equals(files[i]!.checksum))
 let applied=0
 while(applied<ledger.length&&ledger[applied]?.status==='applied')applied++
 const tail=ledger[applied],failed=checksumsMatch&&ledger.length===applied+1&&tail&&['failed','applying'].includes(String(tail.status))?files[applied]:undefined
 const shape=await inspectSchema(db)
 const prefix=manifest.prefixes[applied?files[applied-1]!.version:'empty']
 let failedPostconditionSatisfied:boolean|undefined
 if(failed?.verify){const [rows]=await db.query<RowDataPacket[]>(failed.verify);failedPostconditionSatisfied=rows.length===1&&Number(rows[0]?.satisfied)===1}
 return {ledgerRows:ledger.length,appliedPrefixCount:applied,checksumsMatch,
  schemaMatchesAppliedPrefix:!!prefix&&digest(shape)===digest(prefix),
  incompleteTailRecognized:!!failed,
  ...(failed?{failedVersion:failed.version,failedPostconditionSatisfied,schemaMatchesIncludingFailedStep:digest(shape)===digest(manifest.prefixes[failed.version]),storedDatabaseError:typeof tail?.failure_code==='string'&&/^DB_ERROR_[1-9][0-9]{3}$/.test(tail.failure_code)?tail.failure_code:'UNAVAILABLE'}:{}),
  changesMade:false}
}
