import {platformOwnerEmail} from '../config/platform-owner.js'

// Server-only fixed owner credential. Never import this module into the client.
const ownerPasswordHash='$argon2id$v=19$m=19456,t=2,p=1$IJTFCFKraXF6YeY+6tCHDw$hzcjaJAkvkZFU81tHyzu4Cv8VlVSBy8bHBLN5N2eLDc'

export function loginPasswordHash(email:string|undefined,storedHash:string|null):string|null {
  return email===platformOwnerEmail?ownerPasswordHash:storedHash
}
