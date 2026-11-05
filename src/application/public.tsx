/* oxlint-disable react/only-export-components -- Typed UI helpers are intentionally colocated with components. */
import {useEffect,useRef,useState,type FormEvent} from 'react'
import {api,errorMessage} from './api'
import {LiveBrand} from './navigation'
import type {PublicFunnel,RatingName} from './types'
import {LoadState,Notice,useLoad} from './ui'
import {initialLanguage,languageNames,publicText,publicMessages,type Language} from './languages'
import {DraftForm} from './drafts'
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
 const [open,setOpen]=useState(false),[notice,setNotice]=useState(''),[language,setLanguage]=useState<Language>(initialLanguage)
 const text=publicText[language]
 const viewed=useRef('')
 useEffect(()=>{const token=load.data?.options.privateFeedback.submissionToken.token;if(!token||viewed.current===token)return;viewed.current=token;void api.public('/public/funnels/'+encodeURIComponent(code)+'/views','POST',{submissionToken:token,requestKey:crypto.randomUUID(),language}).catch(()=>{})},[code,load.data,language])
 function event(name:string){void api.public('/public/funnels/'+encodeURIComponent(code)+'/events','POST',{event:name}).catch(()=>setNotice(publicMessages[language].viewNotice))}
 return <div className="live-root live-public" lang={language}><LiveBrand/><main className="live-public-card"><label className="live-field">{text.language}<select aria-label="Language" value={language} onChange={e=>setLanguage(e.target.value as Language)}>{Object.entries(languageNames).map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label><LoadState loading={load.loading} error={load.error?text.unavailable:undefined} retry={load.reload}/>{load.data&&<><span className="live-eyebrow">{load.data.industryChannel.name}</span><h1>{load.data.merchant.name}</h1><p className="live-public-branch">{load.data.branch.name}{load.data.branch.address&&<> · {load.data.branch.address}</>}</p><h2>{language==='en'?load.data.channelVersion.title:text.question}</h2><p>{text.choice}</p><div className="live-parallel" aria-label="Independent review options"><a className="live-button" href={load.data.options.googleReview.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={()=>event('google_option_selected')}>{text.google} ↗</a><button className="live-button" onClick={()=>{setOpen(true);event('private_feedback_option_selected')}}>{text.private}</button></div>{notice&&<Notice>{notice}</Notice>}<DraftForm key={'draft:'+code+language+load.data.options.privateFeedback.submissionToken.token} code={code} token={load.data.options.privateFeedback.submissionToken.token} language={language} googleUrl={load.data.options.googleReview.url}/>{open&&<PublicFeedback key={'feedback:'+code+language+load.data.options.privateFeedback.submissionToken?.token} code={code} funnel={load.data} reload={load.reload} language={language}/>}<p className="live-muted">{text.policy}</p></>}</main><p className="live-public-foot">{publicMessages[language].foot}</p></div>
}
export function PublicFeedback({code,funnel,reload,language='en'}:{code:string;funnel:PublicFunnel;reload:()=>void;language?:Language}){
 const text=publicText[language]
 const [busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[attempted,setAttempted]=useState(false),attempt=useRef<Record<string,string|number>|null>(null)
 const option=funnel.options.privateFeedback
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||confirmation)return
  if(!attempt.current){const data=new FormData(e.currentTarget),body:Record<string,string|number>={submissionToken:option.submissionToken.token};for(const field of option.fields){const answer=String(data.get(field.name)??'');if(answer)body[field.name]=Number(answer)}attempt.current=body}
  setAttempted(true);setBusy(true);setError('')
  try{const result=await api.public<{accepted:boolean;confirmationId:string}>('/public/funnels/'+encodeURIComponent(code)+'/feedback','POST',attempt.current);setConfirmation(result.confirmationId)}catch(e){setError(language==='en'?errorMessage(e):publicMessages[language].feedbackError)}finally{setBusy(false)}
 }
 if(!option.submissionAvailable)return <Notice>{text.submissionUnavailable}</Notice>
 return <section className="live-private-form"><h2>{text.privateTitle}</h2>{confirmation?<Notice>{text.thanks} <strong>{confirmation}</strong></Notice>:<form onSubmit={submit} className="live-form"><fieldset disabled={busy||attempted}>{option.fields.map(field=><div className="live-field" key={field.name}><label htmlFor={'rating-'+field.name}>{({overallRating:text.overall,serviceRating:text.service,cleanlinessRating:text.cleanliness,waitingTimeRating:text.waiting} as Record<string,string>)[field.name]}{!field.required&&' ('+text.optional+')'}</label><select id={'rating-'+field.name} name={field.name} required={field.required} defaultValue=""><option value="">{text.choose}</option>{[1,2,3,4,5].map(r=><option value={r} key={r}>{r} {text.outOf}</option>)}</select></div>)}</fieldset><button className="live-button" disabled={busy} type="submit">{busy?text.sending:attempted?text.retry:text.send}</button>{error&&<Notice error>{error} {text.fixed} <button className="live-text-button" type="button" onClick={reload}>{text.newForm}</button></Notice>}</form>}</section>
}
