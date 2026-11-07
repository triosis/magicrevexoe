import {isIP} from 'node:net'

export const hostingerLocalAcknowledgement='I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT'
export function validLocalApprovalId(value:unknown):value is string{
 return typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{7,79}$/.test(value)&&!value.startsWith('REPLACE_WITH_')
}
export type TransportInput={NODE_ENV?:string|undefined;DB_HOST?:string|undefined;DB_PORT?:string|number|undefined;DB_TLS_MODE?:string|undefined;DB_TLS_CA_FILE?:string|undefined;DB_TLS_CA_SHA256?:string|undefined;HOSTINGER_LOCAL_APPROVAL?:string|undefined;HOSTINGER_LOCAL_APPROVAL_ID?:string|undefined}
export type TransportSelection={mode:'required'}|{mode:'disabled'}|{mode:'HOSTINGER_LOCAL';approvalId:string}

// Pure selection: no environment/file/network reads and no fallback after failure.
export function databaseTransport(input:TransportInput):TransportSelection{
 const loopback=input.DB_HOST==='127.0.0.1'||input.DB_HOST==='::1'
 const mode=input.DB_TLS_MODE??(input.NODE_ENV==='production'||!loopback?'required':'disabled')
 if(mode==='HOSTINGER_LOCAL'){
  if(input.NODE_ENV!=='production'||input.DB_HOST!=='127.0.0.1'||(input.DB_PORT!=='3306'&&input.DB_PORT!==3306))throw Error('HOSTINGER_LOCAL requires production security validation and exactly 127.0.0.1:3306')
  if(input.HOSTINGER_LOCAL_APPROVAL!==hostingerLocalAcknowledgement||!validLocalApprovalId(input.HOSTINGER_LOCAL_APPROVAL_ID))throw Error('HOSTINGER_LOCAL requires HOSTINGER_LOCAL_APPROVAL and a valid HOSTINGER_LOCAL_APPROVAL_ID')
  if(input.DB_TLS_CA_FILE!==undefined||input.DB_TLS_CA_SHA256!==undefined)throw Error('HOSTINGER_LOCAL requires DB_TLS_CA_FILE and DB_TLS_CA_SHA256 to be absent')
  return {mode,approvalId:input.HOSTINGER_LOCAL_APPROVAL_ID}
 }
 if(mode==='disabled'){
  if(input.NODE_ENV==='production'||input.DB_TLS_CA_FILE!==undefined||input.DB_TLS_CA_SHA256!==undefined)throw Error('Invalid database TLS configuration')
  if(!loopback)throw Error('Unencrypted database transport requires literal loopback')
  return {mode}
 }
 if(mode!=='required')throw Error('Invalid DB_TLS_MODE configuration')
 if(!input.DB_HOST||isIP(input.DB_HOST)||!/^[a-zA-Z0-9.-]+$/.test(input.DB_HOST))throw Error('Verified database TLS requires a DNS hostname')
 return {mode}
}
