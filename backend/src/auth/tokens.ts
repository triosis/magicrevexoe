import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { HttpError } from '../middleware/error-handler.js'

export const identifier = z.string().regex(/^[1-9][0-9]{0,19}$/).refine(value => BigInt(value) <= 18446744073709551615n)
const claims = z.object({ sub: identifier, sid: identifier, av: z.number().int().positive(), mid: identifier.optional(), amr: z.tuple([z.literal('pwd')]) })
export type Identity = z.infer<typeof claims>
export function opaqueToken(): string { return randomBytes(32).toString('base64url') }
export function tokenDigest(value: string): Buffer { return createHash('sha256').update(value, 'utf8').digest() }
export const opaque = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

export class AccessTokens {
  constructor(private readonly key: Uint8Array) {
    if (key.byteLength < 32) throw new Error('AUTH_ACCESS_SECRET must contain at least 32 random bytes')
  }
  async issue(identity: Identity): Promise<string> {
    return new SignJWT(identity).setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
      .setIssuer('magicreview-api').setAudience('magicreview-client').setIssuedAt()
      .setExpirationTime('5m').setJti(randomUUID()).sign(this.key)
  }
  async verify(value: string): Promise<Identity> {
    try {
      const { payload } = await jwtVerify(value, this.key, { algorithms: ['HS256'], typ: 'at+jwt',
        issuer: 'magicreview-api', audience: 'magicreview-client', requiredClaims: ['sub','sid','av','exp','iat','jti'], maxTokenAge: '5m' })
      return claims.parse(payload)
    } catch { throw new HttpError(401, 'Authentication required') }
  }
}
