import {createPool} from 'mysql2/promise'
import {createHash,randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {pipeline} from 'node:stream/promises'
import {createReadStream} from 'node:fs'
import {open,unlink,rmdir} from 'node:fs/promises'
import path from 'node:path'
import {targetPolicy,verifyTarget} from '../../dist/migrations/operator.js'
import {digest} from '../../dist/migrations/schema.js'
import {snapshot,quote,fail,RecoveryError,releaseDefinition} from './snapshot.mjs'
import {MigrationError} from '../../dist/migrations/runner.js'
import {privateDirectory,protectOutput,clientConfiguration,cleanup,checkClient,nativeEnvironment} from './files.mjs'
import {keys,encryptDump,publish,writeManifest,decryptVerified} from './archive.mjs'

export function localPolicy(raw){const p=targetPolicy.parse(raw);if(p.environment!=='local'||!['127.0.0.1','::1'].includes(p.host))fail('DISPOSABLE_LOCAL_TARGET_REQUIRED');if(p.tlsCaFile||p.tlsCaSha256)fail('LOCAL_RECOVERY_TLS_POLICY_UNSUPPORTED');return p}
function poolFor(policy,user,password){return createPool({host:policy.host,port:policy.port,database:policy.database,user,password,connectionLimit:1,waitForConnections:false,connectTimeout:3000,charset:'utf8mb4',timezone:'Z',dateStrings:true,multipleStatements:false,supportBigNumbers:true,bigNumberStrings:true})}
async function acquire(db,policy){
 await verifyTarget(db,policy)
 const [[server]]=await db.query('SELECT VERSION() AS version');if(!/^11\.8\.9-MariaDB/.test(server.version))fail('MARIADB_11_8_9_REQUIRED')
 await db.query("SET SESSION time_zone='+00:00'");await db.query('SET SESSION lock_wait_timeout=10');await db.query('SET SESSION innodb_lock_wait_timeout=10')
 const name='magicreview:migrate:'+createHash('sha256').update(policy.database).digest('hex').slice(0,40)
 const [[lock]]=await db.execute('SELECT GET_LOCK(?,5) AS acquired',[name]);if(Number(lock.acquired)!==1)fail('RECOVERY_LOCK_UNAVAILABLE');return name
}
function native(binary,cnf,policy,args,signal){
 const child=spawn(binary,['--defaults-file='+cnf,...args,policy.database],{windowsHide:true,shell:false,env:nativeEnvironment(),stdio:['pipe','pipe','pipe'],...(signal?{signal}:{})})
 // Never relay native stderr: it may contain SQL values or account details.
 let diagnostic=''
 child.stderr.on('data',chunk=>{if(diagnostic.length<8192)diagnostic+=chunk.toString('utf8')})
 const completed=once(child,'close').then(([code])=>{if(code!==0){const error=new RecoveryError('NATIVE_DATABASE_COMMAND_FAILED');const number=/(?:ERROR|error:)\s*(\d{3,5})/.exec(diagnostic)?.[1];error.diagnosticCode=number?'NATIVE_'+number:/unknown (?:option|variable)/i.test(diagnostic)?'INVALID_NATIVE_OPTION':'NATIVE_EXIT_'+code;diagnostic='';throw error}diagnostic=''}).catch(error=>{if(error instanceof RecoveryError)throw error;fail('NATIVE_DATABASE_COMMAND_FAILED')})
 completed.catch(()=>{})
 return {child,completed}
}
async function state(file,value){const h=await open(file,'w',0o600);try{await h.writeFile(JSON.stringify(value)+'\n');await h.sync()}finally{await h.close()}}
function stop(signal){if(signal?.aborted)fail('RECOVERY_INTERRUPTED')}
function safe(error,fallback){if(error instanceof RecoveryError)return error;if(error instanceof MigrationError)return new RecoveryError(error.code);if(['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR','ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(error.code))return new RecoveryError('MISSING_RECOVERY_PRIVILEGES');const failure=new RecoveryError(fallback);failure.diagnosticCode=/^[A-Z0-9_]{1,64}$/.test(error.code??'')?error.code:'UNKNOWN';return failure}

export async function backup({policy:raw,user,password,bin,outputRoot,encryptionKey,keyId,signal,audit=async()=>{}}){
 const began=performance.now()
 const policy=localPolicy(raw),key=keys(encryptionKey)
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(keyId??''))fail('EXPLICIT_BACKUP_KEY_ID_REQUIRED')
 await checkClient(path.join(bin,'mariadb-dump.exe'))
 const output=await protectOutput(outputRoot),temp=await privateDirectory(),cnf=path.join(temp,'client.cnf')
 const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),base='magicreview-'+stamp+'_'+randomUUID(),archive=base+'.sql.aesgcm',part=path.join(output,archive+'.partial'),final=path.join(output,archive),manifestFile=path.join(output,base+'.manifest.json')
 const pool=poolFor(policy,user,password);let db,lock,command,success=false,ownsPart=false,ownsFinal=false,ownsManifest=false
 try{
  await clientConfiguration(policy,user,password,temp);db=await pool.getConnection();lock=await acquire(db,policy);stop(signal)
  const before=await snapshot(db),tables=Object.keys(before.data)
  // READ locks pause source writes/DDL while inventory, counts and native dump
  // are compared. The separate dump session still uses a consistent transaction.
  await db.query('LOCK TABLES '+tables.flatMap(t=>[quote(t)+' READ',quote(t)+' AS '+quote('c_'+t)+' READ',quote(t)+' AS '+quote('p_'+t)+' READ']).join(','))
  const snapshotCapturedAt=new Date().toISOString(),captured=await snapshot(db);await audit({event:'source_locked'});stop(signal)
  command=native(path.join(bin,'mariadb-dump.exe'),cnf,policy,['--single-transaction','--quick','--skip-lock-tables','--triggers','--hex-blob','--no-tablespaces','--skip-add-drop-table','--skip-add-drop-trigger','--skip-add-locks','--skip-disable-keys','--complete-insert','--skip-comments','--skip-dump-date'],signal)
  command.child.stdin.end()
  const [encoding,completion]=await Promise.allSettled([encryptDump(command.child.stdout,part,key),command.completed]);ownsPart=encoding.status==='fulfilled';if(completion.status==='rejected')throw completion.reason;if(encoding.status==='rejected')throw encoding.reason;const encoded=encoding.value;stop(signal)
  const after=await snapshot(db);if(digest(captured)!==digest(after))fail('SOURCE_CHANGED_DURING_BACKUP')
  stop(signal)
  const [[owned]]=await db.execute('SELECT IS_USED_LOCK(?)=CONNECTION_ID() AS owned',[lock]);if(Number(owned.owned)!==1)fail('RECOVERY_LOCK_LOST')
  await publish(part,final);ownsFinal=true;await unlink(part);ownsPart=false
  await writeManifest(manifestFile,{format:1,complete:true,mariadbVersion:'11.8.9',clientVersion:'11.8.9',mechanism:'mariadb-dump',createdAt:new Date().toISOString(),snapshotCapturedAt,keyId,sourceFingerprint:digest(policy),archive,...encoded,snapshot:captured,consistency:'named migration lock + all-table READ locks + single-transaction dump'},key)
  ownsManifest=true
  await decryptVerified(manifestFile,key);success=true;await audit({event:'backup_integrity_verified'})
  return {manifestFile,archiveFile:final,tableCount:tables.length,triggerCount:captured.triggerDefiners.length,restoreVerified:false,durationMs:Math.round(performance.now()-began)}
 }catch(error){throw safe(error,'BACKUP_FAILED')}
 finally{
  if(command){if(command.child.exitCode===null&&!command.child.killed)command.child.kill();await command.completed.catch(()=>{})}
  if(db){await db.query('UNLOCK TABLES').catch(()=>{});if(lock)await db.execute('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{});db.destroy()}
  await pool.end();await cleanup(temp,[cnf])
  if(!success){for(const file of [ownsPart?part:null,ownsFinal?final:null,ownsManifest?manifestFile:null].filter(Boolean))await unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e});await rmdir(output)}
 }
}
export async function verify({manifestFile,encryptionKey}){try{const m=await decryptVerified(manifestFile,keys(encryptionKey));return {integrityVerified:true,restoreVerified:false,keyId:m.keyId,snapshotCapturedAt:m.snapshotCapturedAt,archiveCreatedAt:m.createdAt,tableCount:Object.keys(m.snapshot.data).length}}catch(error){throw safe(error,'BACKUP_INTEGRITY_FAILED')}}

export async function restore({policy:raw,user,password,bin,manifestFile,encryptionKey,confirmation,outputRoot,signal,audit=async()=>{}}){
 const began=performance.now()
 const policy=localPolicy(raw),key=keys(encryptionKey)
 if(confirmation!==`RESTORE-EMPTY:${digest(policy)}`)fail('EXPLICIT_RESTORE_CONFIRMATION_REQUIRED')
 await checkClient(path.join(bin,'mariadb.exe'))
 const temp=await privateDirectory(),cnf=path.join(temp,'client.cnf'),plain=path.join(temp,'verified.sql'),output=await protectOutput(outputRoot),stateFile=path.join(output,'restore-state.json')
 const pool=poolFor(policy,user,password);let db,lock,command,started=false,backupSha256
 try{
  const metadata=await decryptVerified(manifestFile,key,plain);backupSha256=metadata.sha256;stop(signal)
  const {files}=await releaseDefinition();if(digest(files.map(file=>file.checksum.toString('hex')))!==digest(metadata.snapshot.releaseChecksums))fail('BACKUP_RELEASE_MISMATCH')
  await clientConfiguration(policy,user,password,temp);db=await pool.getConnection();lock=await acquire(db,policy)
  const [[existing]]=await db.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')
  if(BigInt(existing.n)!==0n)fail('RESTORE_TARGET_MUST_BE_EMPTY')
  const [[other]]=await db.query('SELECT (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE())+(SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE()) AS n')
  if(BigInt(other.n)!==0n)fail('RESTORE_TARGET_MUST_BE_EMPTY')
  await state(stateFile,{status:'importing',targetFingerprint:digest(policy),backupSha256:metadata.sha256});started=true;await audit({event:'import_started',stateFile});stop(signal)
  command=native(path.join(bin,'mariadb.exe'),cnf,policy,['--binary-mode'],signal);command.child.stdout.on('data',()=>{})
  await pipeline(createReadStream(plain),command.child.stdin);await command.completed;await audit({event:'import_completed'});stop(signal)
  const restored=await snapshot(db)
  if(digest(restored)!==digest(metadata.snapshot))fail('RESTORED_DATABASE_MISMATCH')
  stop(signal)
  const [[owned]]=await db.execute('SELECT IS_USED_LOCK(?)=CONNECTION_ID() AS owned',[lock]);if(Number(owned.owned)!==1)fail('RECOVERY_LOCK_LOST')
  await state(stateFile,{status:'verified',targetFingerprint:digest(policy),backupSha256:metadata.sha256,snapshotDigest:restored.snapshotDigest,relationships:restored.relationships,counts:Object.fromEntries(Object.entries(restored.data).map(([t,d])=>[t,d.rows]))});await audit({event:'restore_verified'})
  return {restoreVerified:true,stateFile,tableCount:Object.keys(restored.data).length,triggerCount:restored.triggerDefiners.length,relationships:restored.relationships,snapshotDigest:restored.snapshotDigest,durationMs:Math.round(performance.now()-began)}
 }catch(error){const failure=safe(error,'RESTORE_FAILED');if(started)await state(stateFile,{status:'failed-unverified',code:failure.code,targetFingerprint:digest(policy),backupSha256});throw failure}
 finally{
  if(command){if(command.child.exitCode===null&&!command.child.killed)command.child.kill();await command.completed.catch(()=>{})}
  if(db){if(lock)await db.execute('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{});db.destroy()}
  await pool.end();await cleanup(temp,[cnf,plain]);
  if(!started)await rmdir(output)
 }
}
