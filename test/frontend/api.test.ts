import {describe,it,expect,vi} from 'vitest'
import {ApiClient} from '../../src/application/api'
import {json,me} from './fixtures'
const key='magicreview.session.v1',refresh='r'.repeat(43),rotated='s'.repeat(43)
describe('API session client',()=>{
 it('restores tab sessions and single-flights concurrent refresh, reselecting server membership',async()=>{
  sessionStorage.setItem(key,JSON.stringify({refreshToken:refresh,membershipId:'20'}))
  const calls:string[]=[],transport=vi.fn(async(url,_options)=>{const path=String(url).replace('https://api.example.invalid/api/v1','');calls.push(path);if(path==='/auth/refresh')return json({accessToken:'new',refreshToken:rotated});if(path==='/auth/select-tenant')return json({accessToken:'selected'});return json(me)})
  const client=new ApiClient('https://api.example.invalid/api/v1',transport as typeof fetch,sessionStorage)
  const [first,second]=await Promise.all([client.restore(),client.restore()]);expect(first).toEqual(me);expect(second).toEqual(me);expect(calls.filter(p=>p==='/auth/refresh')).toHaveLength(1)
  expect(JSON.parse(sessionStorage.getItem(key)!).refreshToken).toBe(rotated);expect(sessionStorage.getItem(key)).not.toContain('accessToken')
  const last=transport.mock.calls.at(-1)![1];expect(last?.headers).toMatchObject({Authorization:'Bearer selected'});expect(last?.credentials).toBe('omit')
 })
 it('rotates once when several authenticated calls expire simultaneously',async()=>{
  let refreshed=false
  const transport=vi.fn(async(url,options)=>{const p=String(url);if(p.endsWith('/auth/login'))return json({accessToken:'old',refreshToken:refresh});if(p.endsWith('/auth/me'))return json(me);if(p.endsWith('/auth/refresh')){await new Promise(r=>setTimeout(r,10));refreshed=true;return json({accessToken:'new',refreshToken:rotated})}if((options?.headers as Record<string,string>)?.Authorization==='Bearer old')return json({error:'Authentication required'},401);return json({ok:refreshed})})
  const client=new ApiClient('https://api.example.invalid/api/v1',transport as typeof fetch,sessionStorage);await client.login('email','password');await Promise.all([client.request('/one'),client.request('/two')]);expect(transport.mock.calls.filter(([u])=>String(u).endsWith('/auth/refresh'))).toHaveLength(1)
 })
 it('fails closed without retrying ambiguous refresh failures, clears stale sessions and logout storage',async()=>{
  sessionStorage.setItem(key,JSON.stringify({refreshToken:refresh}));const transport=vi.fn(async()=>{throw Error('network-secret-detail')});const client=new ApiClient('https://api.example.invalid/api/v1',transport as typeof fetch,sessionStorage)
  await expect(client.restore()).rejects.toThrow('Could not reach');expect(transport).toHaveBeenCalledTimes(1);expect(sessionStorage.getItem(key)).toBeNull()
  const good=new ApiClient('https://api.example.invalid/api/v1',vi.fn(async url=>String(url).endsWith('/auth/login')?json({accessToken:'token',refreshToken:refresh}):String(url).endsWith('/auth/logout')?new Response(null,{status:204}):json(me)) as typeof fetch,sessionStorage);await good.login('email','password');await good.logout();expect(sessionStorage.getItem(key)).toBeNull()
 })
 it('keeps public calls credential-free, rejects unsafe configuration/path and preserves safe API errors',async()=>{
  const transport=vi.fn(async()=>json({error:'Usage accounting not initialized'},409));const client=new ApiClient('https://api.example.invalid/api/v1',transport as typeof fetch)
  await expect(client.public('/public/funnels/code/feedback','POST',{})).rejects.toMatchObject({status:409,message:'Usage accounting not initialized'});expect(transport.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization')
  await expect(client.public('//evil.invalid')).rejects.toThrow('Invalid API path');expect(transport).toHaveBeenCalledTimes(1)
  await expect(new ApiClient('https://user:secret@evil.invalid/api/v1',transport as typeof fetch).public('/x')).rejects.toThrow('valid VITE_API_URL');await expect(new ApiClient(undefined,transport as typeof fetch).public('/x')).rejects.toThrow('VITE_API_URL')
 })
 it('drops invalid selected membership after rotation so another active account can be chosen',async()=>{
  sessionStorage.setItem(key,JSON.stringify({refreshToken:refresh,membershipId:'20'}));const transport=vi.fn(async url=>String(url).endsWith('/auth/refresh')?json({accessToken:'new',refreshToken:rotated}):String(url).endsWith('/auth/select-tenant')?json({error:'Access denied'},403):json({...me,selectedMembership:null}))
  const client=new ApiClient('https://api.example.invalid/api/v1',transport as typeof fetch,sessionStorage);expect((await client.restore())?.selectedMembership).toBeNull();expect(JSON.parse(sessionStorage.getItem(key)!)).not.toHaveProperty('membershipId')
 })
 it('does not restore credentials after local logout wins a pending rotation and tolerates blocked storage',async()=>{
  sessionStorage.setItem(key,JSON.stringify({refreshToken:refresh}));let finish!:(response:Response)=>void
  const transport=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve})),client=new ApiClient('https://api.example.invalid/api/v1',transport as typeof fetch,sessionStorage),pending=client.restore();client.clear();finish(json({accessToken:'late',refreshToken:rotated}));await expect(pending).rejects.toMatchObject({status:401});expect(sessionStorage.getItem(key)).toBeNull()
  const blocked={getItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}} as unknown as Storage
  expect(()=>new ApiClient('https://api.example.invalid/api/v1',transport as typeof fetch,blocked)).not.toThrow()
 })
})
