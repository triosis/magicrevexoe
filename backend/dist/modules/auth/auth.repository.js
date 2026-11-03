"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLoginByEmail = findLoginByEmail;
exports.getAuthenticatedUser = getAuthenticatedUser;
exports.createClientRegistration = createClientRegistration;
exports.storeRefreshToken = storeRefreshToken;
exports.findValidRefreshToken = findValidRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
const database_1 = require("../../config/database");
async function findLoginByEmail(email) {
    const [rows] = await database_1.databasePool.execute(`SELECT u.id AS user_id, u.email, u.password_hash, a.id AS account_id,
            a.account_type, r.code AS role, au.reseller_id, au.sub_reseller_id, au.client_id
       FROM users u
       JOIN account_users au ON au.user_id = u.id AND au.status = 'ACTIVE'
       JOIN accounts a ON a.id = au.account_id AND a.status = 'ACTIVE'
       JOIN roles r ON r.id = au.role_id
      WHERE u.email = ? AND u.status = 'ACTIVE'
      ORDER BY au.id LIMIT 1`, [email]);
    return rows[0] ?? null;
}
async function getAuthenticatedUser(userId, accountId) {
    const [rows] = await database_1.databasePool.execute(`SELECT CAST(u.id AS CHAR) AS userId, u.email, CAST(a.id AS CHAR) AS accountId,
            a.account_type AS accountType, r.code AS role,
            CAST(au.reseller_id AS CHAR) AS resellerId,
            CAST(au.sub_reseller_id AS CHAR) AS subResellerId,
            CAST(au.client_id AS CHAR) AS clientId,
            JSON_ARRAYAGG(p.code) AS permissions
       FROM users u
       JOIN account_users au ON au.user_id = u.id AND au.status = 'ACTIVE'
       JOIN accounts a ON a.id = au.account_id AND a.status = 'ACTIVE'
       JOIN roles r ON r.id = au.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ? AND a.id = ? AND u.status = 'ACTIVE'
      GROUP BY u.id, u.email, a.id, a.account_type, r.code,
               au.reseller_id, au.sub_reseller_id, au.client_id`, [userId, accountId]);
    return rows[0] ?? null;
}
async function createClientRegistration(input) {
    const connection = await database_1.databasePool.getConnection();
    try {
        await connection.beginTransaction();
        const [userResult] = await connection.execute('INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)', [input.email, input.passwordHash, input.firstName, input.lastName]);
        const [accountResult] = await connection.execute("INSERT INTO accounts (account_type, name) VALUES ('CLIENT', ?)", [input.accountName]);
        const [clientResult] = await connection.execute('INSERT INTO clients (account_id, name) VALUES (?, ?)', [accountResult.insertId, input.accountName]);
        await connection.execute('UPDATE clients SET client_id = ? WHERE id = ?', [
            clientResult.insertId,
            clientResult.insertId,
        ]);
        await connection.execute('UPDATE accounts SET client_id = ? WHERE id = ?', [
            clientResult.insertId,
            accountResult.insertId,
        ]);
        await connection.execute(`INSERT INTO account_users (account_id, user_id, role_id, client_id)
       SELECT ?, ?, id, ? FROM roles WHERE code = 'CLIENT_OWNER'`, [accountResult.insertId, userResult.insertId, clientResult.insertId]);
        await connection.commit();
        return {
            userId: String(userResult.insertId),
            accountId: String(accountResult.insertId),
            clientId: String(clientResult.insertId),
        };
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
async function storeRefreshToken(input, executor = database_1.databasePool) {
    await executor.execute(`INSERT INTO refresh_tokens
      (token_id, token_hash, user_id, account_id, reseller_id, sub_reseller_id, client_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        input.tokenId,
        input.tokenHash,
        input.userId,
        input.accountId,
        input.resellerId,
        input.subResellerId,
        input.clientId,
        input.expiresAt,
    ]);
}
async function findValidRefreshToken(tokenId, tokenHash) {
    const [rows] = await database_1.databasePool.execute(`SELECT id FROM refresh_tokens
      WHERE token_id = ? AND token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
      LIMIT 1`, [tokenId, tokenHash]);
    return rows.length === 1;
}
async function revokeRefreshToken(tokenId) {
    await database_1.databasePool.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_id = ? AND revoked_at IS NULL', [tokenId]);
}
//# sourceMappingURL=auth.repository.js.map