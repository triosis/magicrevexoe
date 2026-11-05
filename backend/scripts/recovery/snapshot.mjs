import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {loadMigrations,validateHistory} from '../../dist/migrations/runner.js'
import {verifySchema,digest} from '../../dist/migrations/schema.js'

export class RecoveryError extends Error{constructor(code){super(code);this.code=code}}
export const fail=code=>{throw new RecoveryError(code)}
export const quote=name=>{if(!/^[a-zA-Z0-9_]+$/.test(name))fail('UNSAFE_IDENTIFIER');return '`'+name+'`'}
export async function releaseDefinition(){return {files:await loadMigrations(new URL('../../migrations/',import.meta.url)),manifest:JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8'))}}
export async function schemaAndLedger(db){
 const [[extra]]=await db.query('SELECT (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE())+(SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE()) AS n')
 if(BigInt(extra.n)!==0n)fail('UNSUPPORTED_RECOVERY_OBJECTS')
 const {files,manifest}=await releaseDefinition()
 const shape=await verifySchema(db,manifest,files,files.length)
 const [ledger]=await db.query('SELECT version,name,checksum,status FROM schema_migrations ORDER BY version')
 validateHistory(files,ledger);if(ledger.length!==files.length)fail('INCOMPLETE_RELEASE')
 return {shape,releaseChecksums:files.map(f=>f.checksum.toString('hex'))}
}
export async function integrity(db){
 const [[settings]]=await db.query('SELECT DATABASE() AS db,@@session.foreign_key_checks AS fk,@@session.check_constraint_checks AS checks')
 if(Number(settings.fk)!==1||Number(settings.checks)!==1)fail('CONSTRAINT_ENFORCEMENT_REQUIRED')
 const [keys]=await db.query('SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_SCHEMA,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION')
 const groups=Object.groupBy(keys,k=>k.TABLE_NAME+':'+k.CONSTRAINT_NAME)
 for(const columns of Object.values(groups)){
  const first=columns[0];if(first.REFERENCED_TABLE_SCHEMA!==settings.db)fail('EXTERNAL_FOREIGN_KEY')
  const c=quote('c_'+first.TABLE_NAME),p=quote('p_'+first.REFERENCED_TABLE_NAME)
  const nonnull=columns.map(k=>c+'.'+quote(k.COLUMN_NAME)+' IS NOT NULL').join(' AND ')
  const equal=columns.map(k=>p+'.'+quote(k.REFERENCED_COLUMN_NAME)+'='+c+'.'+quote(k.COLUMN_NAME)).join(' AND ')
  const [[row]]=await db.query(`SELECT COUNT(*) AS bad FROM ${quote(first.TABLE_NAME)} ${c} WHERE ${nonnull} AND NOT EXISTS (SELECT 1 FROM ${quote(first.REFERENCED_TABLE_NAME)} ${p} WHERE ${equal})`)
  if(BigInt(row.bad)!==0n)fail('FOREIGN_KEY_INTEGRITY_FAILED')
 }
 const [checks]=await db.query('SELECT TABLE_NAME,CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()')
 for(const c of checks){const [[row]]=await db.query(`SELECT COUNT(*) AS bad FROM ${quote(c.TABLE_NAME)} WHERE NOT (${c.CHECK_CLAUSE})`);if(BigInt(row.bad)!==0n)fail('CHECK_INTEGRITY_FAILED')}
 return {foreignKeys:Object.keys(groups).length,checks:checks.length}
}
export async function snapshot(db){
 const structural=await schemaAndLedger(db),relationships=await integrity(db)
 const [tables]=await db.query('SELECT TABLE_NAME,AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME')
 const data={}
 for(const table of tables){
  const [pk]=await db.query("SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX",[table.TABLE_NAME])
  if(!pk.length)fail('PRIMARY_KEY_REQUIRED')
  const hash=createHash('sha256');let rows=0n
  const stream=db.connection.query({sql:`SELECT * FROM ${quote(table.TABLE_NAME)} ORDER BY ${pk.map(p=>quote(p.COLUMN_NAME)).join(',')}`,rowsAsArray:true}).stream()
  for await(const row of stream){hash.update(JSON.stringify(row)+'\n');rows++}
  data[table.TABLE_NAME]={rows:rows.toString(),sha256:hash.digest('hex'),autoIncrement:table.AUTO_INCREMENT===null?null:String(table.AUTO_INCREMENT)}
 }
 const [triggers]=await db.query('SELECT TRIGGER_NAME,DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME')
 return {...structural,relationships,data,triggerDefiners:triggers.map(t=>({...t})),snapshotDigest:digest({shape:structural.shape,data})}
}
