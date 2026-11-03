import type { TenantContext } from '../../types/auth';

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'ROLE_CHANGED'
  | 'PERMISSION_DENIED'
  | 'PASSWORD_CHANGED';

export interface AuditEvent {
  actorUserId?: string | null;
  actorAccountId?: string | null;
  tenant?: Partial<TenantContext>;
  eventType: AuditEventType;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipHash?: string | null;
  userAgent?: string | null;
}
