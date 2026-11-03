"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditEvent = recordAuditEvent;
const database_1 = require("../../config/database");
async function recordAuditEvent(event) {
    await database_1.databasePool.execute(`INSERT INTO audit_logs
      (actor_user_id, actor_account_id, reseller_id, sub_reseller_id, client_id,
       event_type, entity_type, entity_id, old_value, new_value, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
    ]);
}
//# sourceMappingURL=audit.service.js.map