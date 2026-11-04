import type { TokenDelivery } from '../auth/service.js'
export type InvitationDelivery = {
  kind: 'smtp' | 'test'
  verify: () => Promise<void>
  send: TokenDelivery
}
