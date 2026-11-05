import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createSecureContext } from 'node:tls'

// Pin the operator-approved CA bytes as well as verifying the peer certificate.
export function approvedCa(file: string | undefined, digest: string | undefined): Buffer {
  try {
    if (!file || !digest || !/^[a-fA-F0-9]{64}$/.test(digest)) throw Error()
    const ca = readFileSync(file)
    if (!ca.includes(Buffer.from('-----BEGIN CERTIFICATE-----')) || createHash('sha256').update(ca).digest('hex') !== digest.toLowerCase()) throw Error()
    createSecureContext({ ca, minVersion: 'TLSv1.2' })
    return ca
  } catch { throw Error('Invalid approved TLS CA configuration') }
}
