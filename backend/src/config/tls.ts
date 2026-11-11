import { readFileSync } from 'node:fs'
import { createHash, X509Certificate } from 'node:crypto'
import { createSecureContext } from 'node:tls'

// Pin the operator-approved CA bytes as well as verifying the peer certificate.
export function approvedCa(file: string | undefined, digest: string | undefined): Buffer {
  try {
    if (!file || !digest || !/^[a-fA-F0-9]{64}$/.test(digest)) throw Error()
    const ca = readFileSync(file)
    if (!ca.includes(Buffer.from('-----BEGIN CERTIFICATE-----')) || createHash('sha256').update(ca).digest('hex') !== digest.toLowerCase()) throw Error()
    // OpenSSL can silently ignore malformed CA entries in createSecureContext.
    // Parse every certificate, including all entries in an approved bundle.
    const text=ca.toString('utf8'),certificates=text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)??[]
    if(!certificates.length||certificates.length!==(text.match(/-----BEGIN CERTIFICATE-----/g)??[]).length)throw Error()
    for(const certificate of certificates)new X509Certificate(certificate)
    createSecureContext({ ca, minVersion: 'TLSv1.2' })
    return ca
  } catch { throw Error('Invalid approved TLS CA configuration') }
}
