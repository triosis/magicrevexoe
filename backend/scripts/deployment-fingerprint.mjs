import {createHash} from 'node:crypto'
import {readFile,readdir,lstat} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'

// Hash only release artifacts. Never read .env, credentials, CA files or node_modules.
export async function deploymentFingerprint(root){
 const files=['package.json','package-lock.json','docs/schema-manifest.json']
 async function walk(directory,prefix,extension){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   if(entry.isSymbolicLink())throw Error('Release symlinks require review')
   const relative=prefix+'/'+entry.name,absolute=join(directory,entry.name)
   if(entry.isDirectory())await walk(absolute,relative,extension)
   else if(entry.isFile()&&entry.name.endsWith(extension))files.push(relative)
  }
 }
 await walk(join(root,'dist'),'dist','.js')
 await walk(join(root,'migrations'),'migrations','.sql')
 if(!files.includes('dist/server.js')||!files.includes('dist/app.js'))throw Error('Compiled backend artifacts required')
 const hashes=[]
 for(const file of files.sort()){
  if(!(await lstat(join(root,file))).isFile())throw Error('Regular release files required')
  hashes.push({file,sha256:createHash('sha256').update(await readFile(join(root,file))).digest('hex')})
 }
 return {format:1,artifactSha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),files:hashes}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{
  if(process.argv.length!==2)throw Error('No arguments accepted')
  console.info(JSON.stringify(await deploymentFingerprint(fileURLToPath(new URL('../',import.meta.url))),null,2))
 }catch{console.error('Release fingerprint unavailable; build backend and include package files, migrations and schema manifest. No environment values read.');process.exitCode=1}
}
