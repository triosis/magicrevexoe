"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../config/load-env");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const databaseRoot = node_path_1.default.resolve(process.cwd(), '..', 'database');
function splitStatements(sql) {
    return sql
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean);
}
async function runMigrations() {
    await database_1.databasePool.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
    const migrationDir = node_path_1.default.join(databaseRoot, 'migrations');
    const files = (await (0, promises_1.readdir)(migrationDir))
        .filter((file) => file.endsWith('.sql'))
        .sort();
    for (const file of files) {
        const [existing] = await database_1.databasePool.execute('SELECT name FROM schema_migrations WHERE name = ?', [file]);
        if (existing.length > 0)
            continue;
        const connection = await database_1.databasePool.getConnection();
        try {
            const sql = await (0, promises_1.readFile)(node_path_1.default.join(migrationDir, file), 'utf8');
            await connection.beginTransaction();
            for (const statement of splitStatements(sql))
                await connection.query(statement);
            await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
            await connection.commit();
            console.log(`Applied migration: ${file}`);
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
}
async function seedSuperAdmin() {
    if (!env_1.env.SUPER_ADMIN_EMAIL || !env_1.env.SUPER_ADMIN_PASSWORD) {
        console.log('Skipped SUPER_ADMIN seed: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are not both configured.');
        return;
    }
    const [existing] = await database_1.databasePool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [env_1.env.SUPER_ADMIN_EMAIL]);
    if (existing.length > 0) {
        console.log('Skipped SUPER_ADMIN seed: configured email already exists.');
        return;
    }
    const connection = await database_1.databasePool.getConnection();
    try {
        await connection.beginTransaction();
        const passwordHash = await bcrypt_1.default.hash(env_1.env.SUPER_ADMIN_PASSWORD, 12);
        const [user] = await connection.execute(`INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES (?, ?, 'Platform', 'Administrator')`, [env_1.env.SUPER_ADMIN_EMAIL.toLowerCase(), passwordHash]);
        const [account] = await connection.execute("INSERT INTO accounts (account_type, name) VALUES ('SUPER_ADMIN', 'MagicReview Platform')");
        await connection.execute(`INSERT INTO account_users (account_id, user_id, role_id)
       SELECT ?, ?, id FROM roles WHERE code = 'SUPER_ADMIN'`, [account.insertId, user.insertId]);
        await connection.commit();
        console.log('Created the configured SUPER_ADMIN account.');
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
async function runSeeds() {
    const seedDir = node_path_1.default.join(databaseRoot, 'seeds');
    const files = (await (0, promises_1.readdir)(seedDir))
        .filter((file) => file.endsWith('.sql'))
        .sort();
    for (const file of files) {
        const sql = await (0, promises_1.readFile)(node_path_1.default.join(seedDir, file), 'utf8');
        for (const statement of splitStatements(sql))
            await database_1.databasePool.query(statement);
        console.log(`Applied seed: ${file}`);
    }
    await seedSuperAdmin();
}
async function resetDatabase() {
    console.warn('DESTRUCTIVE: dropping all MagicReview identity and tenancy tables.');
    await database_1.databasePool.query('SET FOREIGN_KEY_CHECKS = 0');
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
        await database_1.databasePool.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await database_1.databasePool.query('SET FOREIGN_KEY_CHECKS = 1');
    await runMigrations();
    await runSeeds();
}
async function main() {
    const command = process.argv[2];
    if (command === 'migrate')
        await runMigrations();
    else if (command === 'seed')
        await runSeeds();
    else if (command === 'reset')
        await resetDatabase();
    else
        throw new Error('Usage: cli.ts <migrate|seed|reset>');
}
main()
    .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
})
    .finally(async () => database_1.databasePool.end());
//# sourceMappingURL=cli.js.map