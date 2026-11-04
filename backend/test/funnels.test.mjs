import assert from 'node:assert/strict'
import {test} from 'node:test'
import {PNG} from 'pngjs'
import jsQR from 'jsqr'
import {newShortCode,shortCode,publicOrigin,eventInput,funnelInput} from '../dist/funnels/validation.js'
import {renderQr} from '../dist/funnels/qr.js'

test('short codes have 128 random bits, strict bounds and no configurable redirect/gating fields',()=>{
 const codes=Array.from({length:1000},newShortCode)
 assert.equal(new Set(codes).size,1000)
 for(const code of codes){assert.ok(shortCode.safeParse(code).success);assert.equal(Buffer.from(code,'base64url').length,16)}
 for(const code of ['', '123', '../etc', 'a'.repeat(33),'a'.repeat(22)+'?rating=5'])assert.equal(shortCode.safeParse(code).success,false)
 assert.equal(publicOrigin('https://api.example.invalid'),'https://api.example.invalid')
 for(const origin of ['http://example.invalid','https://example.invalid/','https://user:pass@example.invalid','https://example.invalid/path','javascript:alert(1)'])assert.throws(()=>publicOrigin(origin))
 assert.equal(eventInput.safeParse({event:'google_option_selected',rating:5}).success,false)
 assert.equal(eventInput.safeParse({event:'private_feedback_option_selected',medicalDetails:'no'}).success,false)
 assert.equal(funnelInput.safeParse({channelVersionId:'1',brandTitle:'Visit',accentHex:'#123456',locale:'en',googleVisible:false}).success,false)
})

test('PNG decodes to only the public short-link URL and rendering is deterministic',async()=>{
 const url='https://api.example.invalid/api/v1/public/funnels/'+newShortCode()
 const first=await renderQr(url,'png'),second=await renderQr(url,'png')
 assert.deepEqual(first.digest,second.digest);assert.deepEqual(first.content,second.content)
 const png=PNG.sync.read(first.content),decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height)
 assert.equal(decoded?.data,url)
 const svg=await renderQr(url,'svg');assert.match(svg.content.toString(),/^<svg/);assert.ok(!svg.content.toString().includes('<script'))
 assert.equal(svg.contentType,'image/svg+xml')
})
