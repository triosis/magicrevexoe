"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../modules/audit/audit.service', () => ({
    recordAuditEvent: vitest_1.vi.fn(),
}));
const authenticate_middleware_1 = require("./authenticate.middleware");
const authorize_middleware_1 = require("./authorize.middleware");
const require_account_middleware_1 = require("./require-account.middleware");
function responseStub() {
    return {};
}
(0, vitest_1.describe)('protected API middleware', () => {
    (0, vitest_1.it)('returns 401 for an invalid JWT', async () => {
        const request = {
            get: () => 'Bearer invalid.jwt.token',
        };
        const next = vitest_1.vi.fn();
        await (0, authenticate_middleware_1.authenticate)(request, responseStub(), next);
        const error = vitest_1.vi.mocked(next).mock.calls[0]?.[0];
        (0, vitest_1.expect)(error.statusCode).toBe(401);
    });
    (0, vitest_1.it)('returns 403 when a required permission is missing', async () => {
        const request = {
            auth: {
                userId: '1',
                email: 'staff@example.com',
                accountId: '2',
                accountType: 'CLIENT',
                role: 'CLIENT_STAFF',
                permissions: [],
                resellerId: null,
                subResellerId: null,
                clientId: '3',
            },
            ip: '127.0.0.1',
            get: () => undefined,
        };
        const next = vitest_1.vi.fn();
        await (0, authorize_middleware_1.authorize)('billing.manage')(request, responseStub(), next);
        const error = vitest_1.vi.mocked(next).mock.calls[0]?.[0];
        (0, vitest_1.expect)(error.statusCode).toBe(403);
    });
    (0, vitest_1.it)('does not allow a Sub-Reseller to create another Sub-Reseller', () => {
        const request = {
            auth: { accountType: 'SUB_RESELLER' },
        };
        const next = vitest_1.vi.fn();
        (0, require_account_middleware_1.requireAccount)('SUPER_ADMIN', 'RESELLER')(request, responseStub(), next);
        (0, vitest_1.expect)((vitest_1.vi.mocked(next).mock.calls[0]?.[0]).statusCode).toBe(403);
    });
    (0, vitest_1.it)('does not allow a Client to access Reseller APIs', () => {
        const request = { auth: { accountType: 'CLIENT' } };
        const next = vitest_1.vi.fn();
        (0, require_account_middleware_1.requireAccount)('SUPER_ADMIN', 'RESELLER')(request, responseStub(), next);
        (0, vitest_1.expect)((vitest_1.vi.mocked(next).mock.calls[0]?.[0]).statusCode).toBe(403);
    });
});
//# sourceMappingURL=security.middleware.test.js.map