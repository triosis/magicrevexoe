import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {FeedbackTokens} from '../dist/feedback/tokens.js'
import {submission,filter,listInput,statusInput,validTransition} from '../dist/feedback/validation.js'

test('feedback tokens bind code/version/expiry with domain-separated signatures and random nonces',()=>{
 let now=Date.now();const key=randomBytes(32),tokens=new FeedbackTokens(key,()=>now),code=randomBytes(16).toString('base64url'),issued=tokens.issue(code,1)
 assert.equal(tokens.verify(issued.token,code,1).code,code)
 assert.notEqual(tokens.issue(code,1).token,issued.token)
 assert.equal(new FeedbackTokens(key,()=>now).verify(issued.token,code,1).revision,1)
 assert.throws(()=>tokens.verify(issued.token,code,2))
 assert.throws(()=>tokens.verify(issued.token,randomBytes(16).toString('base64url'),1))
 assert.throws(()=>new FeedbackTokens(randomBytes(32)).verify(issued.token,code,1))
 const [payload,signature]=issued.token.split('.'),claims=JSON.parse(Buffer.from(payload,'base64url').toString());claims.revision=2
 assert.throws(()=>tokens.verify(Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+signature,code,2))
 now+=900000;assert.throws(()=>tokens.verify(issued.token,code,1))
})
test('feedback fields, filters and workflow reject mass assignment and incompatible transitions',()=>{
 const base={submissionToken:'test',overallRating:3}
 assert.equal(submission.safeParse(base).success,true)
 for(const bad of [0,6,2.5,'5',null])assert.equal(submission.safeParse({...base,overallRating:bad}).success,false)
 for(const field of ['text','notes','medicalHistory','diagnosis','symptoms','treatment','email','phone','branchId','merchantId','tenantId','status','assignedMembershipId'])assert.equal(submission.safeParse({...base,[field]:'disallowed'}).success,false)
 assert.equal(filter.safeParse({from:'2026-11-05T00:00:00Z',to:'2026-11-04T00:00:00Z'}).success,false)
 assert.equal(listInput.safeParse({limit:101}).success,false)
 assert.equal(statusInput.safeParse({status:'resolved',reasonCode:'completed',lockVersion:1,notes:'disallowed'}).success,false)
 for(const [from,to,reason]of [['new','in_progress','triage'],['new','resolved','completed'],['new','dismissed','spam'],['in_progress','new','follow_up'],['in_progress','resolved','completed'],['in_progress','dismissed','duplicate'],['resolved','in_progress','reopened'],['dismissed','in_progress','reopened']])assert.equal(validTransition(from,to,reason),true)
 for(const [from,to,reason]of [['new','new','triage'],['resolved','dismissed','spam'],['dismissed','resolved','completed'],['new','resolved','triage'],['resolved','new','reopened']])assert.equal(validTransition(from,to,reason),false)
})
