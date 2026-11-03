"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAccount = requireAccount;
const app_error_1 = require("../utils/app-error");
function requireAccount(...types) {
    return (request, _response, next) => {
        if (!request.auth || !types.includes(request.auth.accountType)) {
            next(new app_error_1.AppError(403, 'ACCOUNT_TYPE_FORBIDDEN', 'This account type cannot access this resource'));
            return;
        }
        next();
    };
}
//# sourceMappingURL=require-account.middleware.js.map