// Test authenticator: consumes the same protected enrollment QR as a real device.
// This helper changes no runtime authorization or database assurance flags.
import {randomBytes} from 'node:crypto'
import {PNG} from 'pngjs'
import jsQR from 'jsqr'
import {URI} from 'otpauth'
import {AuthService as RealAuthService} from '../dist/auth/service.js'
export function authenticator(png){const image=PNG.sync.read(png),qr=jsQR(new Uint8ClampedArray(image.data),image.width,image.height);if(!qr)throw Error('Enrollment QR not readable');return URI.parse(qr.data)}
export class AuthService extends RealAuthService {
 constructor(pool,key,deliver,verify){super(pool,key,deliver,verify,randomBytes(32));this.codes=new Map()}
 async login(email,password){const result=await super.login(email,password);if(!result.mfaRequired)return result
  if(result.enrollmentRequired){const otp=authenticator(await this.enrollMfa(result.challengeToken));const activated=await this.verifyMfa(result.challengeToken,otp.generate(),true);this.codes.set(email,activated.recoveryCodes);return activated}
  const code=this.codes.get(email)?.shift();if(!code)throw Error('Test authenticator recovery codes exhausted');return this.verifyMfa(result.challengeToken,code)
 }
}
