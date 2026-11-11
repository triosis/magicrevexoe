// Read-only prerequisite inventory, NOT a deployment/recovery executor.
import {readFile,lstat,realpath,open} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const exec=promisify(execFile)

export function assessVersions({osRelease,node,mariadbd,client,dump,nginx}){
 const failures=[]
 if(!/^ID=ubuntu$/m.test(osRelease)||!/^VERSION_ID="?24\.04"?$/m.test(osRelease))failures.push('UBUNTU_24_04_REQUIRED')
 if(!/^v24\./.test(node))failures.push('NODE_24_REQUIRED')
 for(const [name,value] of Object.entries({mariadbd,client,dump}))if(!/11\.8\.\d+[^\n]*MariaDB/i.test(value))failures.push(name.toUpperCase()+'_11_8_REQUIRED')
 if(!/^nginx version: nginx\//.test(nginx))failures.push('NGINX_REQUIRED')
 return failures
}
export async function collect({root,report}){
 // Must fail before filesystem probes/report creation on an unsupported host.
 if(process.platform!=='linux')throw Error('LINUX_REQUIRED_NO_PROBES_EXECUTED')
 if(!root||!report||!path.isAbsolute(root)||!path.isAbsolute(report))throw Error('EXPLICIT_ABSOLUTE_PATHS_REQUIRED')
 const resolved=await realpath(root),info=await lstat(root)
 if(root!==resolved||!info.isDirectory()||(info.mode&0o077)!==0||info.uid!==process.getuid()||resolved==='/')throw Error('PRIVATE_OWNED_DISPOSABLE_ROOT_REQUIRED')
 const markerFile=path.join(root,'.magicreview-disposable.json'),markerInfo=await lstat(markerFile)
 if(!markerInfo.isFile()||markerInfo.isSymbolicLink()||markerInfo.uid!==process.getuid()||(markerInfo.mode&0o077)!==0)throw Error('PRIVATE_DISPOSABLE_MARKER_REQUIRED')
 const marker=JSON.parse(await readFile(markerFile,'utf8'))
 if(marker.format!==1||marker.disposable!==true||!/^[a-f0-9-]{36}$/.test(marker.runId)||marker.networkIsolated!==true)throw Error('DISPOSABLE_ATTESTATION_REQUIRED')
 if(path.dirname(report)!==resolved)throw Error('REPORT_MUST_BE_DIRECT_CHILD_OF_DISPOSABLE_ROOT')
 const env={PATH:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C',LC_ALL:'C'}
 const tools={}
 for(const [name,args] of Object.entries({mariadbd:['--no-defaults','--version'],mariadb:['--no-defaults','--version'],'mariadb-dump':['--no-defaults','--version'],nginx:['-v'],openssl:['version'],'systemd-analyze':['--version']})){
  try{const r=await exec(name,args,{env,timeout:5000,maxBuffer:16384});tools[name]=(r.stdout||r.stderr).trim().split('\n')[0]}
  catch{tools[name]='UNAVAILABLE'}
 }
 const osRelease=await readFile('/etc/os-release','utf8')
 const failures=assessVersions({osRelease,node:process.version,mariadbd:tools.mariadbd,client:tools.mariadb,dump:tools['mariadb-dump'],nginx:tools.nginx})
 const pid1=(await readFile('/proc/1/comm','utf8')).trim()
 const result={format:1,runId:marker.runId,platform:process.platform,node:process.version,osRelease,tools,pid1,
  prerequisiteStatus:failures.length?'BLOCKED':'INVENTORY_MATCHES',failures,
  isolationEvidence:'OPERATOR_ATTESTED_ONLY_NOT_INDEPENDENTLY_VERIFIED',
  linuxIntegrationTests:'NOT_RUN',systemdLifecycle:pid1==='systemd'?'AVAILABLE_NOT_TESTED':'BLOCKED_NO_SYSTEMD_PID1',
  production:'NO_GO'}
 const handle=await open(report,'wx',0o600);try{await handle.writeFile(JSON.stringify(result,null,2)+'\n');await handle.sync()}finally{await handle.close()}
 return result
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2)
  if(args.length!==4||args[0]!=='--root'||args[2]!=='--report')throw Error('USAGE_EXPLICIT_ROOT_AND_NEW_REPORT')
  const result=await collect({root:args[1],report:args[3]})
  console.log(JSON.stringify({status:result.prerequisiteStatus,linuxTests:'NOT_RUN',production:'NO_GO'}));if(result.failures.length)process.exitCode=1
 }catch(error){console.error(error.code==='EEXIST'?'REPORT_ALREADY_EXISTS':error.message?.match(/^[A-Z0-9_]+$/)?error.message:'LINUX_INVENTORY_REFUSED');process.exitCode=1}
}
