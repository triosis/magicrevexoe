"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
function notFoundHandler(request, response) {
    response.status(404).json({
        success: false,
        message: `Route not found: ${request.method} ${request.originalUrl}`,
    });
}
//# sourceMappingURL=not-found.middleware.js.map