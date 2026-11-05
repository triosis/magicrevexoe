import {createCipheriv,createDecipheriv,createHash,createHmac,hkdfSync,randomBytes,timingSafeEqual} from 'node:crypto'
import {createReadStream,createWriteStream} from 'node:fs'
import {open,readFile,stat,link,unlink} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'
import {Writable,Transform} from 'node:stream'
import path from 'node:path'
import {fail} from './snapshot.mjs'
const magic=Buffer.from('MRBK0001\n'),headerBytes=magic.length+12
export function keys(encoded){
 const key=Buffer.from(encoded??'','base64');if(key.length!==32||key.toString('base64')!==encoded||new Set(key).size<16)fail('INVALID_BACKUP_ENCRYPTION_KEY')
 return {encryption:Buffer.from(hkdfSync('sha256',key,'MagicReview backup','archive encryption v1',32)),authentication:Buffer.from(hkdfSync('sha256',key,'MagicReview backup','metadata authentication v1',32))}
}
export async function hashFile(file){const hash=createHash('sha256');let bytes=0;for await(const b of createReadStream(file)){hash.update(b);bytes+=b.length}return {sha256:hash.digest('hex'),bytes}}
export async function encryptDump(input,file,key){
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key.encryption,nonce);cipher.setAAD(magic)
 const plain=createHash('sha256');let bytes=0
 const observer=new Transform({transform(chunk,_encoding,callback){plain.update(chunk);bytes+=chunk.length;callback(null,chunk)}})
 let owned=false;const output=createWriteStream(file,{flags:'wx',mode:0o600});output.on('open',()=>{owned=true})
 try{
  output.write(Buffer.concat([magic,nonce]));await pipeline(input,observer,cipher,output)
  const handle=await open(file,'a');try{await handle.write(cipher.getAuthTag());await handle.sync()}finally{await handle.close()}
  if(!bytes)fail('EMPTY_DATABASE_EXPORT')
  return {sqlSha256:plain.digest('hex'),sqlBytes:bytes,...await hashFile(file)}
 }catch(error){output.destroy();if(owned)await unlink(file);throw error}
}
export async function publish(part,final){await link(part,final)}
export async function writeManifest(file,metadata,key){const body=JSON.stringify(metadata),mac=createHmac('sha256',key.authentication).update(body).digest('hex');const h=await open(file,'wx',0o600);try{await h.writeFile(JSON.stringify({body,mac})+'\n');await h.sync()}catch(error){await h.close();await unlink(file);throw error}finally{await h.close()}}
export async function readManifest(file,key){
 try{
  if((await stat(file)).size>1024*1024)fail('BACKUP_METADATA_INVALID')
  const envelope=JSON.parse(await readFile(file,'utf8'))
  if(typeof envelope.body!=='string'||!/^[a-f0-9]{64}$/.test(envelope.mac))fail('BACKUP_METADATA_INVALID')
  const expected=createHmac('sha256',key.authentication).update(envelope.body).digest()
  if(!timingSafeEqual(expected,Buffer.from(envelope.mac,'hex')))fail('BACKUP_AUTHENTICATION_FAILED')
  const metadata=JSON.parse(envelope.body)
  if(metadata.format!==1||metadata.complete!==true||!/^magicreview-[A-Za-z0-9_-]+\.sql\.aesgcm$/.test(metadata.archive)||!metadata.snapshot?.data)fail('BACKUP_METADATA_INVALID')
  return metadata
 }catch(error){if(error.code?.startsWith('BACKUP_'))throw error;fail('BACKUP_METADATA_INVALID')}
}
export async function decryptVerified(manifestFile,key,plainFile){
 const metadata=await readManifest(manifestFile,key),archive=path.join(path.dirname(manifestFile),metadata.archive)
 const actual=await hashFile(archive);if(actual.bytes!==metadata.bytes||actual.sha256!==metadata.sha256||actual.bytes<headerBytes+16)fail('BACKUP_FILE_INTEGRITY_FAILED')
 const h=await open(archive,'r');const header=Buffer.alloc(headerBytes),tag=Buffer.alloc(16)
 try{await h.read(header,0,header.length,0);await h.read(tag,0,16,actual.bytes-16)}finally{await h.close()}
 if(!header.subarray(0,magic.length).equals(magic))fail('BACKUP_FORMAT_INVALID')
 const decipher=createDecipheriv('aes-256-gcm',key.encryption,header.subarray(magic.length));decipher.setAAD(magic);decipher.setAuthTag(tag)
 const hash=createHash('sha256');let bytes=0
 const observer=new Transform({transform(chunk,_encoding,callback){hash.update(chunk);bytes+=chunk.length;callback(null,chunk)}})
 try{await pipeline(createReadStream(archive,{start:headerBytes,end:actual.bytes-17}),decipher,observer,plainFile?createWriteStream(plainFile,{flags:'wx',mode:0o600}):new Writable({write(_chunk,_encoding,callback){callback()}}))}catch{fail('BACKUP_AUTHENTICATION_FAILED')}
 if(bytes!==metadata.sqlBytes||hash.digest('hex')!==metadata.sqlSha256)fail('BACKUP_SQL_INTEGRITY_FAILED')
 return metadata
}
