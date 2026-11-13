import {createHash} from 'node:crypto'
import type {Pool,PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise'
import {validateHistory,type Migration} from '../migrations/runner.js'
import {inspectSchema,verifySchema,validateManifest,digest,type SchemaManifest} from '../migrations/schema.js'
import {configureMigrationSession,migrationConnectionCollation} from '../migrations/session.js'

// Only the observed first-trigger collation failure, never arbitrary failed SQL.
export async function repairFirstTrigger(pool:Pool,files:Migration[],manifest:SchemaManifest,authorize:(db:PoolConnection)=>Promise<void>,audit:(value:object)=>Promise<void>){
 validateManifest(manifest,files)
 const db=await pool.getConnection()
 let locked=false,lock=''
 try{
  await authorize(db)
  const [[identity]]=await db.query<RowDataPacket[]>('SELECT DATABASE() AS name,CURRENT_USER() AS account')
  lock='magicreview:migrate:'+createHash('sha256').update(String(identity?.name)).digest('hex').slice(0,40)
  const [[acquired]]=await db.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS n',[lock])
  if(Number(acquired?.n)!==1)throw Error('MIGRATION_LOCK_UNAVAILABLE')
  locked=true
  await db.query('SET SESSION autocommit=1')
  await db.query('SET SESSION lock_wait_timeout=10')
  await configureMigrationSession(db)
  const [ledger]=await db.query<RowDataPacket[]>('SELECT version,name,checksum,status,failure_code FROM schema_migrations ORDER BY version')
  if(ledger.length!==25||ledger[24]?.version!=='000024'||ledger[24]?.status!=='failed')throw Error('FIRST_TRIGGER_REPAIR_STATE_MISMATCH')
  validateHistory(files.slice(0,24),ledger.slice(0,24) as Parameters<typeof validateHistory>[1])
  const step=files[24]!
  if(step.name!=='protect_tenants_owner'||ledger[24].name!==step.name||!Buffer.isBuffer(ledger[24].checksum)||!ledger[24].checksum.equals(step.checksum))throw Error('FIRST_TRIGGER_REPAIR_STATE_MISMATCH')
  const [[data]]=await db.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM users)+(SELECT COUNT(*) FROM tenants) AS n')
  if(Number(data?.n)!==0)throw Error('FIRST_TRIGGER_REPAIR_REQUIRES_UNUSED_SCHEMA')
  const [triggers]=await db.query<RowDataPacket[]>("SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_ORDER,ACTION_CONDITION,ACTION_STATEMENT,ACTION_ORIENTATION,ACTION_TIMING,SQL_MODE,CHARACTER_SET_CLIENT,COLLATION_CONNECTION,DATABASE_COLLATION FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME")
  const [[definer]]=await db.query<RowDataPacket[]>("SELECT DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='protect_tenants_owner'")
  if(triggers.length!==1||triggers[0]?.TRIGGER_NAME!=='protect_tenants_owner'||definer?.DEFINER!==identity?.account||!['utf8mb4_unicode_ci',migrationConnectionCollation].includes(String(triggers[0].COLLATION_CONNECTION)))throw Error('FIRST_TRIGGER_REPAIR_STATE_MISMATCH')
  const shape=await inspectSchema(db)
  const normalized={...shape,'trigger:protect_tenants_owner':digest({definition:[{...triggers[0],COLLATION_CONNECTION:migrationConnectionCollation}]})}
  if(digest(normalized)!==digest(manifest.prefixes[step.version]))throw Error('FIRST_TRIGGER_REPAIR_UNRELATED_DRIFT')
  const boundary=async()=>{
   await authorize(db)
   const [[owner]]=await db.query<RowDataPacket[]>('SELECT IS_USED_LOCK(?)=CONNECTION_ID() AS n',[lock])
   if(Number(owner?.n)!==1)throw Error('MIGRATION_LOCK_UNAVAILABLE')
  }
  await audit({event:'first_trigger_repair_reviewed',version:step.version,checksum:step.checksum.toString('hex'),previousStatus:'failed',previousFailureCode:ledger[24].failure_code,oldShapeFingerprint:digest(shape),expectedShapeFingerprint:digest(manifest.prefixes[step.version])})
  await boundary()
  if(triggers[0].COLLATION_CONNECTION!==migrationConnectionCollation){
   // Atomic OR REPLACE avoids a separate DROP interval; exact compiled body only.
   if(!step.sql.startsWith('CREATE TRIGGER protect_tenants_owner '))throw Error('FIRST_TRIGGER_REPAIR_STATE_MISMATCH')
   await db.query(step.sql.replace(/^CREATE TRIGGER /,'CREATE OR REPLACE TRIGGER '))
  }
  await verifySchema(db,manifest,files,25)
  const [[post]]=await db.query<RowDataPacket[]>(step.verify!)
  if(Number(post?.satisfied)!==1)throw Error('FIRST_TRIGGER_REPAIR_STATE_MISMATCH')
  await boundary()
  const [updated]=await db.execute<ResultSetHeader>("UPDATE schema_migrations SET status='applied',applied_at=UTC_TIMESTAMP(6),last_verified_step=1 WHERE version='000024' AND status='failed' AND checksum=?",[step.checksum])
  if(updated.affectedRows!==1)throw Error('FIRST_TRIGGER_REPAIR_STATE_MISMATCH')
  // Original failure_code remains on the row and the original control records remain.
  await audit({event:'first_trigger_repair_completed',version:step.version})
  return {repaired:true,appliedCount:25}
 }finally{if(locked)await db.query('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{});db.destroy()}
}
