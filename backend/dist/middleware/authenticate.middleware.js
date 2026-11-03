"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_repository_1 = require("../modules/auth/auth.repository");
const token_service_1 = require("../modules/auth/token.service");
const app_error_1 = require("../utils/app-error");
const authenticate = async (request, _response, next) => {
    try {
        const header = request.get('authorization');
        if (!header?.startsWith('Bearer ')) {
            throw new app_error_1.AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
        }
        const claims = (0, token_service_1.verifyAccessToken)(header.slice(7));
        const user = await (0, auth_repository_1.getAuthenticatedUser)(claims.sub, claims.accountId);
        if (!user)
            throw new app_error_1.AppError(401, 'INVALID_TOKEN', 'Invalid access token');
        request.auth = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.JsonWebTokenError ||
            error instanceof jsonwebtoken_1.TokenExpiredError) {
            next(new app_error_1.AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token'));
            return;
        }
        next(error);
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.middleware.js.map