"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditEvent = recordAuditEvent;
exports.listProjectEvents = listProjectEvents;
exports.listOrganizationEvents = listOrganizationEvents;
const db_1 = require("../db");
async function recordAuditEvent(input) {
    await db_1.db.query(`INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, action, target_type, target_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`, [
        input.id,
        input.organizationId || null,
        input.projectId || null,
        input.actorUserId || null,
        input.action,
        input.targetType,
        input.targetId,
        JSON.stringify(input.metadata || {})
    ]);
}
async function listProjectEvents(projectId) {
    const result = await db_1.db.query(`SELECT id, organization_id, project_id, actor_user_id, action, target_type, target_id, metadata, created_at
      FROM audit_events
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 100`, [projectId]);
    return result.rows;
}
async function listOrganizationEvents(organizationId) {
    const result = await db_1.db.query(`SELECT id, organization_id, project_id, actor_user_id, action, target_type, target_id, metadata, created_at
      FROM audit_events
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 100`, [organizationId]);
    return result.rows;
}
//# sourceMappingURL=audit-repo.js.map