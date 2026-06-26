"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjectApiKeys = listProjectApiKeys;
exports.createApiKey = createApiKey;
exports.findProjectApiKey = findProjectApiKey;
exports.revokeApiKey = revokeApiKey;
const db_1 = require("../db");
async function listProjectApiKeys(projectId) {
    const result = await db_1.db.query(`SELECT id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at
      FROM api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC`, [projectId]);
    return result.rows;
}
async function createApiKey(input) {
    const result = await db_1.db.query(`INSERT INTO api_keys (id, project_id, organization_id, name, key_prefix, key_hash, scope, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'project', 'active')
      RETURNING id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at`, [input.id, input.projectId, input.organizationId, input.name, input.keyPrefix, input.keyHash]);
    return result.rows[0];
}
async function findProjectApiKey(projectId, keyId) {
    const result = await db_1.db.query(`SELECT id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at
     FROM api_keys
     WHERE id = $1 AND project_id = $2
     LIMIT 1`, [keyId, projectId]);
    return result.rows[0] || null;
}
async function revokeApiKey(keyId, projectId) {
    const result = await db_1.db.query(`UPDATE api_keys
      SET status = 'revoked', revoked_at = now(), updated_at = now()
      WHERE id = $1 AND project_id = $2
      RETURNING id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at`, [keyId, projectId]);
    return result.rows[0] || null;
}
//# sourceMappingURL=api-key-repo.js.map