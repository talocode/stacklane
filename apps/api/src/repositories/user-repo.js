"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.touchUserLogin = touchUserLogin;
const db_1 = require("../db");
async function findUserByEmail(email) {
    const result = await db_1.db.query(`SELECT id, email, name, status, password_hash, last_login_at, created_at, updated_at
     FROM users WHERE email = $1 LIMIT 1`, [email]);
    return result.rows[0] || null;
}
async function findUserById(id) {
    const result = await db_1.db.query(`SELECT id, email, name, status, password_hash, last_login_at, created_at, updated_at
     FROM users WHERE id = $1 LIMIT 1`, [id]);
    return result.rows[0] || null;
}
async function touchUserLogin(id) {
    await db_1.db.query('UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1', [id]);
}
//# sourceMappingURL=user-repo.js.map