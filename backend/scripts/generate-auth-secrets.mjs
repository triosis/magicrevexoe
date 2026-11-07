import {randomBytes} from 'node:crypto'
import {open,realpath,stat} from 'node:fs/promises'
import {basename,dirname,isAbsolute,relative,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'

const repository=await realpath(fileURLToPath(new URL('../../',import.meta.url)))
const inside=(base,target)=>{const r=relative(base,target);return r===''||(!r.startsWith('..')&&!isAbsolute(r))}
export async function generateAuthFile(output,{firstSetup=false,privateDirectoryReviewed=false}={}){
 if(!firstSetup||!privateDirectoryReviewed||!output||!isAbsolute(output))throw Error('Explicit first-setup approval, reviewed private directory and absolute output path required')
 const parent=await realpath(dirname(output)),target=resolve(parent,basename(output))
 if(inside(repository,resolve(output))||inside(repository,parent))throw Error('Secret output must be outside the repository')
 const metadata=await stat(parent)
 if(process.platform!=='win32'&&(metadata.mode&0o077)!==0)throw Error('Private directory must deny group/other access')
 // Draw until the exact runtime byte-diversity and independence checks are met.
 function key(){let value;do{value=randomBytes(32)}while(new Set(value).size<16);return value.toString('base64')}
 const access=key();let mfa;do{mfa=key()}while(mfa===access)
 const file=await open(target,'wx',0o600)
 try{await file.writeFile(JSON.stringify({AUTH_ACCESS_SECRET:access,AUTH_MFA_KEY:mfa})+'\n');await file.sync()}finally{await file.close()}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{
 const args=process.argv.slice(2)
 if(args.length!==4||args[0]!=='--first-setup'||args[1]!=='--private-directory-reviewed'||args[2]!=='--output')throw Error()
 await generateAuthFile(args[3],{firstSetup:true,privateDirectoryReviewed:true})
 console.info('Created new private authentication-key file. No key values were printed. Transfer through approved secret custody; never replace existing MFA keys without reviewed rotation.')
 }catch{console.error('Secret generation refused or failed. Require first setup, reviewed private directory outside Git, absolute output path and a new filename. No existing file is overwritten.');process.exitCode=1}
}
