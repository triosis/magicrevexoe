import {createHash} from 'node:crypto'
import type {PoolConnection,RowDataPacket} from 'mysql2/promise'
import {MigrationError,type Migration} from './runner.js'

export const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
export type Shape=Record<string,string>
export type SchemaManifest={format:1;checksums:string[];prefixes:Record<string,Shape>}
export async function inspectSchema(db:PoolConnection){
 const objects:Record<string,Record<string,unknown[]>>={}
 const add=(key:string,part:string,row:unknown)=>{const object=objects[key]??={};(object[part]??=[]).push(row)}
 const queries:[string,string,string][]=[
  ['table','table',`SELECT TABLE_NAME,TABLE_TYPE,ENGINE,ROW_FORMAT,TABLE_COLLATION,CREATE_OPTIONS,TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME`],
  ['table','columns',`SELECT TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,CHARACTER_SET_NAME,COLLATION_NAME,GENERATION_EXPRESSION,COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION`],
  ['table','indexes',`SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,COLLATION,SUB_PART,INDEX_TYPE,NULLABLE,IGNORED FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX`],
  ['table','constraints',`SELECT TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME`],
  ['table','keys',`SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,ORDINAL_POSITION,POSITION_IN_UNIQUE_CONSTRAINT,CASE WHEN REFERENCED_TABLE_SCHEMA=DATABASE() THEN '<self>' ELSE REFERENCED_TABLE_SCHEMA END AS REFERENCED_TABLE_SCHEMA,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION`],
  ['table','references',`SELECT TABLE_NAME,CONSTRAINT_NAME,UNIQUE_CONSTRAINT_NAME,CASE WHEN UNIQUE_CONSTRAINT_SCHEMA=DATABASE() THEN '<self>' ELSE UNIQUE_CONSTRAINT_SCHEMA END AS UNIQUE_CONSTRAINT_SCHEMA,MATCH_OPTION,UPDATE_RULE,DELETE_RULE,REFERENCED_TABLE_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME`],
  ['table','checks',`SELECT TABLE_NAME,CONSTRAINT_NAME,CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME`],
  ['trigger','definition',`SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_ORDER,ACTION_CONDITION,ACTION_STATEMENT,ACTION_ORIENTATION,ACTION_TIMING,SQL_MODE,CHARACTER_SET_CLIENT,COLLATION_CONNECTION,DATABASE_COLLATION FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME`],
 ]
 for(const [kind,part,sql]of queries){const [rows]=await db.query<RowDataPacket[]>(sql);for(const row of rows)add(`${kind}:${kind==='table'?row.TABLE_NAME:row.TRIGGER_NAME}`,part,{...row})}
 return Object.fromEntries(Object.keys(objects).sort().map(key=>[key,digest(objects[key])]))
}
export function validateManifest(manifest:SchemaManifest,files:Migration[]){
 if(manifest.format!==1||manifest.checksums.length!==files.length||files.some((m,i)=>manifest.checksums[i]!==m.checksum.toString('hex'))||!manifest.prefixes.empty||files.some(m=>!manifest.prefixes[m.version]))throw new MigrationError('SCHEMA_MANIFEST_MISMATCH')
}
export async function verifySchema(db:PoolConnection,manifest:SchemaManifest,files:Migration[],count:number){
 const expected=manifest.prefixes[count?files[count-1]!.version:'empty']
 const actual=await inspectSchema(db)
 if(!expected||digest(actual)!==digest(expected))throw new MigrationError('SCHEMA_DRIFT_REQUIRES_REVIEW')
 return actual
}
