import type {Me} from './types'
type StoredSession={refreshToken:string;membershipId?:string}
type SessionReply={accessToken:string;refreshToken:string}
export class ApiError extends Error{
 readonly status:number
 constructor(status:number,message:string){super(message);this.status=status}
}
export const errorMessage=(error:unknown)=>error instanceof ApiError?error.message:'Something went wrong. Please try again.'
const storageKey='magicreview.session.v1'
export class ApiClient{
 private readonly transport:typeof fetch
 private readonly storage:Storage|undefined
 private readonly listeners=new Set<()=>void>()
 private accessToken:string|undefined
 private session:StoredSession|undefined
 private refreshFlight:Promise<void>|undefined
 private restoreFlight:Promise<Me|null>|undefined
 private generation=0
 private configurationError=false
 readonly base:string
 constructor(base:string|undefined,transport:typeof fetch=(...args)=>fetch(...args),storage?:Storage){
  this.transport=transport;this.storage=storage
  this.base=(base??'').replace(/\/$/,'')
  if(this.base)try{const u=new URL(this.base);if(u.username||u.password||u.search||u.hash||!u.pathname.endsWith('/api/v1')||(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname))))this.configurationError=true}catch{this.configurationError=true}
  try{const stored=JSON.parse(storage?.getItem(storageKey)??'null');if(stored&&typeof stored.refreshToken==='string'&&/^[A-Za-z0-9_-]{43}$/.test(stored.refreshToken))this.session={refreshToken:stored.refreshToken,...(typeof stored.membershipId==='string'&&/^[1-9][0-9]{0,19}$/.test(stored.membershipId)?{membershipId:stored.membershipId}:{})};else storage?.removeItem(storageKey)}catch{try{storage?.removeItem(storageKey)}catch{/* Browser storage unavailable; stay signed out. */}}
 }
 private persist(){try{if(this.session)this.storage?.setItem(storageKey,JSON.stringify(this.session));else this.storage?.removeItem(storageKey)}catch{/* Memory-only session when tab storage is unavailable. */}}
 subscribe(listener:()=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener)}}
 clear(){this.generation++;this.accessToken=undefined;this.session=undefined;this.persist();for(const listener of this.listeners)listener()}
 private async send(path:string,method:string,body:unknown,token?:string,blob=false):Promise<unknown>{
  if(!this.base||this.configurationError)throw new ApiError(0,'Set a valid VITE_API_URL to connect this application to your backend.')
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('..')||/[\r\n]/.test(path))throw new ApiError(0,'Invalid API path')
  let response:Response
  try{response=await this.transport(this.base+path,{method,credentials:'omit',headers:{Accept:blob?'image/svg+xml, image/png':'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})})}catch{throw new ApiError(0,'Could not reach the service. A submitted change may already have been saved; check its current state before retrying.')}
  if(!response.ok){let message=`Request failed (${response.status}).`;try{const value=await response.json();if(typeof value.error==='string'&&value.error.length<=200)message=value.error}catch{/* Never display server HTML/driver details. */}throw new ApiError(response.status,message)}
  if(response.status===204)return undefined
  if(blob)return response.blob()
  try{return await response.json()}catch{throw new ApiError(0,'The service returned an unexpected response.')}
 }
 private async rotate(){
  if(this.refreshFlight)return this.refreshFlight
  const session=this.session,epoch=this.generation
  if(!session)throw new ApiError(401,'Your session has expired. Please sign in again.')
  this.refreshFlight=(async()=>{
   try{
    // A refresh POST is never automatically retried after ambiguous network failure.
    const reply=await this.send('/auth/refresh','POST',{refreshToken:session.refreshToken}) as SessionReply
    if(epoch!==this.generation)throw new ApiError(401,'Session changed. Please sign in again.')
    this.accessToken=reply.accessToken;this.session={...session,refreshToken:reply.refreshToken};this.persist()
    if(session.membershipId){try{const selected=await this.send('/auth/select-tenant','POST',{membershipId:session.membershipId},this.accessToken) as {accessToken:string};if(epoch!==this.generation)throw new ApiError(401,'Session changed');this.accessToken=selected.accessToken}catch(error){if(error instanceof ApiError&&[403,404].includes(error.status)){this.session={refreshToken:reply.refreshToken};this.persist()}else throw error}}
   }catch(error){if(epoch===this.generation)this.clear();throw error}
  })().finally(()=>{this.refreshFlight=undefined})
  return this.refreshFlight
 }
 async request<T>(path:string,method='GET',body?:unknown,authenticated=true,blob=false):Promise<T>{
  if(authenticated&&!this.accessToken)await this.rotate()
  const used=this.accessToken,epoch=this.generation
  try{return await this.send(path,method,body,authenticated?used:undefined,blob) as T}catch(error){
   if(!(error instanceof ApiError)||error.status!==401||!authenticated)throw error
   if(epoch!==this.generation||!this.session)throw new ApiError(401,'Your session has expired. Please sign in again.')
   if(this.accessToken===used)await this.rotate()
   try{return await this.send(path,method,body,this.accessToken,blob) as T}catch(retryError){if(retryError instanceof ApiError&&retryError.status===401)this.clear();throw retryError}
  }
 }
 async login(email:string,password:string){const epoch=++this.generation;const reply=await this.send('/auth/login','POST',{email,password}) as SessionReply;if(epoch!==this.generation)throw new ApiError(401,'Session changed');this.accessToken=reply.accessToken;this.session={refreshToken:reply.refreshToken};this.persist();return this.me()}
 me(){return this.request<Me>('/auth/me')}
 restore(){if(this.restoreFlight)return this.restoreFlight;this.restoreFlight=(async()=>{if(!this.session)return null;await this.rotate();return this.me()})().finally(()=>{this.restoreFlight=undefined});return this.restoreFlight}
 async selectMembership(membershipId:string){const epoch=this.generation;const selected=await this.request<{accessToken:string}>('/auth/select-tenant','POST',{membershipId});if(epoch!==this.generation||!this.session)throw new ApiError(401,'Session changed');this.accessToken=selected.accessToken;this.session={...this.session,membershipId};this.persist();return this.me()}
 async logout(){try{if(this.session)await this.request('/auth/logout','POST')}finally{this.clear()}}
 public<T>(path:string,method='GET',body?:unknown){return this.request<T>(path,method,body,false)}
 asset(id:string){return this.request<Blob>('/qr-assets/'+encodeURIComponent(id)+'/content','GET',undefined,true,true)}
}
let tabStorage:Storage|undefined
try{tabStorage=window.sessionStorage}catch{/* Blocked storage remains memory-only. */}
export const api=new ApiClient(import.meta.env.VITE_API_URL,undefined,tabStorage)
