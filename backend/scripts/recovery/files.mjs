import {mkdtemp,chmod,writeFile,unlink,rmdir,stat,realpath} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {fail} from './snapshot.mjs'
const exec=promisify(execFile)
export function nativeEnvironment(environment=process.env){const allowed=new Set(['SYSTEMROOT','WINDIR','PATH','PATHEXT','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','COMSPEC','LANG','TZ','LOCALAPPDATA','APPDATA']);return Object.fromEntries(Object.entries(environment).filter(([key])=>allowed.has(key.toUpperCase())))}
export const workspace=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)))
export async function secureDirectory(directory){
 await chmod(directory,0o700)
 if(process.platform==='win32'){
  const {stdout}=await exec('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true,timeout:5000,env:nativeEnvironment()})
  const sid=/S-1-[0-9-]+/.exec(stdout)?.[0];if(!sid)fail('PRIVATE_DIRECTORY_ACL_FAILED')
  await exec('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`],{windowsHide:true,timeout:5000,env:nativeEnvironment()})
 }else if(((await stat(directory)).mode&0o077)!==0)fail('PRIVATE_DIRECTORY_REQUIRED')
}
export async function privateDirectory(){const dir=await mkdtemp(path.join(tmpdir(),'magicreview-recovery-'));await secureDirectory(dir);return dir}
export async function protectOutput(directory){
 const resolved=await realpath(directory),root=await realpath(workspace)
 const normalized=s=>process.platform==='win32'?s.toLowerCase():s
 if(normalized(resolved)===normalized(root)||normalized(resolved).startsWith(normalized(root)+path.sep)||/(?:^|[\\/])(public|public_html|wwwroot|htdocs|dist|www)(?:[\\/]|$)/i.test(resolved))fail('BACKUP_OUTSIDE_PUBLIC_WORKSPACE_REQUIRED')
 const owned=await mkdtemp(path.join(resolved,'magicreview-backup-'));await secureDirectory(owned);return owned
}
export async function clientConfiguration(policy,user,password,directory){
 const escape=value=>String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\n','\\n').replaceAll('\r','\\r')
 if(!user||!password||user.includes('\0')||password.includes('\0'))fail('EXPLICIT_CREDENTIALS_REQUIRED')
 if(policy.environment!=='local'||!['127.0.0.1','::1'].includes(policy.host))fail('DISPOSABLE_LOCAL_TARGET_REQUIRED')
 const file=path.join(directory,'client.cnf')
 // This utility only handles disposable loopback instances, matching the
 // existing non-TLS test pool. It does not offer a remote certificate bypass.
 await writeFile(file,`[client]\nhost="${escape(policy.host)}"\nport=${policy.port}\nuser="${escape(user)}"\npassword="${escape(password)}"\nprotocol=tcp\nssl=0\ndefault-character-set=utf8mb4\n`,{flag:'wx',mode:0o600})
 return file
}
export async function cleanup(directory,files){
 for(const file of files){const absolute=path.resolve(file);if(path.dirname(absolute)!==path.resolve(directory))fail('UNSAFE_CLEANUP_PATH');await unlink(absolute).catch(e=>{if(e.code!=='ENOENT')throw e})}
 await rmdir(directory)
}
export async function checkClient(binary){
 try{const {stdout}=await exec(binary,['--no-defaults','--version'],{windowsHide:true,timeout:5000,env:nativeEnvironment()});if(!/11\.8\.9-MariaDB/.test(stdout))fail('UNSUPPORTED_BACKUP_CLIENT')}
 catch{fail('UNSUPPORTED_BACKUP_CLIENT')}
}
