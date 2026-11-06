const canonical=/^https:\/\/search\.google\.com\/local\/writereview\?placeid=[A-Za-z0-9_-]{1,255}$/
const key=(code:string)=>'magicreview.public.destination.'+code
export function forgetDestination(code:string,storage:Storage|undefined=undefined){try{(storage??window.sessionStorage).removeItem(key(code))}catch{/* Unavailable storage never creates an offline fallback. */}}
export function rememberDestination(code:string,url:string,storage:Storage|undefined=undefined,now=Date.now()){
 if(!/^[A-Za-z0-9_-]{16,64}$/.test(code)||!canonical.test(url))return
 try{(storage??window.sessionStorage).setItem(key(code),JSON.stringify({url,expires:now+600000}))}catch{/* Optional offline convenience must never block the live choices. */}
}
export function offlineDestination(code:string,storage:Storage|undefined=undefined,now=Date.now()):string|null{
 try{if(!/^[A-Za-z0-9_-]{16,64}$/.test(code))return null;const raw=(storage??window.sessionStorage).getItem(key(code));if(!raw||raw.length>600)return null;const value=JSON.parse(raw);return typeof value.expires==='number'&&value.expires>now&&value.expires<=now+600000&&typeof value.url==='string'&&canonical.test(value.url)?value.url:null}catch{return null}
}
