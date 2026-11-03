"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const { loginMock, auditMock } = vitest_1.vi.hoisted(() => ({
    loginMock: vitest_1.vi.fn(),
    auditMock: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./auth.service', () => ({ login: loginMock }));
vitest_1.vi.mock('../audit/audit.service', () => ({ recordAuditEvent: auditMock }));
const auth_controller_1 = require("./auth.controller");
(0, vitest_1.describe)('authentication audit events', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('creates a LOGIN_SUCCESS audit record after login', async () => {
        const user = {
            userId: '1',
            email: 'owner@example.com',
            accountId: '2',
            accountType: 'CLIENT',
            role: 'CLIENT_OWNER',
            permissions: ['client.view'],
            resellerId: null,
            subResellerId: null,
            clientId: '3',
        };
        loginMock.mockResolvedValue({
            user,
            accessToken: 'access',
            refreshToken: 'refresh',
        });
        const request = {
            body: { email: user.email, password: 'not-logged' },
            ip: '127.0.0.1',
            get: () => 'test-agent',
        };
        const response = {
            cookie: vitest_1.vi.fn(),
            json: vitest_1.vi.fn(),
        };
        await (0, auth_controller_1.loginUser)(request, response);
        (0, vitest_1.expect)(auditMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            eventType: 'LOGIN_SUCCESS',
            actorUserId: '1',
            actorAccountId: '2',
        }));
    });
});
//# sourceMappingURL=auth.controller.test.js.map