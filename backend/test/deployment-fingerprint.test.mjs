import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,unlink,rmdir} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {deploymentFingerprint} from '../scripts/deployment-fingerprint.mjs'

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'revexoe-release-test-'))
 const files=['package.json','package-lock.json','docs/schema-manifest.json','migrations/000000_schema_migrations.sql','dist/server.js','dist/app.js','.env']
 for(const directory of ['dist','migrations','docs'])await mkdir(join(root,directory))
 for(const file of files)await writeFile(join(root,file),file==='.env'?'SECRET=private-test-canary':'synthetic release '+file)
 return {root,async close(){for(const file of files)await unlink(join(root,file)).catch(()=>{});for(const directory of ['dist','migrations','docs'])await rmdir(join(root,directory));await rmdir(root)}}
}
test('release fingerprint is deterministic and excludes environment values',async()=>{
 const f=await fixture();try{const first=await deploymentFingerprint(f.root);assert.deepEqual(first,await deploymentFingerprint(f.root));assert.equal(first.files.length,6);assert.ok(!JSON.stringify(first).includes('private-test-canary'));await writeFile(join(f.root,'.env'),'SECRET=another-private-test-canary');assert.deepEqual(first,await deploymentFingerprint(f.root))}finally{await f.close()}
})
test('compiled artifact or migration changes alter the release fingerprint',async()=>{
 const f=await fixture();try{let before=(await deploymentFingerprint(f.root)).artifactSha256;for(const file of ['dist/app.js','migrations/000000_schema_migrations.sql']){await writeFile(join(f.root,file),'changed synthetic artifact');const after=(await deploymentFingerprint(f.root)).artifactSha256;assert.notEqual(before,after);before=after}}finally{await f.close()}
})
test('incomplete compiled release refuses a misleading fingerprint',async()=>{
 const f=await fixture();try{await unlink(join(f.root,'dist/server.js'));await assert.rejects(deploymentFingerprint(f.root),/Compiled backend artifacts required/)}finally{await f.close()}
})
