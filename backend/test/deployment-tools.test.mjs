import assert from 'node:assert/strict'
import {test} from 'node:test'
import {mkdtemp,readFile,stat,unlink,rmdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {checkServerIdentity} from 'node:tls'
import {generateAuthFile} from '../scripts/generate-auth-secrets.mjs'
import {databaseTls} from '../dist/db/pool.js'
import {configuredAuth} from '../dist/auth/configuration.js'
const execute=promisify(execFile)
test('first-setup generator writes independent canonical keys privately without overwriting',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'revexoe-keys-test-')),output=join(directory,'test-only.json');
 try{
 await generateAuthFile(output,{firstSetup:true,privateDirectoryReviewed:true});
 const content=await readFile(output,'utf8'),keys=JSON.parse(content);
 for(const value of Object.values(keys)){const raw=Buffer.from(value,'base64');assert.ok(raw.length===32&&raw.toString('base64')===value&&new Set(raw).size>=16)}
 assert.ok(keys.AUTH_ACCESS_SECRET!==keys.AUTH_MFA_KEY);
 assert.ok(configuredAuth({},keys));
 if(process.platform!=='win32')assert.equal((await stat(output)).mode&0o777,0o600);
 await assert.rejects(generateAuthFile(output,{firstSetup:true,privateDirectoryReviewed:true}));assert.ok(await readFile(output,'utf8')===content);
 }finally{await unlink(output).catch(()=>{});await rmdir(directory)}
})
test('generator requires explicit first setup and reviewed absolute private output outside repository',async()=>{
 await assert.rejects(generateAuthFile('relative.json',{firstSetup:true,privateDirectoryReviewed:true}));
 await assert.rejects(generateAuthFile(resolve('.tmp-frontend/refused-secret.json'),{firstSetup:true,privateDirectoryReviewed:true}));
 await assert.rejects(generateAuthFile(join(tmpdir(),'refused.json'),{privateDirectoryReviewed:true}));
 await assert.rejects(generateAuthFile(join(tmpdir(),'refused.json'),{firstSetup:true}));
})
test('operator CLIs reject missing approval before secrets or database are used',async()=>{
 for(const file of ['scripts/generate-auth-secrets.mjs','dist/db/diagnostic-cli.js']){
 await assert.rejects(execute(process.execPath,[file],{cwd:new URL('..',import.meta.url),env:{NODE_ENV:'production'}}),e=>e.code===1&&e.stdout===''&&!e.stderr.includes('password='));
 }
})
test('IP SAN can match the Node checker but current database policy still requires DNS',()=>{
 assert.equal(checkServerIdentity('127.0.0.1',{subjectaltname:'IP Address:127.0.0.1'}),undefined);
 assert.throws(()=>databaseTls({NODE_ENV:'production',DB_HOST:'127.0.0.1',DB_TLS_MODE:'required'}),/DNS hostname/);
})
