"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("./database");
const env_1 = require("./env");
function validEnvironment() {
    return {
        NODE_ENV: 'test',
        DB_HOST: 'localhost',
        DB_PORT: '3306',
        DB_NAME: 'zmpwnmuium_magicreview',
        DB_USER: 'zmpwnmuium_magicreview_user',
        DB_PASSWORD: 'runtime-provided-password',
    };
}
(0, vitest_1.describe)('database environment configuration', () => {
    (0, vitest_1.it)('uses the exact database values supplied by the environment', () => {
        const input = validEnvironment();
        const config = (0, env_1.parseEnvironment)(input);
        const options = (0, database_1.createDatabasePoolOptions)(config);
        (0, vitest_1.expect)(options).toMatchObject({
            host: input.DB_HOST,
            port: 3306,
            database: input.DB_NAME,
            user: input.DB_USER,
            password: input.DB_PASSWORD,
        });
    });
    (0, vitest_1.it)('rejects a missing DB_USER instead of applying a fallback', () => {
        const input = validEnvironment();
        delete input.DB_USER;
        (0, vitest_1.expect)(() => (0, env_1.parseEnvironment)(input)).toThrow('Missing required environment variable: DB_USER');
    });
    (0, vitest_1.it)('rejects a missing DB_PASSWORD instead of applying a fallback', () => {
        const input = validEnvironment();
        delete input.DB_PASSWORD;
        (0, vitest_1.expect)(() => (0, env_1.parseEnvironment)(input)).toThrow('Missing required environment variable: DB_PASSWORD');
    });
    (0, vitest_1.it)('never substitutes another username for the supplied DB_USER', () => {
        const input = validEnvironment();
        const config = (0, env_1.parseEnvironment)(input);
        (0, vitest_1.expect)(config.DB_USER).toBe(input.DB_USER);
    });
});
//# sourceMappingURL=database.config.test.js.map