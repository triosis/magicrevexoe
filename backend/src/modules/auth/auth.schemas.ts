import { z } from 'zod';

export const registerSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email()
        .max(320)
        .transform((value) => value.toLowerCase()),
      password: z.string().min(12).max(128),
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      accountName: z.string().trim().min(2).max(200),
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email()
        .max(320)
        .transform((value) => value.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .strict(),
});
