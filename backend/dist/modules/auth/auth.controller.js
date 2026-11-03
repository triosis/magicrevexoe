"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.loginUser = loginUser;
exports.refresh = refresh;
exports.logoutUser = logoutUser;
exports.me = me;
const env_1 = require("../../config/env");
const audit_service_1 = require("../audit/audit.service");
const request_metadata_1 = require("../../utils/request-metadata");
const app_error_1 = require("../../utils/app-error");
const auth_service_1 = require("./auth.service");
const REFRESH_COOKIE = 'magicreview_refresh';
const cookieOptions = {
    httpOnly: true,
    secure: env_1.env.COOKIE_SECURE,
    sameSite: 'strict',
    path: '/api/v1/auth',
};
function publicUser(user) {
    return {
        id: user.userId,
        email: user.email,
        accountId: user.accountId,
        accountType: user.accountType,
        role: user.role,
        permissions: user.permissions,
        tenant: {
            resellerId: user.resellerId,
            subResellerId: user.subResellerId,
            clientId: user.clientId,
        },
    };
}
async function register(request, response) {
    const result = await (0, auth_service_1.registerClient)(request.body);
    response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    await (0, audit_service_1.recordAuditEvent)({
        actorUserId: result.user.userId,
        actorAccountId: result.user.accountId,
        tenant: result.user,
        eventType: 'USER_CREATED',
        entityType: 'USER',
        entityId: result.user.userId,
        ...(0, request_metadata_1.getRequestMetadata)(request),
    });
    response.status(201).json({
        success: true,
        accessToken: result.accessToken,
        user: publicUser(result.user),
    });
}
async function loginUser(request, response) {
    try {
        const result = await (0, auth_service_1.login)(request.body.email, request.body.password);
        response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
        await (0, audit_service_1.recordAuditEvent)({
            actorUserId: result.user.userId,
            actorAccountId: result.user.accountId,
            tenant: result.user,
            eventType: 'LOGIN_SUCCESS',
            entityType: 'USER',
            entityId: result.user.userId,
            ...(0, request_metadata_1.getRequestMetadata)(request),
        });
        response.json({
            success: true,
            accessToken: result.accessToken,
            user: publicUser(result.user),
        });
    }
    catch (error) {
        if (error instanceof app_error_1.AppError && error.code === 'INVALID_CREDENTIALS') {
            await (0, audit_service_1.recordAuditEvent)({
                eventType: 'LOGIN_FAILED',
                entityType: 'USER',
                newValue: { email: request.body.email },
                ...(0, request_metadata_1.getRequestMetadata)(request),
            });
        }
        throw error;
    }
}
async function refresh(request, response) {
    const rawToken = request.cookies?.[REFRESH_COOKIE];
    if (!rawToken)
        throw new app_error_1.AppError(401, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required');
    const result = await (0, auth_service_1.refreshSession)(rawToken);
    response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    response.json({ success: true, accessToken: result.accessToken });
}
async function logoutUser(request, response) {
    const rawToken = request.cookies?.[REFRESH_COOKIE];
    await (0, auth_service_1.logout)(rawToken);
    response.clearCookie(REFRESH_COOKIE, cookieOptions);
    await (0, audit_service_1.recordAuditEvent)({
        actorUserId: request.auth?.userId,
        actorAccountId: request.auth?.accountId,
        tenant: request.auth,
        eventType: 'LOGOUT',
        entityType: 'USER',
        entityId: request.auth?.userId,
        ...(0, request_metadata_1.getRequestMetadata)(request),
    });
    response.json({ success: true });
}
function me(request, response) {
    response.json({ success: true, user: publicUser(request.auth) });
}
//# sourceMappingURL=auth.controller.js.map