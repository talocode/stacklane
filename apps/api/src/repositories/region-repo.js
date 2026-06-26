"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRegions = listRegions;
exports.findRegionByCode = findRegionByCode;
exports.findRegionById = findRegionById;
exports.upsertRegion = upsertRegion;
const db_1 = require("../db");
async function listRegions() {
    const result = await db_1.db.query(`SELECT id, code, name, market_scope, deployment_target, is_active, metadata, created_at, updated_at
     FROM regions
     WHERE is_active = true
     ORDER BY code ASC`);
    return result.rows;
}
async function findRegionByCode(code) {
    const result = await db_1.db.query(`SELECT id, code, name, market_scope, deployment_target, is_active, metadata, created_at, updated_at
     FROM regions
     WHERE code = $1
     LIMIT 1`, [code]);
    return result.rows[0] || null;
}
async function findRegionById(id) {
    const result = await db_1.db.query(`SELECT id, code, name, market_scope, deployment_target, is_active, metadata, created_at, updated_at
     FROM regions
     WHERE id = $1
     LIMIT 1`, [id]);
    return result.rows[0] || null;
}
async function upsertRegion(input) {
    await db_1.db.query(`INSERT INTO regions (id, code, name, market_scope, deployment_target, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (code)
     DO UPDATE SET name = EXCLUDED.name, market_scope = EXCLUDED.market_scope,
                   deployment_target = EXCLUDED.deployment_target,
                   metadata = EXCLUDED.metadata,
                   updated_at = now()`, [input.id, input.code, input.name, input.marketScope, input.deploymentTarget, JSON.stringify(input.metadata || {})]);
}
//# sourceMappingURL=region-repo.js.map