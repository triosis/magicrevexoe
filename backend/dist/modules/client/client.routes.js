"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientRouter = void 0;
const express_1 = require("express");
const authenticate_middleware_1 = require("../../middleware/authenticate.middleware");
const authorize_middleware_1 = require("../../middleware/authorize.middleware");
const tenant_scope_middleware_1 = require("../../middleware/tenant-scope.middleware");
const async_handler_1 = require("../../utils/async-handler");
const client_controller_1 = require("./client.controller");
exports.clientRouter = (0, express_1.Router)();
exports.clientRouter.use(authenticate_middleware_1.authenticate, (0, authorize_middleware_1.authorize)('client.view'), tenant_scope_middleware_1.tenantScope);
exports.clientRouter.get('/', (0, async_handler_1.asyncHandler)(client_controller_1.getClients));
exports.clientRouter.get('/:id', (0, async_handler_1.asyncHandler)(client_controller_1.getClient));
//# sourceMappingURL=client.routes.js.map