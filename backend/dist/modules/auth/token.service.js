"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.createRefreshToken = createRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const app_error_1 = require("../../utils/app-error");
function requireSecret(value, name) {
    if (!value || value.length < 32) {
        throw new app_error_1.AppError(500, 'AUTH_CONFIGURATION_ERROR', `${name} must contain at least 32 characters`);
    }
    return value;
}
function createAccessToken(user) {
    return jsonwebtoken_1.default.sign({ accountId: user.accountId, type: 'access' }, requireSecret(env_1.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'), {
        subject: user.userId,
        expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN,
    });
}
function createRefreshToken(user) {
    const tokenId = (0, node_crypto_1.randomUUID)();
    const secret = requireSecret(env_1.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    const token = jsonwebtoken_1.default.sign({ accountId: user.accountId, type: 'refresh' }, secret, {
        subject: user.userId,
        jwtid: tokenId,
        expiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN,
    });
    const decoded = jsonwebtoken_1.default.decode(token);
    if (!decoded || typeof decoded === 'string' || !decoded.exp) {
        throw new app_error_1.AppError(500, 'TOKEN_CREATION_FAILED', 'Could not create refresh token');
    }
    return { token, tokenId, expiresAt: new Date(decoded.exp * 1000) };
}
function verifyAccessToken(token) {
    const claims = jsonwebtoken_1.default.verify(token, requireSecret(env_1.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'));
    if (typeof claims === 'string' ||
        claims.type !== 'access' ||
        !claims.sub ||
        !claims.accountId) {
        throw new app_error_1.AppError(401, 'INVALID_TOKEN', 'Invalid access token');
    }
    return {
        sub: claims.sub,
        accountId: String(claims.accountId),
        type: 'access',
    };
}
function verifyRefreshToken(token) {
    const claims = jsonwebtoken_1.default.verify(token, requireSecret(env_1.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'));
    if (typeof claims === 'string' ||
        claims.type !== 'refresh' ||
        !claims.sub ||
        !claims.accountId ||
        !claims.jti) {
        throw new app_error_1.AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }
    return {
        sub: claims.sub,
        accountId: String(claims.accountId),
        jti: claims.jti,
        type: 'refresh',
    };
}
function hashRefreshToken(token) {
    return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
}
//# sourceMappingURL=token.service.js.map