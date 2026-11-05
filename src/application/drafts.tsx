import {useRef,useState,type FormEvent} from 'react'
import {api,errorMessage} from './api'
import {Notice} from './ui'
import {publicText,publicMessages,type Language} from './languages'
const tags=['friendly_team','clean_environment','short_wait','long_wait','helpful_service','service_could_improve'] as const
export function DraftForm({code,token,language,googleUrl}:{code:string;token:string;language:Language;googleUrl:string}){
 const text=publicText[language],[busy,setBusy]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState(''),attempt=useRef<{requestKey:string;submissionToken:string;language:Language;rating:number;tags:string[];complex:boolean}|null>(null)
 const [submitted,setSubmitted]=useState(false)
 async function generate(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return
  const data=new FormData(event.currentTarget)
  if(data.getAll('tags').length>3){setError(publicMessages[language].maxTags);return}
  if(!attempt.current)attempt.current={requestKey:crypto.randomUUID(),submissionToken:token,language,rating:Number(data.get('rating')),tags:data.getAll('tags').map(String),complex:data.get('complex')==='on'}
  setBusy(true);setSubmitted(true);setError('')
  try{const result=await api.public<{draft:string;language:Language;editable:boolean;posted:boolean}>('/public/funnels/'+encodeURIComponent(code)+'/drafts','POST',attempt.current);if(typeof result.draft!=='string'||result.language!==language||result.editable!==true||result.posted!==false)throw Error();setDraft(result.draft)}catch(error){setError(language==='en'?errorMessage(error):publicMessages[language].draftError)}finally{setBusy(false)}
 }
 return <details className="live-private-form"><summary>{text.ai}</summary><p>{text.aiNote}</p>{!draft&&<form className="live-form" onSubmit={generate}><fieldset disabled={busy||submitted}><label>{text.rating}<select name="rating" required defaultValue=""><option value="">{text.choose}</option>{[1,2,3,4,5].map(r=><option key={r} value={r}>{r} {text.outOf}</option>)}</select></label>{tags.map(tag=><label key={tag} className="live-check"><input name="tags" value={tag} type="checkbox"/>{text[tag]}</label>)}<label className="live-check"><input type="checkbox" name="complex"/>{text.complex}</label></fieldset><button className="live-button" disabled={busy}>{busy?text.generating:text.generate}</button></form>}{draft&&<><label className="live-field">{text.draft}<textarea value={draft} maxLength={4096} onChange={e=>setDraft(e.target.value)}/></label><button className="live-button" disabled={!draft.trim()} onClick={()=>{window.open(googleUrl,'_blank','noopener,noreferrer');if(navigator.clipboard)void navigator.clipboard.writeText(draft).catch(()=>setError(text.copyFailed));else setError(text.copyFailed)}}>{text.copy}</button></>}{error&&<Notice error>{error}</Notice>}</details>
}
