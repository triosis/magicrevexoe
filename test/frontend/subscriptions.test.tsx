import {render,screen,within,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {it,expect,vi} from 'vitest'
import {api,ApiError} from '../../src/application/api'
import {SubscriptionPanel} from '../../src/application/subscriptions'
const access=vi.hoisted(()=>({manage:false,read:true}))
vi.mock('../../src/application/auth',()=>({useAuth:()=>({me:{selectedMembership:{kind:access.manage?'platform':'merchant',permissions:[...(access.read?['subscription.read']:[]),...(access.manage?['subscription.manage']:[])]}}})}))
const plan={id:'7',name:'Configured fixture plan',code:'fixture',version:1,status:'published',price:'17.25',currency:'INR',interval:'month',limitsComplete:true,limits:[{metric:'branches',limit:'2'}]}
const current={id:'30',merchantId:'10',status:'active',effectiveStatus:'active',lockVersion:1,periodStart:'2026-11-05T00:00:00.000Z',periodEnd:'2026-12-05T00:00:00.000Z',plan}
function responses(active=true,missing=false){let assigned=active,initialized=!missing;return vi.spyOn(api,'request').mockImplementation(async(path,method,body)=>{
 if(path==='/merchants/10/subscriptions'&&method==='POST'){assigned=true;return current}
 if(path.endsWith('/usage/initialize')){initialized=true;return{initialized:true}}
 if(path==='/merchants/10/subscription')return{subscription:assigned?current:null,availability:assigned?'available':'no_subscription',accountAccess:'active'}
 if(path==='/merchants/10/usage')return{availability:assigned?(initialized?'available':'unavailable'):'no_subscription',metrics:assigned?[{metric:'branches',availability:initialized?'available':'counter_missing',initialized,used:initialized?'1':null,limit:'2',limitMode:'finite',remaining:initialized?'1':null,overLimit:false,source:'live_resources'}]:[]}
 if(path.startsWith('/subscription-plans'))return{plans:[plan],nextCursor:null}
 if(path.includes('/usage/history'))return{usageRecords:[],nextCursor:null}
 if(path.includes('/subscriptions?'))return{subscriptions:assigned?[current]:[],nextCursor:null}
 throw Error('Unexpected fixture path '+path+String(body))
 })}
it('shows loading then an honest empty subscription state without invented quotas',async()=>{
 access.manage=false;access.read=true;responses(false)
 render(<SubscriptionPanel merchantId="10"/>);expect(screen.getAllByRole('status').length).toBeGreaterThan(0);expect(await screen.findByText(/No subscription has been assigned/)).toBeVisible();expect(screen.queryByText('No configured cap')).not.toBeInTheDocument();expect(screen.queryByText('Assign a subscription')).not.toBeInTheDocument()
})
it('renders exact configured terms, finite remaining usage and missing-counter unavailability',async()=>{
 access.manage=false;access.read=true;responses(true,true)
 render(<SubscriptionPanel merchantId="10"/>);await screen.findByText(/Configured fixture plan · Version 1/);expect(screen.getAllByText(/17.25 INR/)[0]).toBeVisible();const row=screen.getByRole('row',{name:/Active branches/});expect(within(row).getAllByText('Unavailable')).toHaveLength(2);expect(screen.queryByRole('button',{name:'Initialize missing usage counters'})).not.toBeInTheDocument()
})
it('supports authorized assignment and safe missing-counter initialization',async()=>{
 access.manage=true;access.read=true;const spy=responses(false)
 render(<SubscriptionPanel merchantId="10"/>);await screen.findByText('Assign a subscription');const user=userEvent.setup();await user.click(screen.getByText('Assign a subscription'));await user.selectOptions(screen.getByLabelText('Published subscription plan'),'7');await user.type(screen.getByLabelText('Period end (your local time)'),'2027-01-05T10:00');await user.click(screen.getByRole('button',{name:'Assign subscription',exact:true}));await screen.findByText(/Subscription assigned and usage counters initialized/)
 const call=spy.mock.calls.find(([path,method])=>path==='/merchants/10/subscriptions'&&method==='POST');expect(call?.[2]).toMatchObject({planId:'7',status:'active'});expect(call?.[2]).not.toHaveProperty('price')
})
it('reports API errors and hides subscription data for roles without read permission',async()=>{
 access.manage=false;access.read=true;vi.spyOn(api,'request').mockRejectedValue(new ApiError(503,'Subscription service unavailable'));const view=render(<SubscriptionPanel merchantId="10"/>);await waitFor(()=>expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Subscription service unavailable'));view.unmount();vi.restoreAllMocks();access.read=false;const spy=vi.spyOn(api,'request');render(<SubscriptionPanel merchantId="10"/>);expect(screen.queryByText('Subscription & usage')).not.toBeInTheDocument();expect(spy).not.toHaveBeenCalled()
})
it('initializes only through authorized controls and reloads availability',async()=>{
 access.manage=true;access.read=true;const spy=responses(true,true);render(<SubscriptionPanel merchantId="10"/>);const button=await screen.findByRole('button',{name:'Initialize missing usage counters'});await userEvent.click(button);await screen.findByText(/Existing period values were preserved/);await waitFor(()=>expect(screen.getByRole('row',{name:/Active branches/})).toHaveTextContent('available'));expect(spy.mock.calls.some(([path,method,body])=>path==='/merchants/10/subscriptions/30/usage/initialize'&&method==='POST'&&JSON.stringify(body)==='{}')).toBe(true)
})
