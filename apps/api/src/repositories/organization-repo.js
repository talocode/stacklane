"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrganizationsByUser = listOrganizationsByUser;
exports.findOrganizationByIdOrSlugForUser = findOrganizationByIdOrSlugForUser;
exports.createOrganization = createOrganization;
exports.addOrganizationMember = addOrganizationMember;
exports.findUserRoleForOrganization = findUserRoleForOrganization;
const db_1 = require("../db");
async function listOrganizationsByUser(userId) {
    const result = await db_1.db.query(`SELECT o.id, o.name, o.slug, o.status, o.created_at, o.updated_at
     FROM organizations o
     INNER JOIN organization_members m ON m.organization_id = o.id
     WHERE m.user_id = $1 AND m.status = 'active'
     ORDER BY o.created_at DESC`, [userId]);
    return result.rows;
}
async function findOrganizationByIdOrSlugForUser(idOrSlug, userId) {
    const result = await db_1.db.query(`SELECT o.id, o.name, o.slug, o.status, o.created_at, o.updated_at
     FROM organizations o
     INNER JOIN organization_members m ON m.organization_id = o.id
     WHERE (o.id = $1 OR o.slug = $1)
       AND m.user_id = $2
       AND m.status = 'active'
     LIMIT 1`, [idOrSlug, userId]);
    return result.rows[0] || null;
}
async function createOrganization(input) {
    const result = await db_1.db.query(`INSERT INTO organizations (id, name, slug, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING id, name, slug, status, created_at, updated_at`, [input.id, input.name, input.slug]);
    return result.rows[0];
}
async function addOrganizationMember(input) {
    await db_1.db.query(`INSERT INTO organization_members (id, organization_id, user_id, role, status)
      VALUES ($1, $2, $3, $4, 'active')
      ON CONFLICT (organization_id, user_id)
      DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now()`, [input.id, input.organizationId, input.userId, input.role]);
}
async function findUserRoleForOrganization(organizationId, userId) {
    const result = await db_1.db.query(`SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`, [organizationId, userId]);
    return result.rows[0]?.role || null;
}
//# sourceMappingURL=organization-repo.js.map