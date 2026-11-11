import assert from 'node:assert/strict'
import {test} from 'node:test'
import {mkdtemp,writeFile,readFile,access,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {rootCertificates} from 'node:tls'
import {createHash,randomBytes} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {targetPolicy} from '../dist/migrations/operator.js'
import {digest} from '../dist/migrations/schema.js'

// Intercept the real CLI's driver import, so even creating a pool is observable.
// No driver/network access is possible in this child. Do not inherit real secrets.
const system=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))
test('all operator commands reject invalid CA before pool creation and always use SSL when required',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'revexoe-cli-tls-'))
 try{
  const hook=join(dir,'hook.mjs'),marker=join(dir,'pool.json'),policyFile=join(dir,'target.json'),approvalFile=join(dir,'approval.json')
  await writeFile(hook,`import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){if(s==='mysql2/promise')return {url:'synthetic:driver',shortCircuit:true};return next(s,c)},load(u,c,next){if(u==='synthetic:driver')return {format:'module',shortCircuit:true,source:\`import {writeFileSync} from 'node:fs'; export function createPool(o){writeFileSync(process.env.POOL_MARKER,JSON.stringify({ssl:!!o.ssl,caBuffer:Buffer.isBuffer(o.ssl?.ca),rejectUnauthorized:o.ssl?.rejectUnauthorized,verifyIdentity:o.ssl?.verifyIdentity,minVersion:o.ssl?.minVersion}));throw Error('synthetic stop before network')}\`};return next(u,c)}});`)
  const pem=rootCertificates[0],hash=s=>createHash('sha256').update(s).digest('hex')
  const base={environment:'production',host:'localhost',port:1,database:'synthetic',serverHostname:'synthetic',expectedAccount:'synthetic@localhost',tlsCaFile:'ca.pem',tlsCaSha256:hash(pem)}
  await writeFile(approvalFile,JSON.stringify({mode:'preflight',approval:{digest:'a'.repeat(64),expiresAt:Date.now()+600000}}))
  for(const command of ['preflight','apply','check-runtime']){
   const invoke=async(policy)=>{
    await writeFile(policyFile,JSON.stringify(policy));await rm(marker,{force:true})
    const args=[command,'--target',policyFile,'--environment',policy.environment]
    if(command==='apply')args.push('--approval',approvalFile,'--audit',join(dir,'unused.jsonl'),'--confirm-production','APPLY-PRODUCTION:'+digest(targetPolicy.parse(policy)))
    return spawnSync(process.execPath,['--import',pathToFileURL(hook).href,fileURLToPath(new URL('../dist/migrations/operator-cli.js',import.meta.url)),...args],{encoding:'utf8',windowsHide:true,timeout:10000,env:{...system,POOL_MARKER:marker,MIGRATION_DB_USER:'synthetic',MIGRATION_DB_PASSWORD:randomBytes(24).toString('hex')}})
   }
   for(const [name,bytes,override] of [['missing',undefined,{}],['empty','',{}],['whitespace',' \r\n\t',{}],['malformed','-----BEGIN CERTIFICATE-----\nbad\n-----END CERTIFICATE-----',{}],['mixed-malformed',pem+'\n-----BEGIN CERTIFICATE-----\nbad\n-----END CERTIFICATE-----',{}],['hash-mismatch',pem,{tlsCaSha256:'0'.repeat(64)}],['byte-change',pem+'\r\n',{tlsCaSha256:hash(pem)}]]){
    await rm(join(dir,'ca.pem'),{force:true});if(bytes!==undefined)await writeFile(join(dir,'ca.pem'),bytes)
    const result=await invoke({...base,tlsCaSha256:bytes===undefined?base.tlsCaSha256:hash(bytes),...override})
    assert.equal(result.status,1,command+': '+name);assert.match(result.stderr,/INVALID_OR_FAILED_MIGRATION_OPERATION/)
    await assert.rejects(access(marker),command+': '+name+' created a pool')
   }
   await writeFile(join(dir,'ca.pem'),pem)
   assert.equal((await invoke(base)).status,1) // deliberate driver stop
   assert.deepEqual(JSON.parse(await readFile(marker,'utf8')),{ssl:true,caBuffer:true,rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2'})
   // Strict parser refuses missing CA policy fields before driver access as well.
   for(const field of ['tlsCaFile','tlsCaSha256']){
    const policy={...base};delete policy[field];await writeFile(policyFile,JSON.stringify(policy));await rm(marker,{force:true})
    const result=spawnSync(process.execPath,['--import',pathToFileURL(hook).href,fileURLToPath(new URL('../dist/migrations/operator-cli.js',import.meta.url)),command,'--target',policyFile,'--environment','production'],{encoding:'utf8',windowsHide:true,env:system,timeout:10000})
    assert.equal(result.status,1);await assert.rejects(access(marker))
   }
  }
 }finally{await rm(dir,{recursive:true,force:true})}
})

