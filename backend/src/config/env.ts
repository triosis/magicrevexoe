import './load-env';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const requiredDatabaseVariables = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
] as const;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_PATH: z
    .string()
    .regex(/^\/[a-zA-Z0-9/_-]*$/, 'API_BASE_PATH must start with /')
    .transform((value) => value.replace(/\/$/, '') || '/')
    .default('/api'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  JWT_ACCESS_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_REFRESH_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z
    .string()
    .transform((value) => value === 'true')
    .default(false),
  SUPER_ADMIN_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().optional(),
  ),
  SUPER_ADMIN_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(12).optional(),
  ),
});

export type Environment = z.infer<typeof envSchema>;

export function parseEnvironment(source: NodeJS.ProcessEnv): Environment {
  for (const variable of requiredDatabaseVariables) {
    if (!source[variable] || source[variable].trim() === '') {
      throw new Error(`Missing required environment variable: ${variable}`);
    }
  }

  const parsedEnv = envSchema.safeParse(source);

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid environment configuration: ${z.prettifyError(parsedEnv.error)}`,
    );
  }

  return parsedEnv.data;
}

export const env = parseEnvironment(process.env);
