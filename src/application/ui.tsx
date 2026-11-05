/* oxlint-disable react/only-export-components -- Shared typed controls and hooks are intentionally colocated. */
import {cloneElement,isValidElement,useEffect,useId,useState,type FormEvent,type ReactElement,type ReactNode} from 'react'
import {errorMessage} from './api'
export function Notice({children,error=false}:{children:ReactNode;error?:boolean}){return <p className={'live-notice '+(error?'is-error':'')} role={error?'alert':'status'}>{children}</p>}
export function PageTitle({title,children}:{title:string;children?:ReactNode}){return <div className="live-page-title"><div><span className="live-eyebrow">MAGICREVIEW AI</span><h1>{title}</h1></div>{children}</div>}
export function Field({label,name,type='text',required=false,defaultValue,children,minLength,maxLength}:{label:string;name:string;type?:string;required?:boolean;defaultValue?:string;children?:ReactNode;minLength?:number;maxLength?:number}){const id=useId();return <div className="live-field"><label htmlFor={id}>{label}</label>{isValidElement(children)?cloneElement(children as ReactElement<{id:string}>,{id}):<input id={id} name={name} type={type} required={required} defaultValue={defaultValue} minLength={minLength} maxLength={maxLength} autoComplete={type==='password'?'current-password':name==='email'?'email':undefined}/>}</div>}
export const value=(data:FormData,name:string)=>String(data.get(name)??'').trim()
export function ActionForm({children,onSubmit,label='Save',reset=false}:{children?:ReactNode;onSubmit:(data:FormData)=>Promise<string|void>;label?:string;reset?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const form=event.currentTarget,data=new FormData(form);setBusy(true);setError('');setMessage('');try{const result=await onSubmit(data);setMessage(typeof result==='string'?result:'Saved.');if(reset)form.reset()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 return <form onSubmit={submit} className="live-form"><fieldset disabled={busy}>{children}<button className="live-button" type="submit">{busy?'Working…':label}</button></fieldset>{error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}</form>
}
export function useLoad<T>(key:string,loader:()=>Promise<T>,enabled=true){
 const [revision,setRevision]=useState(0),[state,setState]=useState<{key:string;data?:T;error?:string;loading:boolean}>({key,loading:true})
 useEffect(()=>{let active=true;if(!enabled){setState({key,loading:false});return}setState({key,loading:true});loader().then(data=>{if(active)setState({key,data,loading:false})},error=>{if(active)setState({key,error:errorMessage(error),loading:false})});return()=>{active=false}
 // Loader closures correspond to this explicit resource/scope key.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,revision,enabled])
 const current=state.key===key?state:{data:undefined,error:undefined,loading:enabled}
 return{data:current.data,error:current.error,loading:current.loading,reload:()=>setRevision(r=>r+1)}
}
export function LoadState({loading,error,retry}:{loading:boolean;error?:string;retry:()=>void}){return <>{loading&&<Notice>Loading…</Notice>}{error&&<Notice error>{error} <button type="button" className="live-text-button" onClick={retry}>Try again</button></Notice>}</>}
export function Paginator({next,onNext,onPrevious,hasPrevious}:{next:string|null|undefined;onNext:()=>void;onPrevious:()=>void;hasPrevious:boolean}){return <div className="live-pagination"><button disabled={!hasPrevious} onClick={onPrevious}>Previous</button><button disabled={!next} onClick={onNext}>Next page</button></div>}
export function useCursor(){const [cursors,setCursors]=useState<string[]>(['']);return{after:cursors.at(-1)!,hasPrevious:cursors.length>1,next:(cursor:string)=>setCursors(c=>[...c,cursor]),previous:()=>setCursors(c=>c.slice(0,-1)),reset:()=>setCursors([''])}}
