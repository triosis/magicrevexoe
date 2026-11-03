"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        email: zod_1.z
            .string()
            .email()
            .max(320)
            .transform((value) => value.toLowerCase()),
        password: zod_1.z.string().min(12).max(128),
        firstName: zod_1.z.string().trim().min(1).max(100),
        lastName: zod_1.z.string().trim().min(1).max(100),
        accountName: zod_1.z.string().trim().min(2).max(200),
    })
        .strict(),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        email: zod_1.z
            .string()
            .email()
            .max(320)
            .transform((value) => value.toLowerCase()),
        password: zod_1.z.string().min(1).max(128),
    })
        .strict(),
});
//# sourceMappingURL=auth.schemas.js.map