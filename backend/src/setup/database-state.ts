import {randomUUID} from 'node:crypto'
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise'
import {digest} from '../migrations/schema.js'

// A separate control database keeps the application manifest unchanged.
export async function withDatabaseState<T>(pool:Pool,target:string,run:(state:DatabaseState)=>Promise<T>):Promise<T>{
 const db=await pool.getConnection(),lock='magicreview:setup:'+target.slice(0,40)
 let acquired=false
 try{
  const [[row]]=await db.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired',[lock])
  if(Number(row?.acquired)!==1)throw Error('INITIALIZATION_LOCK_UNAVAILABLE')
  acquired=true
  await db.query('SET SESSION autocommit=1')
  await db.query('SET SESSION lock_wait_timeout=10')
  await db.query(`CREATE TABLE IF NOT EXISTS initialization_records (
   record_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
   target CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
   kind VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
   payload LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK(JSON_VALID(payload))
  ) ENGINE=InnoDB`)
  const [columns]=await db.query<RowDataPacket[]>('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLLATION_NAME,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\'initialization_records\' ORDER BY ORDINAL_POSITION')
  const expected=[['record_key','char(64)','NO','ascii_bin',''],['target','char(64)','NO','ascii_bin',''],['kind','varchar(32)','NO','ascii_bin',''],['payload','longtext','NO','utf8mb4_bin','']]
  const [tables]=await db.query<RowDataPacket[]>('SELECT ENGINE,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\'initialization_records\'')
  const [indexes]=await db.query<RowDataPacket[]>('SELECT INDEX_NAME,COLUMN_NAME,NON_UNIQUE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\'initialization_records\'')
  const [triggers]=await db.query<RowDataPacket[]>('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE=\'initialization_records\'')
  if(JSON.stringify(columns.map(r=>[r.COLUMN_NAME,r.COLUMN_TYPE,r.IS_NULLABLE,r.COLLATION_NAME,r.EXTRA]))!==JSON.stringify(expected)||tables[0]?.ENGINE!=='InnoDB'||tables[0]?.TABLE_TYPE!=='BASE TABLE'||indexes.length!==1||indexes[0]?.INDEX_NAME!=='PRIMARY'||indexes[0]?.COLUMN_NAME!=='record_key'||Number(indexes[0]?.NON_UNIQUE)!==0||triggers.length)throw Error('INITIALIZATION_STATE_SCHEMA_DRIFT')
  return await run(new DatabaseState(db,target,lock))
 }finally{
  if(acquired)await db.query('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{})
  db.destroy()
 }
}

export class DatabaseState {
 constructor(private readonly db:PoolConnection,private readonly target:string,private readonly lock:string){}
 private key(kind:string){return digest({target:this.target,kind})}
 async owned(){
  const [[row]]=await this.db.query<RowDataPacket[]>('SELECT IS_USED_LOCK(?)=CONNECTION_ID() AS owned',[this.lock])
  if(Number(row?.owned)!==1)throw Error('INITIALIZATION_LOCK_LOST')
 }
 async get(kind:string):Promise<unknown|undefined>{
  await this.owned()
  const [[row]]=await this.db.query<RowDataPacket[]>('SELECT payload FROM initialization_records WHERE record_key=? AND target=? AND kind=?',[this.key(kind),this.target,kind])
  return row?(typeof row.payload==='string'?JSON.parse(row.payload):row.payload):undefined
 }
 async put(kind:string,payload:unknown,append=false){
  await this.owned()
  await this.db.execute('INSERT INTO initialization_records(record_key,target,kind,payload) VALUES (?,?,?,?)',[append?digest(randomUUID()):this.key(kind),this.target,kind,JSON.stringify(payload)])
 }
}
