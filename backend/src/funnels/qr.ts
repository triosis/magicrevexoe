import QRCode from 'qrcode'
import {createHash} from 'node:crypto'
export async function renderQr(url:string,format:'svg'|'png'){
 const options={errorCorrectionLevel:'M' as const,margin:4,width:512}
 const content=format==='svg'?Buffer.from(await QRCode.toString(url,{...options,type:'svg'})):await QRCode.toBuffer(url,{...options,type:'png'})
 return{content,digest:createHash('sha256').update(content).digest(),contentType:format==='svg'?'image/svg+xml':'image/png'}
}
