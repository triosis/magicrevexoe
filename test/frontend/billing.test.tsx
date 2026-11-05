import {render,screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {it,expect,vi} from 'vitest'
import {api} from '../../src/application/api'
import {BillingPanel} from '../../src/application/billing'
vi.mock('../../src/application/auth',()=>({useAuth:()=>({me:{selectedMembership:{kind:'merchant',tenantId:'10',roleCode:'merchant_admin'}}})}))
it('prepares invoice readiness without displaying a numbered invoice or initiating payment',async()=>{
 const calls=vi.spyOn(api,'request').mockImplementation(async(path)=>{
  if(path.endsWith('/invoice-preparation'))return{issued:false,financialDocument:false,invoiceNumber:null,missingApprovals:['finance_policy']}
  if(path.endsWith('/billing'))return{items:[{id:'7',planId:'2',status:'unknown'}]}
  if(path.startsWith('/subscription-plans'))return{plans:[]}
  throw Error('Unexpected request')
 })
 render(<BillingPanel merchantId="10"/>);await screen.findByText(/Agreement 7: unknown/)
 const user=userEvent.setup();await user.click(screen.getByText('Invoice preparation'));await user.click(screen.getByRole('button',{name:'Check invoice readiness'}));expect(await screen.findByText(/No financial document has been issued/)).toBeVisible();expect(calls.mock.calls.every(([,method])=>method===undefined||method==='GET')).toBe(true);expect(screen.queryByText(/Invoice number:/)).not.toBeInTheDocument()
})
