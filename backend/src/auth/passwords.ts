import { hash, verify, argon2id } from 'argon2'
import { randomBytes } from 'node:crypto'
const options = { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const
let dummy: Promise<string> | undefined
export function hashPassword(password: string): Promise<string> { return hash(password, options) }
export async function verifyPassword(encoded: string | null, password: string): Promise<boolean> {
  dummy ??= hashPassword(randomBytes(32).toString('hex'))
  try {
    const valid = await verify(encoded ?? await dummy, password)
    return encoded !== null && valid
  } catch { return false }
}
