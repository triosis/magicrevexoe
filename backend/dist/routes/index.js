"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const health_routes_1 = require("./health.routes");
const auth_routes_1 = require("../modules/auth/auth.routes");
const audit_routes_1 = require("../modules/audit/audit.routes");
const client_routes_1 = require("../modules/client/client.routes");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.use('/health', health_routes_1.healthRouter);
exports.apiRouter.use('/auth', auth_routes_1.authRouter);
exports.apiRouter.use('/clients', client_routes_1.clientRouter);
exports.apiRouter.use('/audit-logs', audit_routes_1.auditRouter);
//# sourceMappingURL=index.js.map