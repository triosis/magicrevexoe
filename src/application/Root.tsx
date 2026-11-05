import {CatalogPanel} from './catalog'
/* oxlint-disable react/only-export-components -- Typed UI helpers are intentionally colocated with components. */
import {useState} from 'react'
import Landing from '../App'
import {api} from './api'
import {AuthPage,AuthProvider,TenantPicker,useAuth} from './auth'
import {AccountsPage,ChannelsPage} from './accounts'
import {FeedbackPage} from './feedback'
import {MerchantPage} from './merchant'
import {PublicPage} from './public'
import {has,kindName,type Membership,type Statistics} from './types'
import {Link,LiveBrand,usePath} from './navigation'
import {LoadState,Notice,PageTitle,useLoad} from './ui'
import './live.css'

export function navigationFor(member:Membership){
 return[{path:'/app',label:'Overview',visible:true},{path:'/app/accounts',label:'Accounts',visible:member.kind!=='merchant'&&has(member,'tenant.read')},{path:'/app/business',label:'Business & branches',visible:member.kind==='merchant'&&has(member,'tenant.read')},{path:'/app/channels',label:'Industry channels',visible:has(member,'tenant.read')},{path:'/app/feedback',label:'Private feedback',visible:has(member,'feedback.read')},{path:'/app/catalog',label:'Subscription catalog',visible:member.kind==='platform'&&member.roleCode==='super_admin'&&has(member,'platform.manage')},{path:'/app/profile',label:'Your profile',visible:true}].filter(item=>item.visible)
}
function Overview(){
 const member=useAuth().me!.selectedMembership!,stats=useLoad('overview-stats',()=>api.request<Statistics>('/feedback/statistics'),has(member,'feedback.read'))
 return <><PageTitle title={kindName[member.kind]+' overview'}/><section className="live-card"><span className="live-badge">Live workspace</span><h2>A clearer view of your business.</h2><p>Your selected role is {member.roleCode.replaceAll('_',' ')}. Manage your business and private service feedback in one workspace.</p><div className="live-row">{navigationFor(member).filter(n=>!['/app','/app/profile'].includes(n.path)).map(n=><Link key={n.path} className="live-quiet-button" href={n.path}>{n.label} →</Link>)}</div></section>{has(member,'feedback.read')&&<section className="live-card"><h2>Feedback at a glance</h2><LoadState {...stats} retry={stats.reload}/><div className="live-metrics">{stats.data?.groups.map(g=><div key={g.status}><span>{g.status.replace('_',' ')}</span><strong>{g.count}</strong><small>Average rating {Number(g.averageRating).toFixed(2)} / 5</small></div>)}</div>{stats.data?.groups.length===0&&<Notice>No feedback yet. Set up a branch and public review funnel to begin.</Notice>}</section>}</>
}
function Workspace({path}:{path:string}){
 const auth=useAuth(),[switching,setSwitching]=useState(false),[loggingOut,setLoggingOut]=useState(false)
 if(auth.loading)return <div className="live-root live-auth"><LiveBrand/><Notice>Restoring your session…</Notice></div>
 if(!auth.me)return <AuthPage mode="login"/>
 if(!auth.me.selectedMembership||switching)return <div className="live-root live-auth"><LiveBrand/><TenantPicker onSelected={()=>setSwitching(false)}/>{auth.me.selectedMembership&&<button className="live-quiet-button" onClick={()=>setSwitching(false)}>Return to workspace</button>}</div>
 const member=auth.me.selectedMembership,links=navigationFor(member),match=/^\/app\/merchants\/([1-9][0-9]*)$/.exec(path)
 let content
 if(path==='/app')content=<Overview/>
 else if(path==='/app/catalog'&&member.kind==='platform'&&member.roleCode==='super_admin')content=<CatalogPanel/>
 else if(path==='/app/profile')content=<><PageTitle title="Your profile"/><section className="live-card"><h2>{auth.me.user.displayName}</h2><p>{auth.me.user.email}</p><p>{kindName[member.kind]} · {member.roleCode.replaceAll('_',' ')}</p><button className="live-quiet-button" onClick={()=>setSwitching(true)}>Switch workspace</button>{member.kind==='platform'&&!auth.me.mfaImplemented&&<Notice>MFA is not implemented. Follow the platform access restrictions in your deployment policy.</Notice>}</section></>
 else if(path==='/app/accounts'&&links.some(n=>n.path===path))content=<AccountsPage/>
 else if(path==='/app/channels'&&has(member,'tenant.read'))content=<ChannelsPage/>
 else if(path==='/app/feedback'&&has(member,'feedback.read'))content=<FeedbackPage/>
 else if(path==='/app/business'&&member.kind==='merchant'&&has(member,'tenant.read'))content=<MerchantPage id={member.tenantId}/>
 else if(match&&has(member,'tenant.read')&&(member.kind!=='merchant'||member.tenantId===match[1]))content=<MerchantPage id={match[1]}/>
 else content=<Notice error>This page is not available in your selected workspace. <Link href="/app">Return to overview</Link></Notice>
 return <div className="live-root live-workspace"><a className="skip-link" href="#workspace-main">Skip to workspace</a><header className="live-header"><LiveBrand/><div><span>{auth.me.user.displayName}</span><button className="live-quiet-button" onClick={()=>setSwitching(true)}>Switch workspace</button><button className="live-quiet-button" disabled={loggingOut} onClick={async()=>{setLoggingOut(true);try{await auth.logout()}finally{setLoggingOut(false)}}}>{loggingOut?'Signing out…':'Sign out'}</button></div></header><div className="live-layout"><aside className="live-sidebar"><span className="live-eyebrow">{kindName[member.kind]}</span><nav aria-label="Workspace navigation">{links.map(link=><Link key={link.path} href={link.path} aria-current={path===link.path?'page':undefined}>{link.label}</Link>)}</nav><p>Good experiences.<br/>Great reputations.</p></aside><main id="workspace-main" tabIndex={-1} key={member.membershipId+':'+path}>{content}</main></div></div>
}
export default function Root(){const path=usePath(),publicMatch=/^\/r\/([^/]+)$/.exec(path)
 if(path==='/')return <Landing/>
 if(publicMatch)return <PublicPage key={publicMatch[1]} code={publicMatch[1]}/>
 const recovery=path==='/recover'?(new URLSearchParams(window.location.hash.slice(1)).get('purpose')==='invite'?'invite':'reset'):undefined
 const mode=path==='/login'?'login':path==='/forgot-password'?'forgot':path==='/reset-password'?'reset':path==='/accept-invitation'?'invite':recovery
 return <AuthProvider>{mode?<AuthPage key={path} mode={mode}/>:<Workspace path={path}/>}</AuthProvider>
}
