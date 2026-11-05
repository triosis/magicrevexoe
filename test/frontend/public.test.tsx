import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect,it,vi} from 'vitest'
import {PublicPage,validPublicFunnel} from '../../src/application/public'
import {funnel,code,json} from './fixtures'
it('renders independent Google/private options, submits structured clinic ratings and keeps Google after confirmation',async()=>{
 const requests:{path:string;body:Record<string,unknown>|undefined}[]=[]
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{const path=String(url);requests.push({path,body:options?.body?JSON.parse(String(options.body)):undefined});return json(path.endsWith('/feedback')?{accepted:true,confirmationId:'safe-reference'}:path.endsWith('/events')?{recorded:true}:funnel)}))
 render(<PublicPage code={code}/>);const google=await screen.findByRole('link',{name:/Leave a Google review/});expect(google).toHaveAttribute('href',funnel.options.googleReview.url)
 const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Share private feedback'}));expect(screen.queryByRole('textbox')).not.toBeInTheDocument();expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
 await user.selectOptions(screen.getByLabelText('Overall service experience'),'1');await user.click(screen.getByRole('button',{name:'Send private feedback'}));expect(await screen.findByText(/Thank you. Your feedback was received/)).toBeInTheDocument();expect(google).toBeVisible()
 const sent=requests.find(r=>r.path.endsWith('/feedback'))!;expect(sent.body).toEqual({submissionToken:'signed-form-token',overallRating:1});expect(sent.body).not.toHaveProperty('merchantId')
})
it('retries the identical payload on network failure and never hides Google',async()=>{
 let submissions=0;const payloads:string[]=[]
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{if(String(url).endsWith('/feedback')){payloads.push(String(options?.body));if(++submissions===1)throw Error('Network');return json({accepted:true,confirmationId:'same'})}return json(String(url).endsWith('/events')?{recorded:true}:funnel)}))
 render(<PublicPage code={code}/>);await screen.findByRole('link',{name:/Google/});const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Share private feedback'}));await user.selectOptions(screen.getByLabelText('Overall service experience'),'2');await user.click(screen.getByRole('button',{name:'Send private feedback'}));await screen.findByRole('alert');expect(screen.getByLabelText('Overall service experience')).toBeDisabled();await user.click(screen.getByRole('button',{name:'Retry same submission'}));await screen.findByText(/Confirmation:/);expect(payloads[0]).toBe(payloads[1]);expect(screen.getByRole('link',{name:/Google/})).toBeVisible()
})
it('rejects unsafe URLs and unsupported medical/text configuration instead of rendering a selective alternative',async()=>{
 expect(validPublicFunnel({...funnel,options:{...funnel.options,googleReview:{...funnel.options.googleReview,url:'javascript:alert(1)'}}})).toBe(false)
 const unsafe=structuredClone(funnel);unsafe.options.privateFeedback.fields.push({name:'medicalHistory',type:'text',minimum:1,maximum:5,required:false} as never);expect(validPublicFunnel(unsafe)).toBe(false)
 vi.stubGlobal('fetch',vi.fn(async()=>json(unsafe)));render(<PublicPage code={code}/>);await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('unavailable'));expect(screen.queryByRole('button',{name:'Share private feedback'})).not.toBeInTheDocument()
})
