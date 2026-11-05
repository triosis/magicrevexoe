import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto'
import {Secret,TOTP} from 'otpauth'
import QRCode from 'qrcode'
import type {PoolConnection,RowDataPacket} from 'mysql2/promise'
import {select,type Database} from './database.js'
import {tokenDigest} from './tokens.js'
import {HttpError} from '../middleware/error-handler.js'

export class MfaFactors {
 constructor(private readonly key?:Uint8Array){if(key&&key.byteLength!==32)throw Error('Invalid AUTH_MFA_KEY configuration')}
 private requiredKey(){if(!this.key)throw new HttpError(503,'MFA temporarily unavailable');return this.key}
 available(){this.requiredKey()}
 private seal(user:string,secret:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.requiredKey(),iv);cipher.setAAD(Buffer.from('MagicReview MFA:'+user));const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted])}
 private open(user:string,value:Buffer){try{const cipher=createDecipheriv('aes-256-gcm',this.requiredKey(),value.subarray(0,12));cipher.setAAD(Buffer.from('MagicReview MFA:'+user));cipher.setAuthTag(value.subarray(12,28));return Buffer.concat([cipher.update(value.subarray(28)),cipher.final()]).toString('utf8')}catch{throw new HttpError(503,'MFA temporarily unavailable')}}
 private otp(secret:string,label='Platform administrator'){return new TOTP({issuer:'MagicReview AI',label,secret:Secret.fromBase32(secret),algorithm:'SHA1',digits:6,period:30})}
 async row(db:PoolConnection,user:string){// Caller holds the user row lock: use a current read before initialization.
  if(!(await select(db,'SELECT user_id FROM user_mfa WHERE user_id=? FOR UPDATE',[user]))[0])await db.execute('INSERT INTO user_mfa(user_id) VALUES (?)',[user]);return (await select(db,'SELECT *,locked_until>UTC_TIMESTAMP(6) AS locked,pending_expires_at>UTC_TIMESTAMP(6) AS pending_valid FROM user_mfa WHERE user_id=? FOR UPDATE',[user]))[0]!}
 async enroll(db:PoolConnection,user:string,session:string,email:string){const row=await this.row(db,user);if(row.enabled_at)throw new HttpError(409,'MFA already enabled');if(Number(row.locked))throw new HttpError(429,'Too many MFA attempts');let secret:string;if(row.pending_session_id===session&&Number(row.pending_valid)&&row.pending_cipher)secret=this.open(user,row.pending_cipher);else{secret=new Secret({size:20}).base32;await db.execute('UPDATE user_mfa SET pending_cipher=?,pending_session_id=?,pending_expires_at=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 5 MINUTE) WHERE user_id=?',[this.seal(user,secret),session,user])}return QRCode.toBuffer(this.otp(secret,email).toString(),{type:'png',errorCorrectionLevel:'M',width:320,margin:4})}
 async verify(db:PoolConnection,user:string,session:string,code:string,enroll=false){
  const row=await this.row(db,user)
  if(Number(row.locked))throw new HttpError(429,'Too many MFA attempts')
  const cipher=enroll?(row.pending_session_id===session&&Number(row.pending_valid)&&!row.enabled_at?row.pending_cipher:null):row.secret_cipher
  let success=false,recovery=false,step:number|null=null
  if(cipher&&/^\d{6}$/.test(code)){
   const timestamp=Date.now(),otp=this.otp(this.open(user,cipher)),delta=otp.validate({token:code,timestamp,window:1,afterCounter:row.last_step===null?null:Number(row.last_step)})
   if(delta!==null){step=otp.counter({timestamp})+delta;success=true}
  }else if(!enroll&&row.enabled_at&&/^[A-Za-z0-9_-]{32}$/.test(code)){
   const result=await db.execute('UPDATE mfa_recovery_codes SET consumed_at=UTC_TIMESTAMP(6) WHERE user_id=? AND code_hash=? AND consumed_at IS NULL',[user,tokenDigest(code)])
   success=Number((result[0] as {affectedRows:number}).affectedRows)===1;recovery=success
  }
  if(!success){await db.execute('UPDATE user_mfa SET failed_attempts=IF(locked_until IS NOT NULL AND locked_until<=UTC_TIMESTAMP(6),1,failed_attempts+1),locked_until=IF(failed_attempts>=5,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 15 MINUTE),NULL) WHERE user_id=?',[user]);return null}
  await db.execute('UPDATE user_mfa SET failed_attempts=0,locked_until=NULL,last_step=COALESCE(?,last_step) WHERE user_id=?',[step,user])
  if(enroll)await db.execute('UPDATE user_mfa SET secret_cipher=pending_cipher,enabled_at=UTC_TIMESTAMP(6),pending_cipher=NULL,pending_session_id=NULL,pending_expires_at=NULL WHERE user_id=?',[user])
  return {recovery}
 }
 async recoveryCodes(db:PoolConnection,user:string){await db.execute('UPDATE mfa_recovery_codes SET consumed_at=COALESCE(consumed_at,UTC_TIMESTAMP(6)) WHERE user_id=?',[user]);const codes=Array.from({length:10},()=>randomBytes(24).toString('base64url'));for(const code of codes)await db.execute('INSERT INTO mfa_recovery_codes(user_id,code_hash) VALUES (?,?)',[user,tokenDigest(code)]);return codes}
 async enabled(db:Database,user:string){return !!(await select<RowDataPacket>(db,'SELECT enabled_at FROM user_mfa WHERE user_id=?',[user]))[0]?.enabled_at}
}
