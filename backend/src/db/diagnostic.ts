import type {Env} from '../config/env.js'
import {createDatabasePool} from './pool.js'
import {supportedVersion} from '../migrations/runner.js'
import {databaseTransport} from '../config/database-transport.js'

// Only read-only diagnostic statements, using the same verified TLS pool policy.
export async function verifyDatabase(env:Env){
 if(env.NODE_ENV!=='production')throw Error('Production configuration required')
 const transport=databaseTransport(env)
 const pool=createDatabasePool({...env,DB_CONNECTION_LIMIT:1})
 const sessions=new Set<{destroy:()=>void}>()
 pool.on('connection',session=>sessions.add(session))
 try{
  const connection=await pool.getConnection()
  try{
   const [status]=await connection.query<import('mysql2').RowDataPacket[]>({sql:"SHOW SESSION STATUS LIKE 'Ssl_cipher'",timeout:3000})
   if(transport.mode==='required'&&!status[0]?.Value)throw Object.assign(Error('Encrypted database session required'),{code:'ENCRYPTED_DATABASE_SESSION_REQUIRED'})
   const [version]=await connection.query<import('mysql2').RowDataPacket[]>({sql:'SELECT VERSION() AS version',timeout:3000})
   if(!supportedVersion(String(version[0]?.version)))throw Object.assign(Error('Unsupported database engine/version'),{code:'UNSUPPORTED_DATABASE_VERSION'})
   await connection.query({sql:'SELECT 1',timeout:3000})
   if(transport.mode==='HOSTINGER_LOCAL')return {status:'connected',encrypted:false,transport:'unencrypted_loopback',approvalReference:transport.approvalId,engine:'MariaDB',series:'11.8',readOnlyProbe:true,schemaAndGrantsVerified:false} as const
   return {status:'verified',encrypted:true,engine:'MariaDB',series:'11.8',readOnlyProbe:true,schemaAndGrantsVerified:false} as const
  }finally{connection.release()}
 }finally{for(const session of sessions)session.destroy();await pool.end()}
}
