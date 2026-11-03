"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const app_error_1 = require("../utils/app-error");
const tenant_service_1 = require("./tenant.service");
function tenant(overrides) {
    return {
        accountId: '1',
        accountType: 'CLIENT',
        resellerId: null,
        subResellerId: null,
        clientId: null,
        ...overrides,
    };
}
(0, vitest_1.describe)('tenant isolation', () => {
    (0, vitest_1.it)('allows Super Admin to access platform-level resources', () => {
        (0, vitest_1.expect)(() => (0, tenant_service_1.assertTenantAccess)(tenant({ accountType: 'SUPER_ADMIN' }), {
            resellerId: '99',
            subResellerId: '98',
            clientId: '97',
        })).not.toThrow();
    });
    (0, vitest_1.it)('allows a Reseller to access its own client', () => {
        (0, vitest_1.expect)(() => (0, tenant_service_1.assertTenantAccess)(tenant({ accountType: 'RESELLER', resellerId: '10' }), {
            resellerId: '10',
            subResellerId: null,
            clientId: '30',
        })).not.toThrow();
    });
    (0, vitest_1.it)("does not allow a Reseller to access another Reseller's client", () => {
        (0, vitest_1.expect)(() => (0, tenant_service_1.assertTenantAccess)(tenant({ accountType: 'RESELLER', resellerId: '10' }), {
            resellerId: '11',
            subResellerId: null,
            clientId: '30',
        })).toThrow(app_error_1.AppError);
    });
    (0, vitest_1.it)('allows a Sub-Reseller to access only its own clients', () => {
        const actor = tenant({
            accountType: 'SUB_RESELLER',
            resellerId: '10',
            subResellerId: '20',
        });
        (0, vitest_1.expect)(() => (0, tenant_service_1.assertTenantAccess)(actor, {
            resellerId: '10',
            subResellerId: '20',
            clientId: '30',
        })).not.toThrow();
        (0, vitest_1.expect)(() => (0, tenant_service_1.assertTenantAccess)(actor, {
            resellerId: '10',
            subResellerId: '21',
            clientId: '31',
        })).toThrow(app_error_1.AppError);
    });
    (0, vitest_1.it)('does not allow a Client to access another Client', () => {
        (0, vitest_1.expect)(() => (0, tenant_service_1.assertTenantAccess)(tenant({ accountType: 'CLIENT', clientId: '30' }), {
            resellerId: null,
            subResellerId: null,
            clientId: '31',
        })).toThrow(app_error_1.AppError);
    });
});
//# sourceMappingURL=tenant.service.test.js.map