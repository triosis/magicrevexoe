"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = getHealth;
function getHealth(_request, response) {
    response.status(200).json({
        success: true,
        service: 'magicreview-api',
    });
}
//# sourceMappingURL=health.controller.js.map