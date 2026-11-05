/* oxlint-disable react/only-export-components -- Typed UI helpers are intentionally colocated with components. */
import {useRef,useState,type FormEvent} from 'react'
import {api,errorMessage} from './api'
import {LiveBrand} from './navigation'
import type {PublicFunnel,RatingName} from './types'
import {LoadState,Notice,useLoad} from './ui'
const names:RatingName[]=['overallRating','serviceRating','cleanlinessRating','waitingTimeRating']
export function validPublicFunnel(data:PublicFunnel){
 const privateOption=data?.options?.privateFeedback,google=data?.options?.googleReview
 if(!privateOption||!google||privateOption.independent!==true||google.independent!==true||data.feedbackPolicy?.structuredOnly!==true||data.feedbackPolicy.medicalDetailsAllowed!==false)return false
 if(!/^https:\/\/search\.google\.com\/local\/writereview\?placeid=[A-Za-z0-9_-]{1,255}$/.test(google.url))return false
 const fields=privateOption.fields
 return Array.isArray(fields)&&fields.length>0&&fields.length<=4&&new Set(fields.map(f=>f.name)).size===fields.length&&fields.some(f=>f.name==='overallRating'&&f.required)&&fields.every(f=>names.includes(f.name)&&f.type==='integer'&&f.minimum===1&&f.maximum===5)
}
export function PublicPage({code}:{code:string}){
 const load=useLoad('public:'+code,async()=>{const data=await api.public<PublicFunnel>('/public/funnels/'+encodeURIComponent(code));if(!validPublicFunnel(data))throw Error('Invalid public configuration');return data})
 const [open,setOpen]=useState(false),[notice,setNotice]=useState('')
 function event(name:string){void api.public('/public/funnels/'+encodeURIComponent(code)+'/events','POST',{event:name}).catch(()=>setNotice('Your selection could not be counted. Both review options remain available.'))}
 return <div className="live-root live-public"><LiveBrand/><main className="live-public-card"><LoadState loading={load.loading} error={load.error?'This review link is unavailable. It may have expired or been disabled.':undefined} retry={load.reload}/>{load.data&&<><span className="live-eyebrow">{load.data.industryChannel.name}</span><h1>{load.data.merchant.name}</h1><p className="live-public-branch">{load.data.branch.name}{load.data.branch.address&&<> · {load.data.branch.address}</>}</p><h2>{load.data.channelVersion.title}</h2><p>Choose either option. Both are available independently.</p><div className="live-parallel" aria-label="Independent review options"><a className="live-button" href={load.data.options.googleReview.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={()=>event('google_option_selected')}>{load.data.options.googleReview.label} ↗</a><button className="live-button" onClick={()=>{setOpen(true);event('private_feedback_option_selected')}}>{load.data.options.privateFeedback.label}</button></div>{notice&&<Notice>{notice}</Notice>}{open&&<PublicFeedback key={code+load.data.options.privateFeedback.submissionToken?.token} code={code} funnel={load.data} reload={load.reload}/>}<p className="live-muted">Private feedback is anonymous and uses service ratings only. Do not share medical information. Google reviews are public.</p></>}</main><p className="live-public-foot">A little feedback. A meaningful difference.</p></div>
}
export function PublicFeedback({code,funnel,reload}:{code:string;funnel:PublicFunnel;reload:()=>void}){
 const [busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[attempted,setAttempted]=useState(false),attempt=useRef<Record<string,string|number>|null>(null)
 const option=funnel.options.privateFeedback
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||confirmation)return
  if(!attempt.current){const data=new FormData(e.currentTarget),body:Record<string,string|number>={submissionToken:option.submissionToken.token};for(const field of option.fields){const answer=String(data.get(field.name)??'');if(answer)body[field.name]=Number(answer)}attempt.current=body}
  setAttempted(true);setBusy(true);setError('')
  try{const result=await api.public<{accepted:boolean;confirmationId:string}>('/public/funnels/'+encodeURIComponent(code)+'/feedback','POST',attempt.current);setConfirmation(result.confirmationId)}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 if(!option.submissionAvailable)return <Notice>Private submission is temporarily unavailable. You can still choose the independent Google review option.</Notice>
 return <section className="live-private-form"><h2>Private service feedback</h2>{confirmation?<Notice>Thank you. Your feedback was received. Confirmation: <strong>{confirmation}</strong></Notice>:<form onSubmit={submit} className="live-form"><fieldset disabled={busy||attempted}>{option.fields.map(field=><div className="live-field" key={field.name}><label htmlFor={'rating-'+field.name}>{field.label??'Overall service experience'}{!field.required&&' (optional)'}</label><select id={'rating-'+field.name} name={field.name} required={field.required} defaultValue=""><option value="">Choose a rating</option>{[1,2,3,4,5].map(r=><option value={r} key={r}>{r} out of 5</option>)}</select></div>)}</fieldset><button className="live-button" disabled={busy} type="submit">{busy?'Sending…':attempted?'Retry same submission':'Send private feedback'}</button>{error&&<Notice error>{error} Your answers remain fixed for a duplicate-safe retry. <button className="live-text-button" type="button" onClick={reload}>Load a new form</button></Notice>}</form>}</section>
}
