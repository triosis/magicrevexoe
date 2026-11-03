"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authenticate_middleware_1 = require("../../middleware/authenticate.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const async_handler_1 = require("../../utils/async-handler");
const auth_controller_1 = require("./auth.controller");
const auth_schemas_1 = require("./auth.schemas");
exports.authRouter = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts',
    },
});
exports.authRouter.post('/register', authLimiter, (0, validate_middleware_1.validate)(auth_schemas_1.registerSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.register));
exports.authRouter.post('/login', authLimiter, (0, validate_middleware_1.validate)(auth_schemas_1.loginSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.loginUser));
exports.authRouter.post('/refresh', authLimiter, (0, async_handler_1.asyncHandler)(auth_controller_1.refresh));
exports.authRouter.post('/logout', authenticate_middleware_1.authenticate, (0, async_handler_1.asyncHandler)(auth_controller_1.logoutUser));
exports.authRouter.get('/me', authenticate_middleware_1.authenticate, auth_controller_1.me);
//# sourceMappingURL=auth.routes.js.map