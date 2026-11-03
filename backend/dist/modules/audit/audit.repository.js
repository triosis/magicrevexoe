"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = listAuditLogs;
const database_1 = require("../../config/database");
async function listAuditLogs(tenant, limit) {
    const filters = [];
    const values = [];
    if (tenant.accountType === 'RESELLER') {
        filters.push('reseller_id = ?');
        values.push(tenant.resellerId);
    }
    else if (tenant.accountType === 'SUB_RESELLER') {
        filters.push('sub_reseller_id = ?');
        values.push(tenant.subResellerId);
    }
    else if (tenant.accountType === 'CLIENT') {
        filters.push('client_id = ?');
        values.push(tenant.clientId);
    }
    values.push(limit);
    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await database_1.databasePool.execute(`SELECT id, actor_user_id, actor_account_id, reseller_id, sub_reseller_id,
            client_id, event_type, entity_type, entity_id, old_value, new_value,
            ip_hash, user_agent, created_at
       FROM audit_logs ${where}
      ORDER BY created_at DESC, id DESC LIMIT ?`, values);
    return rows;
}
//# sourceMappingURL=audit.repository.js.map