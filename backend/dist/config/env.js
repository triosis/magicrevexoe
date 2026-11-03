"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.parseEnvironment = parseEnvironment;
require("./load-env");
const zod_1 = require("zod");
const emptyToUndefined = (value) => (value === '' ? undefined : value);
const requiredDatabaseVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
];
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    API_BASE_PATH: zod_1.z
        .string()
        .regex(/^\/[a-zA-Z0-9/_-]*$/, 'API_BASE_PATH must start with /')
        .transform((value) => value.replace(/\/$/, '') || '/')
        .default('/api'),
    DB_HOST: zod_1.z.string().min(1),
    DB_PORT: zod_1.z.coerce.number().int().positive(),
    DB_NAME: zod_1.z.string().min(1),
    DB_USER: zod_1.z.string().min(1),
    DB_PASSWORD: zod_1.z.string().min(1),
    JWT_ACCESS_SECRET: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().optional()),
    JWT_REFRESH_SECRET: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().optional()),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    COOKIE_SECURE: zod_1.z
        .string()
        .transform((value) => value === 'true')
        .default(false),
    SUPER_ADMIN_EMAIL: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().email().optional()),
    SUPER_ADMIN_PASSWORD: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().min(12).optional()),
});
function parseEnvironment(source) {
    for (const variable of requiredDatabaseVariables) {
        if (!source[variable] || source[variable].trim() === '') {
            throw new Error(`Missing required environment variable: ${variable}`);
        }
    }
    const parsedEnv = envSchema.safeParse(source);
    if (!parsedEnv.success) {
        throw new Error(`Invalid environment configuration: ${zod_1.z.prettifyError(parsedEnv.error)}`);
    }
    return parsedEnv.data;
}
exports.env = parseEnvironment(process.env);
//# sourceMappingURL=env.js.map