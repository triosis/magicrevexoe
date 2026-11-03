import mysql from 'mysql2/promise';
import { env, type Environment } from './env';

type DatabaseEnvironment = Pick<
  Environment,
  'DB_HOST' | 'DB_PORT' | 'DB_NAME' | 'DB_USER' | 'DB_PASSWORD'
>;

export function createDatabasePoolOptions(config: DatabaseEnvironment) {
  return {
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    queueLimit: 0,
    enableKeepAlive: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: false,
  };
}

export const databasePool = mysql.createPool(createDatabasePoolOptions(env));

export type DatabaseExecutor = Pick<
  mysql.Pool,
  'execute' | 'query' | 'getConnection'
>;
