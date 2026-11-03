"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
const audit_service_1 = require("../modules/audit/audit.service");
const app_error_1 = require("../utils/app-error");
const request_metadata_1 = require("../utils/request-metadata");
function authorize(permission) {
    return async (request, _response, next) => {
        if (request.auth?.permissions.includes(permission)) {
            next();
            return;
        }
        if (request.auth) {
            await (0, audit_service_1.recordAuditEvent)({
                actorUserId: request.auth.userId,
                actorAccountId: request.auth.accountId,
                tenant: request.auth,
                eventType: 'PERMISSION_DENIED',
                entityType: 'PERMISSION',
                newValue: { permission },
                ...(0, request_metadata_1.getRequestMetadata)(request),
            });
        }
        next(new app_error_1.AppError(403, 'PERMISSION_DENIED', 'You do not have permission to perform this action'));
    };
}
//# sourceMappingURL=authorize.middleware.js.map