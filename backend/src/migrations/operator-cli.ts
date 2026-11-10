import {readFile,open} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import {createPool} from 'mysql2/promise'
import {loadMigrations,MigrationError,validateHistory} from './runner.js'
import {targetPolicy,operatorMigrations,verifyTarget,operatorTransport,type Approval} from './operator.js'
import {digest,verifySchema,validateManifest,type SchemaManifest} from './schema.js'
import {checkCloudApproval,verifyCloudGrants,cloudRuntimeRisks} from './cloud-startup.js'
import {verifyPrivileges} from './privileges.js'

// No dotenv, app DB_* fallback, target defaults, raw SQL/grant diagnostics or retries.
async function main(){
 const [command,...args]=process.argv.slice(2),flags:Record<string,string>={}
 if(!['preflight','apply','check-runtime'].includes(command??''))throw new MigrationError('USAGE_OPERATOR_PREFLIGHT_APPLY_OR_CHECK_RUNTIME')
 for(let i=0;i<args.length;i+=2){const flag=args[i]!,value=args[i+1];if(!['--target','--environment','--approval','--audit','--confirm-production','--report'].includes(flag)||!value||flags[flag])throw new MigrationError('INVALID_OPERATOR_ARGUMENTS');flags[flag]=value}
 if(command!=='preflight'&&flags['--report'])throw new MigrationError('REPORT_ONLY_FOR_PREFLIGHT')
 if(!flags['--target']||!flags['--environment'])throw new MigrationError('EXPLICIT_TARGET_ENVIRONMENT_REQUIRED')
 const policy=targetPolicy.parse(JSON.parse(await readFile(flags['--target'],'utf8')))
 const cloudApprovalId=process.env.CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID
 checkCloudApproval(policy,cloudApprovalId)
 if(policy.cloudStartup&&((command==='check-runtime')!==(policy.cloudStartup.profile==='runtime-dbwide')))throw new MigrationError('CLOUD_STARTUP_COMMAND_PROFILE_MISMATCH')
 const localTransportApproval={acknowledgement:process.env.HOSTINGER_LOCAL_APPROVAL,approvalId:process.env.HOSTINGER_LOCAL_APPROVAL_ID}
 const transport=operatorTransport(policy,localTransportApproval)
 if(flags['--environment']!==policy.environment)throw new MigrationError('TARGET_ENVIRONMENT_MISMATCH')
 if(command==='apply'&&policy.environment==='production'&&flags['--confirm-production']!==`APPLY-PRODUCTION:${digest(policy)}`)throw new MigrationError('EXPLICIT_PRODUCTION_CONFIRMATION_REQUIRED')
 let approval:Approval|undefined
 if(command==='apply'){
  if(!flags['--approval']||!flags['--audit'])throw new MigrationError('EXPLICIT_APPROVAL_AND_AUDIT_REQUIRED')
  const artifact=JSON.parse(await readFile(flags['--approval'],'utf8')) as {approval?:Approval;mode?:string}
  if(artifact.mode!=='preflight'||!artifact.approval||!/^[a-f0-9]{64}$/.test(artifact.approval.digest)||!Number.isSafeInteger(artifact.approval.expiresAt))throw new MigrationError('INVALID_APPROVAL_ARTIFACT')
  approval=artifact.approval
 }
 const user=process.env.MIGRATION_DB_USER,password=process.env.MIGRATION_DB_PASSWORD
 if(!user||!password)throw new MigrationError('EXPLICIT_MIGRATION_CREDENTIALS_REQUIRED')
 const ca=transport.mode==='required'&&policy.tlsCaFile?await readFile(resolve(dirname(flags['--target']),policy.tlsCaFile),'utf8'):undefined
 if(ca&&createHash('sha256').update(ca).digest('hex')!==policy.tlsCaSha256)throw new MigrationError('TLS_CA_FINGERPRINT_MISMATCH')
 const pool=createPool({host:policy.host,port:policy.port,database:policy.database,user,password,connectionLimit:1,waitForConnections:false,connectTimeout:5000,charset:'utf8mb4',timezone:'Z',multipleStatements:false,supportBigNumbers:true,bigNumberStrings:true,...(ca?{ssl:{ca,rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2'}}:{})})
 const audit=command==='apply'?await open(flags['--audit']!,'wx',0o600):undefined
 let interrupted=false
 const interrupt=()=>{interrupted=true};process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt)
 const runId=randomUUID(),targetFingerprint=digest(policy)
 const event=async(value:object)=>{const line=JSON.stringify({at:new Date().toISOString(),runId,targetFingerprint,...value})+'\n';if(audit){await audit.write(line);await audit.sync()}process.stdout.write(line)}
 try{
  if(command==='check-runtime'){
   const connection=await pool.getConnection()
   try{
    await verifyTarget(connection,policy,localTransportApproval)
    const result=policy.cloudStartup?await verifyCloudGrants(connection,policy.database,policy.cloudStartup):await verifyPrivileges(connection,policy.database,'runtime')
    if(policy.cloudStartup){
     checkCloudApproval(policy,cloudApprovalId)
     const files=await loadMigrations(new URL('../../migrations/',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8')) as SchemaManifest
     if(digest(manifest)!==policy.cloudStartup.manifestFingerprint)throw new MigrationError('CLOUD_STARTUP_MANIFEST_MISMATCH')
     validateManifest(manifest,files)
     const [rows]=await connection.query<import('mysql2/promise').RowDataPacket[]>('SELECT version,name,checksum,status FROM schema_migrations ORDER BY version')
     validateHistory(files,rows as Parameters<typeof validateHistory>[1]);if(rows.length!==files.length)throw new MigrationError('CLOUD_STARTUP_INCOMPLETE_SCHEMA')
     await verifySchema(connection,manifest,files,files.length)
     const [triggers]=await connection.query<import('mysql2/promise').RowDataPacket[]>('SELECT DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')
     if(triggers.some(t=>t.DEFINER!==policy.expectedAccount))throw new MigrationError('UNAPPROVED_TRIGGER_DEFINER')
     checkCloudApproval(policy,cloudApprovalId)
    }
    console.info(JSON.stringify({mode:command,targetFingerprint,privilegeFingerprint:result.fingerprint,verified:true,...(transport.mode==='HOSTINGER_LOCAL'?{transport:transport.mode,encrypted:false,approvalReference:transport.approvalId}:{}),...(policy.cloudStartup?{cloudProfile:policy.cloudStartup.profile,cloudApprovalId:policy.cloudStartup.approvalId,retainedSchemaPrivileges:['SELECT','INSERT','UPDATE','TRIGGER'],risks:cloudRuntimeRisks}:{})}))
   }finally{connection.destroy()}
  }else{
   const files=await loadMigrations(new URL('../../migrations/',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../../docs/schema-manifest.json',import.meta.url),'utf8')) as SchemaManifest
   const result=await operatorMigrations(pool,files,manifest,policy,command as 'preflight'|'apply',{...(approval?{approval}:{}),...(flags['--confirm-production']?{productionConfirmation:flags['--confirm-production']}:{}),...(audit?{audit:event}:{}),interrupted:()=>interrupted,localTransportApproval,...(cloudApprovalId?{cloudApprovalId}:{})})
   if(audit)await event({event:'execution_completed',summary:result})
   else{
    if(flags['--report']){const report=await open(flags['--report'],'wx',0o600);try{await report.writeFile(JSON.stringify(result)+'\n');await report.sync()}finally{await report.close()}}
    console.info(JSON.stringify(result))
   }
  }
 }catch(error){if(audit)await event({event:'execution_failed',code:error instanceof MigrationError?error.code:'MIGRATION_OPERATION_FAILED'});throw error}
 finally{process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);await pool.end();await audit?.close()}
}
main().catch(error=>{console.error(error instanceof MigrationError?error.code:'INVALID_OR_FAILED_MIGRATION_OPERATION');process.exitCode=1})
