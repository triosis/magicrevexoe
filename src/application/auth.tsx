/* oxlint-disable react/only-export-components -- Typed UI helpers are intentionally colocated with components. */
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {api,errorMessage} from './api'
import type {Me} from './types'
import {kindName} from './types'
import {ActionForm,Field,Notice,value} from './ui'
import {Link,LiveBrand,navigate} from './navigation'

type AuthState={me:Me|null;loading:boolean;error:string;login:(email:string,password:string)=>Promise<void>;select:(membershipId:string)=>Promise<void>;logout:()=>Promise<void>;reload:()=>Promise<void>}
const Context=createContext<AuthState|null>(null)
export function AuthProvider({children}:{children:ReactNode}){
 const [me,setMe]=useState<Me|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let alive=true;const unsubscribe=api.subscribe(()=>{if(alive){setMe(null);setError('Your session ended. Please sign in again.')}});api.restore().then(profile=>{if(alive)setMe(profile)},e=>{if(alive)setError(errorMessage(e))}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false;unsubscribe()}},[])
 async function login(email:string,password:string){let profile=await api.login(email,password);if(profile.memberships.length===1)profile=await api.selectMembership(profile.memberships[0].membershipId);setMe(profile);setError('')}
 async function select(id:string){setMe(await api.selectMembership(id));setError('')}
 async function logout(){let failed=false;try{await api.logout()}catch{failed=true}setMe(null);setError(failed?'Signed out of this browser. Server revocation could not be confirmed.':'');navigate('/login')}
 return <Context.Provider value={{me,loading,error,login,select,logout,reload:async()=>setMe(await api.me())}}>{children}</Context.Provider>
}
export function useAuth(){const state=useContext(Context);if(!state)throw Error('Authentication provider missing');return state}
export function TenantPicker({onSelected}:{onSelected?:()=>void}){const {me,select}=useAuth();return <section className="live-card"><h1>Choose your workspace</h1><p>Select an active account. Permissions are checked by the service.</p>{!me?.memberships.length?<Notice>No active account is available. Contact your administrator.</Notice>:<ActionForm label="Open workspace" onSubmit={async data=>{await select(value(data,'membershipId'));onSelected?.();navigate('/app')}}><Field label="Workspace" name="membershipId"><select name="membershipId" required defaultValue={me.selectedMembership?.membershipId??me.memberships[0].membershipId}>{me.memberships.map(m=><option key={m.membershipId} value={m.membershipId}>{kindName[m.kind]} · Account {m.tenantId}</option>)}</select></Field></ActionForm>}</section>}
export function AuthPage({mode}:{mode:'login'|'forgot'|'reset'|'invite'}){
 const auth=useAuth(),[done,setDone]=useState(false),[token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')??'')
 useEffect(()=>{if(mode==='reset'||mode==='invite')window.history.replaceState(null,'',window.location.pathname)},[mode])
 const title=mode==='login'?'Welcome back.':mode==='forgot'?'A fresh start.':mode==='invite'?'Join your workspace.':'Set a new password.'
 if(mode==='login'&&auth.loading)return <div className="live-root live-auth"><LiveBrand/><Notice>Restoring your session…</Notice></div>
 if(mode==='login'&&auth.me)return <div className="live-root live-auth"><LiveBrand/><section className="live-card"><h1>Welcome back, {auth.me.user.displayName}.</h1><Link className="live-button" href="/app">Open your workspace</Link><button className="live-quiet-button" onClick={()=>void auth.logout()}>Sign out</button></section></div>
 return <div className="live-root live-auth"><LiveBrand/><section className="live-card"><span className="live-eyebrow">YOUR NEXT CHAPTER</span><h1>{title}</h1>{auth.error&&<Notice error>{auth.error}</Notice>}{done?<><Notice>{mode==='forgot'?'If the account is eligible, recovery instructions will be sent.':mode==='invite'?'Invitation accepted. Sign in to open your account.':'Password changed. Sign in with your new password.'}</Notice><Link className="live-button" href="/login">Back to sign in</Link></>:<>
 {mode==='login'?<ActionForm label="Sign in" onSubmit={async data=>{await auth.login(value(data,'email'),String(data.get('password')??''));navigate('/app')}}><Field label="Email" name="email" type="email" required maxLength={254}/><Field label="Password" name="password" type="password" required maxLength={128}/></ActionForm>:mode==='forgot'?<ActionForm label="Send recovery instructions" onSubmit={async data=>{await api.public('/auth/forgot-password','POST',{email:value(data,'email')});setDone(true)}}><Field label="Email" name="email" type="email" required maxLength={254}/></ActionForm>:!token?<Notice error>Open the secure link from your invitation or recovery message. This link has no token.</Notice>:<><p>{mode==='invite'?'If you already have an account, use its current password. Otherwise choose a password of at least 12 characters.':'Choose a password of 12–128 characters.'}</p><ActionForm label={mode==='invite'?'Accept invitation':'Change password'} onSubmit={async data=>{await api.public('/auth/'+(mode==='invite'?'accept-invitation':'reset-password'),'POST',{token,password:String(data.get('password')??'')});if(mode==='reset')api.clear();setDone(true)}}><Field label={mode==='invite'?'Account password':'New password'} name="password"><input name="password" type="password" autoComplete={mode==='invite'?'current-password':'new-password'} minLength={12} maxLength={128} required/></Field></ActionForm></>}
 {mode==='login'&&<Link className="live-text-link" href="/forgot-password">Forgot your password?</Link>}{mode!=='login'&&<Link className="live-text-link" href="/login">Back to sign in</Link>}</>}</section><p>Only invited accounts can sign in. <Link href="/">Explore MagicReview</Link></p></div>
}
