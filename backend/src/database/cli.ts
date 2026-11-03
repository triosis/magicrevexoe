import '../config/load-env';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { databasePool } from '../config/database';
import { env } from '../config/env';

const databaseRoot = path.resolve(process.cwd(), '..', 'database');

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigrations(): Promise<void> {
  await databasePool.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  const migrationDir = path.join(databaseRoot, 'migrations');
  const files = (await readdir(migrationDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const [existing] = await databasePool.execute<RowDataPacket[]>(
      'SELECT name FROM schema_migrations WHERE name = ?',
      [file],
    );
    if (existing.length > 0) continue;
    const connection = await databasePool.getConnection();
    try {
      const sql = await readFile(path.join(migrationDir, file), 'utf8');
      await connection.beginTransaction();
      for (const statement of splitStatements(sql))
        await connection.query(statement);
      await connection.execute(
        'INSERT INTO schema_migrations (name) VALUES (?)',
        [file],
      );
      await connection.commit();
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

async function seedSuperAdmin(): Promise<void> {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    console.log(
      'Skipped SUPER_ADMIN seed: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are not both configured.',
    );
    return;
  }
  const [existing] = await databasePool.execute<RowDataPacket[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [env.SUPER_ADMIN_EMAIL],
  );
  if (existing.length > 0) {
    console.log('Skipped SUPER_ADMIN seed: configured email already exists.');
    return;
  }
  const connection = await databasePool.getConnection();
  try {
    await connection.beginTransaction();
    const passwordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12);
    const [user] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES (?, ?, 'Platform', 'Administrator')`,
      [env.SUPER_ADMIN_EMAIL.toLowerCase(), passwordHash],
    );
    const [account] = await connection.execute<ResultSetHeader>(
      "INSERT INTO accounts (account_type, name) VALUES ('SUPER_ADMIN', 'MagicReview Platform')",
    );
    await connection.execute(
      `INSERT INTO account_users (account_id, user_id, role_id)
       SELECT ?, ?, id FROM roles WHERE code = 'SUPER_ADMIN'`,
      [account.insertId, user.insertId],
    );
    await connection.commit();
    console.log('Created the configured SUPER_ADMIN account.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function runSeeds(): Promise<void> {
  const seedDir = path.join(databaseRoot, 'seeds');
  const files = (await readdir(seedDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = await readFile(path.join(seedDir, file), 'utf8');
    for (const statement of splitStatements(sql))
      await databasePool.query(statement);
    console.log(`Applied seed: ${file}`);
  }
  await seedSuperAdmin();
}

async function resetDatabase(): Promise<void> {
  console.warn(
    'DESTRUCTIVE: dropping all MagicReview identity and tenancy tables.',
  );
  await databasePool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [
    'audit_logs',
    'refresh_tokens',
    'account_users',
    'role_permissions',
    'permissions',
    'roles',
    'clients',
    'sub_resellers',
    'resellers',
    'accounts',
    'users',
    'schema_migrations',
  ]) {
    await databasePool.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await databasePool.query('SET FOREIGN_KEY_CHECKS = 1');
  await runMigrations();
  await runSeeds();
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'migrate') await runMigrations();
  else if (command === 'seed') await runSeeds();
  else if (command === 'reset') await resetDatabase();
  else throw new Error('Usage: cli.ts <migrate|seed|reset>');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => databasePool.end());
