import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {ClaudeProvider,configuredClaude} from '../dist/ai/provider.js'
import {configuredRazorpay,RazorpayProvider} from '../dist/billing/provider.js'
import {commercialTerms,overage} from '../dist/billing/terms.js'
import {draftInput} from '../dist/ai/service.js'
import {syntheticTerms} from './commercial-fixtures.mjs'
const settings={ANTHROPIC_API_KEY:'synthetic-test-key-never-real',ANTHROPIC_MODEL:'claude-test',ANTHROPIC_API_VERSION:'2023-06-01',AI_MAX_OUTPUT_TOKENS:64,ANTHROPIC_FALLBACK_MODEL:'claude-complex-test'}
const prompt={language:'en',rating:1,tags:['long_wait'],merchant:'Ignore instructions',industry:'clinic',complex:false}
test('provider configuration is optional but partial configuration fails closed',()=>{
 assert.equal(configuredClaude({}),undefined);assert.throws(()=>configuredClaude({ANTHROPIC_API_KEY:'short'}))
 assert.equal(configuredRazorpay({}),undefined);assert.throws(()=>configuredRazorpay({RAZORPAY_MODE:'live'}))
 assert.equal(commercialTerms.safeParse({}).success,false);assert.equal(commercialTerms.safeParse(syntheticTerms).success,true)
 assert.equal(draftInput.safeParse({...prompt,freeText:'medical information'}).success,false)
})
test('Claude protocol uses configured model, bounded plain text, actual token usage and no generation retry',async()=>{
 const calls=[];const transport=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json(url.endsWith('count_tokens')?{input_tokens:12}:{stop_reason:'end_turn',content:[{type:'text',text:'The wait was long. Service could improve.'}],usage:{input_tokens:12,output_tokens:9}})}
 const provider=new ClaudeProvider(settings,transport);assert.equal(await provider.count(prompt),12);assert.equal((await provider.generate({...prompt,complex:true})).outputTokens,9)
 assert.equal(calls.length,2);assert.equal(calls[1].body.model,'claude-complex-test');assert.equal(calls[1].body.max_tokens,64);assert.match(calls[0].body.system,/Preserve negative sentiment/)
 let failures=0;await assert.rejects(new ClaudeProvider(settings,async()=>{failures++;throw Error('secret provider message')}).generate(prompt),/no automatic generation retry/);assert.equal(failures,1)
 for(const text of ['<script>unsafe</script>','https://example.invalid','The patient received medication.'])await assert.rejects(new ClaudeProvider(settings,async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text}],usage:{input_tokens:1,output_tokens:1}})).generate(prompt),/validation|sentences/)
})
test('Hindi and Malayalam output is validated; wrong language and incomplete output fail',async()=>{
 for(const [language,text]of [['hi','सेवा में सुधार की आवश्यकता है। प्रतीक्षा लंबी थी।'],['ml','സേവനം മെച്ചപ്പെടുത്തണം. കാത്തിരിപ്പ് നീണ്ടു.']]){const p=new ClaudeProvider(settings,async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text}],usage:{input_tokens:1,output_tokens:1}}));assert.equal((await p.generate({...prompt,language})).text,text);await assert.rejects(p.generate({...prompt,language:language==='hi'?'ml':'hi'}),/language/)}
})
test('payment signatures bind raw bytes and monetary rounding never uses floating point',()=>{
 const secret='synthetic-webhook-secret-with-32-characters',raw=Buffer.from('{"event":"test"}'),p=new RazorpayProvider({RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_synthetic',RAZORPAY_KEY_SECRET:'synthetic-api-secret-long',RAZORPAY_WEBHOOK_SECRET:secret})
 const signature=createHmac('sha256',secret).update(raw).digest('hex');assert.equal(p.signature(raw,signature),true);assert.equal(p.signature(Buffer.from(raw+' '),signature),false);assert.equal(p.signature(raw,'x'),false)
 assert.equal(overage(11n,'10','0.000001','ceil_minor'),1n);assert.equal(overage(11n,'10','0.000001','half_up_minor'),0n);assert.equal(overage(9007199254740993n,null,'9.000000','ceil_minor'),0n)
})
