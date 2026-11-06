import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect,it,vi} from 'vitest'
import {PublicPage,validPublicFunnel} from '../../src/application/public'
import {funnel,code,json} from './fixtures'
import {publicText} from '../../src/application/languages'
import {rememberDestination,forgetDestination} from '../../src/application/offline-cache'
it('uses a bounded verified destination only for transient unavailability',async()=>{
 rememberDestination(code,funnel.options.googleReview.url);vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('network unavailable')}));render(<PublicPage code={code}/>);expect(await screen.findByRole('link',{name:'Open cached Google review link'})).toHaveAttribute('href',funnel.options.googleReview.url);expect(screen.queryByRole('button',{name:'Send private feedback'})).not.toBeInTheDocument();forgetDestination(code)
})
it('removes a cached destination when the server explicitly disables the link',async()=>{
 rememberDestination(code,funnel.options.googleReview.url);vi.stubGlobal('fetch',vi.fn(async()=>json({error:'Unavailable'},404)));render(<PublicPage code={code}/>);await screen.findByRole('alert');expect(screen.queryByRole('link',{name:'Open cached Google review link'})).not.toBeInTheDocument();expect(sessionStorage.getItem('magicreview.public.destination.'+code)).toBeNull()
})
it('star entry preserves both choices and cannot alter a failed submission awaiting duplicate-safe retry',async()=>{
 let attempts=0;const payloads:string[]=[]
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{if(String(url).endsWith('/feedback')){payloads.push(String(options?.body));if(++attempts===1)throw Error('network');return json({accepted:true,confirmationId:'same'})}return json(funnel)}))
 render(<PublicPage code={code}/>);await screen.findByRole('link',{name:/Leave a Google review/});const user=userEvent.setup();for(const rating of [5,4,3,2,1]){await user.click(screen.getByRole('button',{name:rating+' out of 5',exact:true}));expect(screen.getByRole('link',{name:/Leave a Google review/})).toBeVisible();expect(screen.getByRole('button',{name:'Share private feedback',exact:true})).toBeVisible()}
 await user.click(screen.getByRole('button',{name:'Share private feedback',exact:true}));expect(screen.getByLabelText('Overall service experience')).toHaveValue('1');await user.click(screen.getByRole('button',{name:'Send private feedback'}));await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'5 out of 5',exact:true}));expect(screen.getByLabelText('Overall service experience')).toHaveValue('1');await user.click(screen.getByRole('button',{name:'Retry same submission'}));await screen.findByText(/Confirmation:/);expect(payloads[0]).toBe(payloads[1])
})
it('keeps both paths and structured clinic questions in Hindi and Malayalam',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>json(funnel)))
 render(<PublicPage code={code}/>);await screen.findByRole('link',{name:/Google/});const user=userEvent.setup()
 for(const language of ['hi','ml'] as const){await user.selectOptions(screen.getByLabelText('Language'),language);expect(screen.getByRole('link',{name:new RegExp(publicText[language].google)})).toBeVisible();await user.click(screen.getByRole('button',{name:publicText[language].private}));expect(screen.getByRole('button',{name:publicText[language].send})).toBeVisible();expect(screen.queryByRole('textbox')).not.toBeInTheDocument()}
})
it('AI drafting sends structured facts and selected language; editable text appears only after provider result',async()=>{
 const requests:Record<string,unknown>[]=[]
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{if(String(url).endsWith('/drafts')){requests.push(JSON.parse(String(options?.body)));return json({draft:'Service could improve.',language:'en',editable:true,posted:false})}return json(funnel)}))
 render(<PublicPage code={code}/>);await screen.findByRole('link',{name:/Google/});const user=userEvent.setup();await user.click(screen.getByText(publicText.en.ai));await user.selectOptions(screen.getByLabelText(publicText.en.rating),'1');await user.click(screen.getByRole('button',{name:publicText.en.generate}));expect(await screen.findByRole('textbox')).toHaveValue('Service could improve.');expect(requests[0]).toMatchObject({language:'en',rating:1,tags:[]});expect(requests[0]).not.toHaveProperty('merchantId');expect(screen.getByRole('link',{name:/Google/})).toBeVisible()
})
it('renders independent Google/private options, submits structured clinic ratings and keeps Google after confirmation',async()=>{
 const requests:{path:string;body:Record<string,unknown>|undefined}[]=[]
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{const path=String(url);requests.push({path,body:options?.body?JSON.parse(String(options.body)):undefined});return json(path.endsWith('/feedback')?{accepted:true,confirmationId:'safe-reference'}:path.endsWith('/events')?{recorded:true}:funnel)}))
 render(<PublicPage code={code}/>);const google=await screen.findByRole('link',{name:/Leave a Google review/});expect(google).toHaveAttribute('href',funnel.options.googleReview.url)
 const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Share private feedback'}));expect(screen.queryByRole('textbox')).not.toBeInTheDocument();expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
 await user.selectOptions(screen.getByLabelText('Overall service experience'),'1');await user.click(screen.getByRole('button',{name:'Send private feedback'}));expect(await screen.findByText(/Thank you. Your feedback was received/)).toBeInTheDocument();expect(google).toBeVisible()
 const sent=requests.find(r=>r.path.endsWith('/feedback'))!;expect(sent.body).toEqual({submissionToken:'signed-form-token',overallRating:1,language:'en'});expect(sent.body).not.toHaveProperty('merchantId')
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
