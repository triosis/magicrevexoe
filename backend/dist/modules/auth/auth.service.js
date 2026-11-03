"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerClient = registerClient;
exports.login = login;
exports.refreshSession = refreshSession;
exports.logout = logout;
const bcrypt_1 = __importDefault(require("bcrypt"));
const app_error_1 = require("../../utils/app-error");
const auth_repository_1 = require("./auth.repository");
const token_service_1 = require("./token.service");
const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = '$2b$12$6QPdgdlvYTAq5IkIQF4qj.VxGIgGE1YW9IAgY7CPuGqtbpDzaJDiy';
async function issueTokens(user) {
    const accessToken = (0, token_service_1.createAccessToken)(user);
    const refresh = (0, token_service_1.createRefreshToken)(user);
    await (0, auth_repository_1.storeRefreshToken)({
        tokenId: refresh.tokenId,
        tokenHash: (0, token_service_1.hashRefreshToken)(refresh.token),
        userId: user.userId,
        accountId: user.accountId,
        resellerId: user.resellerId,
        subResellerId: user.subResellerId,
        clientId: user.clientId,
        expiresAt: refresh.expiresAt,
    });
    return { accessToken, refreshToken: refresh.token };
}
async function registerClient(input) {
    const passwordHash = await bcrypt_1.default.hash(input.password, BCRYPT_ROUNDS);
    let registration;
    try {
        registration = await (0, auth_repository_1.createClientRegistration)({ ...input, passwordHash });
    }
    catch (error) {
        if (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ER_DUP_ENTRY') {
            throw new app_error_1.AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
        }
        throw error;
    }
    const user = await (0, auth_repository_1.getAuthenticatedUser)(registration.userId, registration.accountId);
    if (!user)
        throw new app_error_1.AppError(500, 'REGISTRATION_FAILED', 'Registration could not be completed');
    return { user, ...(await issueTokens(user)) };
}
async function login(email, password) {
    const loginRecord = await (0, auth_repository_1.findLoginByEmail)(email);
    const validPassword = loginRecord
        ? await bcrypt_1.default.compare(password, loginRecord.password_hash)
        : await bcrypt_1.default.compare(password, DUMMY_PASSWORD_HASH);
    if (!loginRecord || !validPassword) {
        throw new app_error_1.AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const user = await (0, auth_repository_1.getAuthenticatedUser)(loginRecord.user_id, loginRecord.account_id);
    if (!user)
        throw new app_error_1.AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    return { user, ...(await issueTokens(user)) };
}
async function refreshSession(rawToken) {
    const claims = (0, token_service_1.verifyRefreshToken)(rawToken);
    const isValid = await (0, auth_repository_1.findValidRefreshToken)(claims.jti, (0, token_service_1.hashRefreshToken)(rawToken));
    if (!isValid)
        throw new app_error_1.AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    const user = await (0, auth_repository_1.getAuthenticatedUser)(claims.sub, claims.accountId);
    if (!user)
        throw new app_error_1.AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    await (0, auth_repository_1.revokeRefreshToken)(claims.jti);
    return { user, ...(await issueTokens(user)) };
}
async function logout(rawToken) {
    if (!rawToken)
        return;
    try {
        const claims = (0, token_service_1.verifyRefreshToken)(rawToken);
        await (0, auth_repository_1.revokeRefreshToken)(claims.jti);
    }
    catch {
        // Logout remains idempotent and never reveals token validity.
    }
}
//# sourceMappingURL=auth.service.js.map