"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantScope = void 0;
const app_error_1 = require("../utils/app-error");
const tenantScope = (request, _response, next) => {
    if (!request.auth) {
        next(new app_error_1.AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
        return;
    }
    request.tenant = {
        accountId: request.auth.accountId,
        accountType: request.auth.accountType,
        resellerId: request.auth.resellerId,
        subResellerId: request.auth.subResellerId,
        clientId: request.auth.clientId,
    };
    next();
};
exports.tenantScope = tenantScope;
//# sourceMappingURL=tenant-scope.middleware.js.map