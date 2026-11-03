import type { ResultSetHeader } from 'mysql2';
import { databasePool } from '../../config/database';
import type { AuditEvent } from './audit.types';

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  await databasePool.execute<ResultSetHeader>(
    `INSERT INTO audit_logs
      (actor_user_id, actor_account_id, reseller_id, sub_reseller_id, client_id,
       event_type, entity_type, entity_id, old_value, new_value, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.actorUserId ?? null,
      event.actorAccountId ?? null,
      event.tenant?.resellerId ?? null,
      event.tenant?.subResellerId ?? null,
      event.tenant?.clientId ?? null,
      event.eventType,
      event.entityType ?? null,
      event.entityId ?? null,
      event.oldValue === undefined ? null : JSON.stringify(event.oldValue),
      event.newValue === undefined ? null : JSON.stringify(event.newValue),
      event.ipHash ?? null,
      event.userAgent ?? null,
    ],
  );
}
