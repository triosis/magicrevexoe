"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const authenticate_middleware_1 = require("../../middleware/authenticate.middleware");
const authorize_middleware_1 = require("../../middleware/authorize.middleware");
const tenant_scope_middleware_1 = require("../../middleware/tenant-scope.middleware");
const async_handler_1 = require("../../utils/async-handler");
const audit_controller_1 = require("./audit.controller");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.get('/', authenticate_middleware_1.authenticate, (0, authorize_middleware_1.authorize)('audit.view'), tenant_scope_middleware_1.tenantScope, (0, async_handler_1.asyncHandler)(audit_controller_1.getAuditLogs));
//# sourceMappingURL=audit.routes.js.map