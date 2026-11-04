import assert from 'node:assert/strict'
import {test} from 'node:test'
import {validTimezone,canonicalTimezone,googleReviewUrl,destinationInput,destinationCreate,destinationUpdate,branchUpdate} from '../dist/business/validation.js'

test('IANA timezone validation accepts supported zones and rejects offsets/unknown input',()=>{
 for(const zone of ['UTC','Asia/Kolkata','America/New_York','Etc/GMT+5'])assert.equal(validTimezone(zone),true)
 for(const zone of ['Mars/Nowhere','+05:30','GMT+5','EST','','Asia/Kolkata<script>'])assert.equal(validTimezone(zone),false)
 assert.ok(canonicalTimezone('Asia/Kolkata').startsWith('Asia/'))
 assert.throws(()=>canonicalTimezone('invalid'),/Invalid branch timezone/)
 assert.equal(branchUpdate.safeParse({timezone:'invalid',lockVersion:1}).success,false)
 assert.equal(branchUpdate.safeParse({lockVersion:1}).success,false)
})

test('Google destinations require exact canonical HTTPS URL and safe place identifier',()=>{
 const id='ChIJ_fixture_place_01',canonical=googleReviewUrl(id)
 assert.equal(destinationInput(id),canonical)
 assert.equal(destinationInput(id,canonical),canonical)
 for(const bad of ['javascript:alert(1)','http://search.google.com/local/writereview?placeid='+id,'https://search.google.com.evil.invalid/?placeid='+id,'https://attacker@search.google.com/local/writereview?placeid='+id,canonical+'&redirect=https://evil.invalid',canonical+'#fragment',canonical+'&placeid=other']){
  assert.equal(destinationCreate.safeParse({placeId:id,reviewUrl:bad}).success,false)
  assert.throws(()=>destinationInput(id,bad))
 }
 for(const bad of ['','space id','id&redirect=evil','a'.repeat(256)])assert.equal(destinationCreate.safeParse({placeId:bad,reviewUrl:'https://evil.invalid'}).success,false)
 assert.equal(destinationUpdate.safeParse({placeId:id,lockVersion:1}).success,true)
})
