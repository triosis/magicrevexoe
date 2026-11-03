"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const app_error_1 = require("../utils/app-error");
const errorHandler = (error, _request, response, _next) => {
    void _next;
    logger_1.logger.error({ err: error }, 'Unhandled request error');
    if (error instanceof zod_1.ZodError) {
        response.status(400).json({
            success: false,
            message: 'Validation failed',
            issues: error.issues,
        });
        return;
    }
    if (error instanceof app_error_1.AppError) {
        response.status(error.statusCode).json({
            success: false,
            code: error.code,
            message: error.message,
            ...(error.details === undefined ? {} : { details: error.details }),
        });
        return;
    }
    response.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(env_1.env.NODE_ENV === 'development' && error instanceof Error
            ? { error: error.message }
            : {}),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map