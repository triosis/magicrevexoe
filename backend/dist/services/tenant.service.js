"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantContext = getTenantContext;
exports.assertTenantAccess = assertTenantAccess;
exports.getVisibleClientIds = getVisibleClientIds;
exports.getVisibleResellerIds = getVisibleResellerIds;
const database_1 = require("../config/database");
const app_error_1 = require("../utils/app-error");
function getTenantContext(context) {
    return { ...context };
}
function assertTenantAccess(actor, target) {
    const allowed = actor.accountType === 'SUPER_ADMIN' ||
        (actor.accountType === 'RESELLER' &&
            actor.resellerId === target.resellerId) ||
        (actor.accountType === 'SUB_RESELLER' &&
            actor.subResellerId === target.subResellerId) ||
        (actor.accountType === 'CLIENT' && actor.clientId === target.clientId);
    if (!allowed) {
        // A 404 avoids disclosing that a cross-tenant entity exists.
        throw new app_error_1.AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
    }
}
async function getVisibleClientIds(context) {
    const clauses = [];
    const values = [];
    if (context.accountType === 'RESELLER') {
        clauses.push('reseller_id = ?');
        values.push(context.resellerId);
    }
    else if (context.accountType === 'SUB_RESELLER') {
        clauses.push('sub_reseller_id = ?');
        values.push(context.subResellerId);
    }
    else if (context.accountType === 'CLIENT') {
        clauses.push('id = ?');
        values.push(context.clientId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await database_1.databasePool.execute(`SELECT CAST(id AS CHAR) AS id FROM clients ${where}`, values);
    return rows.map((row) => row.id);
}
async function getVisibleResellerIds(context) {
    if (context.accountType === 'SUPER_ADMIN') {
        const [rows] = await database_1.databasePool.execute('SELECT CAST(id AS CHAR) AS id FROM resellers');
        return rows.map((row) => row.id);
    }
    return context.resellerId ? [context.resellerId] : [];
}
//# sourceMappingURL=tenant.service.js.map