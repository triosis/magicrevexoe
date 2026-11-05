import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

export async function certificate(name = 'localhost') {
  const directory = await mkdtemp(join(tmpdir(), 'magicreview-tls-'))
  const cert = join(directory, 'cert.pem'), key = join(directory, 'key.pem')
  execFileSync('C:/Program Files/Git/usr/bin/openssl.exe', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN='+name, '-addext', 'subjectAltName=DNS:'+name, '-keyout', key, '-out', cert], { windowsHide: true, stdio: 'ignore' })
  return { cert, key, ca: await readFile(cert), privateKey: await readFile(key), digest: createHash('sha256').update(await readFile(cert)).digest('hex') }
}
