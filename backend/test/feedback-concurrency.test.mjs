import {test} from 'node:test'
import assert from 'node:assert/strict'
import {transaction} from '../dist/auth/database.js'
test('transaction failures roll back/release once without automatically replaying work',async()=>{
 for(const code of ['ER_LOCK_DEADLOCK','PROTOCOL_CONNECTION_LOST']){
  let work=0,rollback=0,released=0,acquired=0
  const failure=Object.assign(new Error('Synthetic transaction failure'),{code})
  const db={query:async()=>{},beginTransaction:async()=>{},commit:async()=>{if(code==='PROTOCOL_CONNECTION_LOST')throw failure},rollback:async()=>{rollback++},release:()=>{released++}}
  await assert.rejects(transaction({getConnection:async()=>{acquired++;return db}},async()=>{work++;if(code==='ER_LOCK_DEADLOCK')throw failure}),error=>error===failure)
  assert.deepEqual({work,rollback,released,acquired},{work:1,rollback:1,released:1,acquired:1})
 }
})
