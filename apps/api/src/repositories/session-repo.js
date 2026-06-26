"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.findSessionByHash = findSessionByHash;
exports.touchSession = touchSession;
exports.revokeSessionByHash = revokeSessionByHash;
const db_1 = require("../db");
async function createSession(input) {
    await db_1.db.query(`INSERT INTO control_plane_sessions (id, user_id, session_hash, expires_at)
      VALUES ($1, $2, $3, $4::timestamptz)`, [input.id, input.userId, input.sessionHash, input.expiresAt]);
}
async function findSessionByHash(sessionHash) {
    const result = await db_1.db.query(`SELECT id, user_id, session_hash, expires_at, revoked_at, created_at, last_seen_at
     FROM control_plane_sessions
     WHERE session_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()
     LIMIT 1`, [sessionHash]);
    return result.rows[0] || null;
}
async function touchSession(sessionId) {
    await db_1.db.query('UPDATE control_plane_sessions SET last_seen_at = now() WHERE id = $1', [sessionId]);
}
async function revokeSessionByHash(sessionHash) {
    await db_1.db.query('UPDATE control_plane_sessions SET revoked_at = now() WHERE session_hash = $1 AND revoked_at IS NULL', [sessionHash]);
}
//# sourceMappingURL=session-repo.js.map