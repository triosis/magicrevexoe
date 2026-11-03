"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const app_1 = require("../app");
let server;
(0, vitest_1.afterEach)(async () => {
    if (server)
        await new Promise((resolve) => server.close(() => resolve()));
    server = undefined;
});
async function request(app, path, init) {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    return fetch(`http://127.0.0.1:${port}${path}`, init);
}
(0, vitest_1.describe)('API base-path routing', () => {
    (0, vitest_1.it)('serves the local development health URL at /api/v1/health', async () => {
        const response = await request((0, app_1.createApp)({ passengerMounted: false }), '/api/v1/health');
        (0, vitest_1.expect)(response.status).toBe(200);
        await (0, vitest_1.expect)(response.json()).resolves.toEqual({
            success: true,
            service: 'magicreview-api',
        });
    });
    (0, vitest_1.it)('serves Passenger requests after /api is stripped from the internal URL', async () => {
        const response = await request((0, app_1.createApp)({ passengerMounted: true }), '/v1/health');
        (0, vitest_1.expect)(response.status).toBe(200);
    });
    (0, vitest_1.it)('serves Passenger requests when /api is retained in the internal URL', async () => {
        const response = await request((0, app_1.createApp)({ passengerMounted: true }), '/api/v1/health');
        (0, vitest_1.expect)(response.status).toBe(200);
    });
    (0, vitest_1.it)('does not duplicate the public API base prefix', async () => {
        const response = await request((0, app_1.createApp)({ passengerMounted: false }), '/api/api/v1/health');
        (0, vitest_1.expect)(response.status).toBe(404);
    });
    (0, vitest_1.it)('does not duplicate the API prefix when running under Passenger', async () => {
        const response = await request((0, app_1.createApp)({ passengerMounted: true }), '/api/api/v1/health');
        (0, vitest_1.expect)(response.status).toBe(404);
    });
    (0, vitest_1.it)('keeps the local login route mounted and validated', async () => {
        const response = await request((0, app_1.createApp)({ passengerMounted: false }), '/api/v1/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
        });
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)('protects the local current-user route', async () => {
        const response = await request((0, app_1.createApp)({ passengerMounted: false }), '/api/v1/auth/me');
        (0, vitest_1.expect)(response.status).toBe(401);
    });
});
//# sourceMappingURL=routing.integration.test.js.map