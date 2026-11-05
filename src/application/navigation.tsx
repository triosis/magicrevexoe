/* oxlint-disable react/only-export-components -- Typed UI helpers are intentionally colocated with components. */
import {useEffect,useState,type AnchorHTMLAttributes} from 'react'
export function navigate(path:string){window.history.pushState(null,'',path);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo?.(0,0)}
export function Link({href,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){return <a {...props} href={href} onClick={event=>{props.onClick?.(event);if(!event.defaultPrevented&&event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&(!props.target||props.target==='_self')){event.preventDefault();navigate(href)}}}/>}
export function usePath(){const [path,setPath]=useState(window.location.pathname);useEffect(()=>{const update=()=>setPath(window.location.pathname);window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update)},[]);return path}
export function LiveBrand(){return <Link className="live-brand" href="/"><span aria-hidden="true">✧</span>MagicReview <small>AI</small></Link>}
