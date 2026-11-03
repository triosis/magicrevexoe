"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findClientById = findClientById;
exports.listClients = listClients;
const database_1 = require("../../config/database");
function scopeClause(tenant) {
    if (tenant.accountType === 'RESELLER')
        return { sql: 'AND reseller_id = ?', values: [tenant.resellerId] };
    if (tenant.accountType === 'SUB_RESELLER')
        return { sql: 'AND sub_reseller_id = ?', values: [tenant.subResellerId] };
    if (tenant.accountType === 'CLIENT')
        return { sql: 'AND id = ?', values: [tenant.clientId] };
    return { sql: '', values: [] };
}
async function findClientById(id, tenant) {
    const scope = scopeClause(tenant);
    const [rows] = await database_1.databasePool.execute(`SELECT CAST(id AS CHAR) AS id, CAST(account_id AS CHAR) AS account_id,
            CAST(reseller_id AS CHAR) AS reseller_id,
            CAST(sub_reseller_id AS CHAR) AS sub_reseller_id,
            CAST(client_id AS CHAR) AS client_id, name, status, created_at, updated_at
       FROM clients WHERE id = ? ${scope.sql} LIMIT 1`, [id, ...scope.values]);
    return rows[0] ?? null;
}
async function listClients(tenant) {
    const scope = scopeClause(tenant);
    const [rows] = await database_1.databasePool.execute(`SELECT CAST(id AS CHAR) AS id, CAST(account_id AS CHAR) AS account_id,
            CAST(reseller_id AS CHAR) AS reseller_id,
            CAST(sub_reseller_id AS CHAR) AS sub_reseller_id,
            CAST(client_id AS CHAR) AS client_id, name, status, created_at, updated_at
       FROM clients WHERE 1 = 1 ${scope.sql} ORDER BY id`, scope.values);
    return rows;
}
//# sourceMappingURL=client.repository.js.map