import {test} from 'node:test'
import assert from 'node:assert/strict'
import {QuotaService,QuotaError} from '../dist/subscriptions/quota.js'
test('a missing limit is configuration failure, never explicit unlimited',async()=>{
 const responses=[[{id:'1'}],[{id:'2',kind:'merchant',status:'active'},{id:'1',kind:'platform',status:'active'}],[{id:'3',plan_id:'4',status:'active',period_elapsed:0,period_scheduled:0,period_ended:0}],[]]
 const db={execute:async()=>[responses.shift()]}
 await assert.rejects(new QuotaService().consume(db,'2','branches','fixture'),e=>e instanceof QuotaError&&e.code==='QUOTA_LIMIT_MISSING'&&e.limitMode==='unavailable'&&e.limit===null)
})
