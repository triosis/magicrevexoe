import QRCode from 'qrcode'

// Deterministic A6 vector QR document. No HTML, scripts, remote resources,
// financial content, font download or runtime renderer process is involved.
export function renderQrPrint(url:string){
 const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol)||url.length>2048)throw Error('Invalid QR destination')
 const qr=QRCode.create(url,{errorCorrectionLevel:'M'}),size=qr.modules.size,module=222/(size+8),commands=['1 1 1 rg 0 0 298 420 re f','0 0 0 rg','BT /F2 16 Tf 56 378 Td (Share your experience) Tj ET','BT /F1 10 Tf 78 356 Td (Scan with your phone camera) Tj ET']
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(qr.modules.get(y,x))commands.push(`${(38+(x+4)*module).toFixed(4)} ${(116+(size+3-y)*module).toFixed(4)} ${module.toFixed(4)} ${module.toFixed(4)} re f`)
 commands.push('BT /F1 10 Tf 57 86 Td (Google review or private feedback.) Tj ET','BT /F1 10 Tf 63 68 Td (Both are independent choices.) Tj ET')
 const stream=commands.join('\n'),objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 298 420] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`]
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}
 const offset=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`
 return Buffer.from(pdf)
}
