"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = getAuditLogs;
const audit_repository_1 = require("./audit.repository");
async function getAuditLogs(request, response) {
    const logs = await (0, audit_repository_1.listAuditLogs)(request.tenant, 100);
    response.json({ success: true, data: logs });
}
//# sourceMappingURL=audit.controller.js.map