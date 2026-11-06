import {test} from 'node:test'
import assert from 'node:assert/strict'
import {PNG} from 'pngjs'
import {validateLogo,presentationInput} from '../dist/business/presentation.js'
import {requireFinancialApproval,financialReadiness} from '../dist/billing/approval.js'
import {validTransition} from '../dist/feedback/validation.js'
import {usageAlert} from '../dist/subscriptions/model.js'
test('financial readiness is fail-closed with no role, catalog or environment bypass',()=>{
 assert.ok(Object.values(financialReadiness).every(v=>v===false));assert.equal(Object.isFrozen(financialReadiness),true)
 assert.throws(()=>requireFinancialApproval(),e=>e.status===409&&/written owner approval/.test(e.message))
})
test('logo upload validates real bounded PNG bytes and rejects metadata, corrupt files and image bombs',()=>{
 const png=PNG.sync.write(new PNG({width:2,height:2}));assert.deepEqual(validateLogo(png),png)
 const corrupted=Buffer.from(png);corrupted[corrupted.length-5]^=1;assert.throws(()=>validateLogo(corrupted),e=>e.status===400)
 for(const invalid of [Buffer.from('<svg onload="script"/>'),Buffer.concat([png,Buffer.from('tail')]),PNG.sync.write(new PNG({width:513,height:1})),Buffer.alloc(65537)])assert.throws(()=>validateLogo(invalid),e=>e.status===400)
})
test('business keywords are explicit bounded context, with strict fields and optimistic version',()=>{
 assert.equal(presentationInput.safeParse({lockVersion:0,seedKeywords:['friendly service','short waiting','clean space']}).success,true)
 for(const seedKeywords of [['one'],['same','same','third'],['<script>','two','three']])assert.equal(presentationInput.safeParse({lockVersion:0,seedKeywords}).success,false)
 assert.equal(presentationInput.safeParse({lockVersion:0,seedKeywords:[],hideGoogle:true}).success,false)
 assert.equal(validTransition('resolved','archived','completed'),true);assert.equal(validTransition('new','archived','completed'),false);assert.equal(validTransition('archived','in_progress','reopened'),false)
})
test('usage alerts use exact configured capacities at 80 and 100 percent without assuming missing allowances',()=>{
 assert.equal(usageAlert('79','100'),null);assert.equal(usageAlert('80','100'),'approaching_limit');assert.equal(usageAlert('100','100'),'at_limit');assert.equal(usageAlert('0','0'),'at_limit');assert.equal(usageAlert('100',null),null);assert.equal(usageAlert(null,'100'),null);assert.equal(usageAlert('100',undefined),null)
 assert.equal(usageAlert('9007199254740993','9007199254740994'),'approaching_limit')
})
