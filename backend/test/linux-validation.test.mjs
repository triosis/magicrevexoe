import assert from 'node:assert/strict'
import {test} from 'node:test'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {collect,assessVersions} from '../scripts/linux-validation/preflight.mjs'

test('Linux prerequisite classifier distinguishes exact series without claiming execution',()=>{
 const fixture={osRelease:'ID=ubuntu\nVERSION_ID="24.04"',node:'v24.14.0',mariadbd:'mariadbd Ver 11.8.9-MariaDB',client:'mariadb Ver 15.2 Distrib 11.8.9-MariaDB',dump:'mariadb-dump Ver 10.19 Distrib 11.8.9-MariaDB',nginx:'nginx version: nginx/1.24.0 (Ubuntu)'}
 assert.deepEqual(assessVersions(fixture),[])
 for(const [field,value] of [['osRelease','ID=ubuntu\nVERSION_ID="22.04"'],['node','v22.0.0'],['mariadbd','mysqld Ver 8.0'],['client','mariadb 10.11.0-MariaDB'],['dump','UNAVAILABLE'],['nginx','UNAVAILABLE']])assert.ok(assessVersions({...fixture,[field]:value}).length>0)
})
test('inventory refuses unsupported execution platform before filesystem or subprocess access',async()=>{
 if(process.platform==='linux'){
  // No disposable marker supplied: never probe the host or create a report.
  await assert.rejects(collect({root:'relative',report:'relative'}),/EXPLICIT_ABSOLUTE_PATHS_REQUIRED/)
 }else{
  await assert.rejects(collect({root:'unreadable',report:'unwritable'}),/LINUX_REQUIRED_NO_PROBES_EXECUTED/)
  const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/linux-validation/preflight.mjs',import.meta.url)),'--root','unreadable','--report','unwritable'],{env,encoding:'utf8',windowsHide:true,timeout:10000})
  assert.equal(result.status,1);assert.match(result.stderr,/LINUX_REQUIRED_NO_PROBES_EXECUTED/)
 }
})
