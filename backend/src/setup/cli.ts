import {readFile} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import {createDatabasePool} from '../db/pool.js'
import {targetPolicy,verifyTarget,operatorTransport} from '../migrations/operator.js'
import {digest} from '../migrations/schema.js'
import {bootstrapPlatform} from './bootstrap.js'
import {checkCloudApproval,verifyCloudGrants} from '../migrations/cloud-startup.js'
import type {SchemaManifest} from '../migrations/schema.js'

// Credentials/password are protected environment inputs, never command arguments.
let pool:ReturnType<typeof createDatabasePool>|undefined
try {
  const args=process.argv.slice(2), flags:Record<string,string>={}
  for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!key||!['--target','--environment','--approve'].includes(key)||!value||flags[key])throw Error();flags[key]=value}
  if(!flags['--target']||!flags['--environment'])throw Error()
  const policy=targetPolicy.parse(JSON.parse(await readFile(flags['--target'],'utf8')))
  const cloudApprovalId=process.env.CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID
  checkCloudApproval(policy,cloudApprovalId)
  if(policy.cloudStartup?.profile==='runtime-dbwide')throw Error('Bootstrap requires initial maintenance approval')
  if(policy.cloudStartup&&policy.cloudStartup.manifestFingerprint!==digest(JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8')) as SchemaManifest))throw Error('Cloud manifest mismatch')
  const localTransportApproval={acknowledgement:process.env.HOSTINGER_LOCAL_APPROVAL,approvalId:process.env.HOSTINGER_LOCAL_APPROVAL_ID}
  const transport=operatorTransport(policy,localTransportApproval)
  if(policy.environment!==flags['--environment']||flags['--approve']!==`BOOTSTRAP:${digest(policy)}`)throw Error()
  const user=process.env.BOOTSTRAP_DB_USER,password=process.env.BOOTSTRAP_DB_PASSWORD
  if(!user||!password)throw Error()
  pool=createDatabasePool({NODE_ENV:policy.environment==='local'?'test':'production',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:policy.host,DB_PORT:policy.port,DB_NAME:policy.database,DB_USER:user,DB_PASSWORD:password,DB_CONNECTION_LIMIT:2,
    DB_TLS_MODE:transport.mode,HOSTINGER_LOCAL_APPROVAL:localTransportApproval.acknowledgement,HOSTINGER_LOCAL_APPROVAL_ID:localTransportApproval.approvalId,...(policy.tlsCaFile?{DB_TLS_CA_FILE:resolve(dirname(flags['--target']),policy.tlsCaFile),DB_TLS_CA_SHA256:policy.tlsCaSha256!}:{})})
  const db=await pool.getConnection();try{
   await verifyTarget(db,policy,localTransportApproval)
   if(policy.cloudStartup){
    await verifyCloudGrants(db,policy.database,policy.cloudStartup)
    const [triggers]=await db.query<import('mysql2/promise').RowDataPacket[]>('SELECT DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')
    if(triggers.some(t=>t.DEFINER!==policy.expectedAccount))throw Error('Unexpected shared trigger definer')
   }
  }finally{db.release()}
  const result=await bootstrapPlatform(pool,{platformName:process.env.BOOTSTRAP_PLATFORM_NAME,email:process.env.BOOTSTRAP_OWNER_EMAIL,displayName:process.env.BOOTSTRAP_OWNER_NAME,password:process.env.BOOTSTRAP_OWNER_PASSWORD},()=>checkCloudApproval(policy,cloudApprovalId))
  if(policy.cloudStartup)console.info(JSON.stringify({event:'cloud_startup.bootstrap_completed',approvalReference:policy.cloudStartup.approvalId,profile:policy.cloudStartup.profile,targetFingerprint:digest(policy)}))
  console.info(JSON.stringify(result))
} catch {console.error('Bootstrap refused or failed. Review explicit target approval, protected inputs and database state. No credentials or identity details are logged.');process.exitCode=1}
finally {await pool?.end()}
