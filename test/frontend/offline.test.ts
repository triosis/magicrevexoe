import {expect,it} from 'vitest'
import {rememberDestination,offlineDestination} from '../../src/application/offline-cache'
const code='abcdefghijklmnopqrstuv',url='https://search.google.com/local/writereview?placeid=ChIJ_safe'
it('retains only canonical public destination for the same code and ten minutes, without credentials or form tokens',()=>{
 sessionStorage.clear();rememberDestination(code,url,sessionStorage,1000);expect(offlineDestination(code,sessionStorage,1001)).toBe(url);expect(offlineDestination(code,sessionStorage,601001)).toBeNull();expect(offlineDestination('otherabcdefghijklmnop',sessionStorage,1001)).toBeNull();expect(sessionStorage.getItem('magicreview.public.destination.'+code)).not.toMatch(/token|merchant|email/)
})
it('refuses malicious URL, malformed cache, future expiry and unavailable storage',()=>{
 sessionStorage.clear();rememberDestination(code,'javascript:alert(1)',sessionStorage,1000);expect(offlineDestination(code,sessionStorage,1001)).toBeNull();sessionStorage.setItem('magicreview.public.destination.'+code,JSON.stringify({url,expires:99999999}));expect(offlineDestination(code,sessionStorage,1000)).toBeNull();expect(offlineDestination(code,{getItem:()=>{throw Error('blocked')}} as unknown as Storage)).toBeNull()
})
