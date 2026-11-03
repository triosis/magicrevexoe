"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestMetadata = getRequestMetadata;
const node_crypto_1 = require("node:crypto");
function getRequestMetadata(request) {
    const ipHash = request.ip
        ? (0, node_crypto_1.createHash)('sha256').update(request.ip).digest('hex')
        : null;
    return {
        ipHash,
        userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
    };
}
//# sourceMappingURL=request-metadata.js.map