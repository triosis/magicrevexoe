"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const api_path_1 = require("./api-path");
(0, vitest_1.describe)('API mount paths', () => {
    (0, vitest_1.it)('uses only the canonical public path outside Passenger', () => {
        (0, vitest_1.expect)((0, api_path_1.getApiRouterMountPaths)('/api', false)).toEqual(['/api/v1']);
    });
    (0, vitest_1.it)('adds the stripped internal path under Passenger', () => {
        (0, vitest_1.expect)((0, api_path_1.getApiRouterMountPaths)('/api', true)).toEqual(['/api/v1', '/v1']);
    });
    (0, vitest_1.it)('detects Passenger independently of NODE_ENV', () => {
        (0, vitest_1.expect)((0, api_path_1.isPassengerRuntime)({ NODE_ENV: 'production' })).toBe(false);
        (0, vitest_1.expect)((0, api_path_1.isPassengerRuntime)({ PASSENGER_BASE_URI: '/api' })).toBe(true);
    });
});
//# sourceMappingURL=api-path.test.js.map