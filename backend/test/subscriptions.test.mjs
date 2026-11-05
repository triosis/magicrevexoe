import {test} from 'node:test'
import assert from 'node:assert/strict'
import {assignment,statusChange,historyInput,quota,transition,dateKey} from '../dist/subscriptions/model.js'
test('quota arithmetic preserves BIGINT accuracy, explicit unlimited and unavailable states',()=>{
 assert.deepEqual(quota('9007199254740993','9007199254740995'),{remaining:'2',overLimit:false})
 assert.deepEqual(quota('3','0'),{remaining:'0',overLimit:true})
 assert.deepEqual(quota('0',null),{remaining:null,overLimit:false})
 assert.deepEqual(quota(null,null),{remaining:null,overLimit:null})
 assert.deepEqual(quota('0',undefined),{remaining:null,overLimit:null})
})
test('subscription inputs reject status/plan/quota mass assignment and unsupported dates',()=>{
 const valid={planId:'1',periodEnd:'2026-12-05T00:00:00Z'}
 assert.equal(assignment.safeParse(valid).success,true)
 for(const bad of [{...valid,price:'1.00'},{...valid,tenantId:'2'},{...valid,limit:999},{...valid,status:'suspended'},{...valid,periodEnd:'2026-12-05T00:00:00.123456Z'}])assert.equal(assignment.safeParse(bad).success,false)
 assert.equal(statusChange.safeParse({status:'cancelled',lockVersion:1}).success,false)
 assert.equal(historyInput.safeParse({limit:101}).success,false)
 assert.equal(dateKey(new Date('2026-11-05T01:02:03.123Z')),'2026-11-05 01:02:03.123000')
})
test('terminal subscriptions cannot be reactivated or silently reassigned',()=>{
 assert.equal(transition('trialing','active'),true);assert.equal(transition('active','past_due'),true);assert.equal(transition('past_due','active'),true)
 assert.equal(transition('canceled','active'),false);assert.equal(transition('expired','trialing'),false);assert.equal(transition('active','active'),false);assert.equal(transition('active','trialing'),false)
})
