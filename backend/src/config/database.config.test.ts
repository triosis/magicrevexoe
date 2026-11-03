import { describe, expect, it } from 'vitest';
import { createDatabasePoolOptions } from './database';
import { parseEnvironment } from './env';

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_NAME: 'zmpwnmuium_magicreview',
    DB_USER: 'zmpwnmuium_magicreview_user',
    DB_PASSWORD: 'runtime-provided-password',
  };
}

describe('database environment configuration', () => {
  it('uses the exact database values supplied by the environment', () => {
    const input = validEnvironment();
    const config = parseEnvironment(input);
    const options = createDatabasePoolOptions(config);

    expect(options).toMatchObject({
      host: input.DB_HOST,
      port: 3306,
      database: input.DB_NAME,
      user: input.DB_USER,
      password: input.DB_PASSWORD,
    });
  });

  it('rejects a missing DB_USER instead of applying a fallback', () => {
    const input = validEnvironment();
    delete input.DB_USER;

    expect(() => parseEnvironment(input)).toThrow(
      'Missing required environment variable: DB_USER',
    );
  });

  it('rejects a missing DB_PASSWORD instead of applying a fallback', () => {
    const input = validEnvironment();
    delete input.DB_PASSWORD;

    expect(() => parseEnvironment(input)).toThrow(
      'Missing required environment variable: DB_PASSWORD',
    );
  });

  it('never substitutes another username for the supplied DB_USER', () => {
    const input = validEnvironment();
    const config = parseEnvironment(input);

    expect(config.DB_USER).toBe(input.DB_USER);
  });
});
