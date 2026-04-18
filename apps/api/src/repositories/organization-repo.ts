import { db } from '../db'
import type { OrganizationMembershipRecord, OrganizationRecord } from '../types'

export async function listOrganizationsByUser(userId: string) {
  const result = await db.query<OrganizationRecord>(
    `SELECT o.id, o.name, o.slug, o.status, o.created_at, o.updated_at
     FROM organizations o
     INNER JOIN organization_members m ON m.organization_id = o.id
     WHERE m.user_id = $1 AND m.status = 'active'
     ORDER BY o.created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function findOrganizationByIdOrSlugForUser(idOrSlug: string, userId: string) {
  const result = await db.query<OrganizationRecord>(
    `SELECT o.id, o.name, o.slug, o.status, o.created_at, o.updated_at
     FROM organizations o
     INNER JOIN organization_members m ON m.organization_id = o.id
     WHERE (o.id = $1 OR o.slug = $1)
       AND m.user_id = $2
       AND m.status = 'active'
     LIMIT 1`,
    [idOrSlug, userId]
  )
  return result.rows[0] || null
}

export async function createOrganization(input: { id: string; name: string; slug: string }) {
  const result = await db.query<OrganizationRecord>(
    `INSERT INTO organizations (id, name, slug, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING id, name, slug, status, created_at, updated_at`,
    [input.id, input.name, input.slug]
  )
  return result.rows[0]
}

export async function addOrganizationMember(input: {
  id: string
  organizationId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
}) {
  await db.query<OrganizationMembershipRecord>(
    `INSERT INTO organization_members (id, organization_id, user_id, role, status)
      VALUES ($1, $2, $3, $4, 'active')
      ON CONFLICT (organization_id, user_id)
      DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now()`,
    [input.id, input.organizationId, input.userId, input.role]
  )
}

export async function findUserRoleForOrganization(organizationId: string, userId: string) {
  const result = await db.query<{ role: 'owner' | 'admin' | 'member' }>(
    `SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`,
    [organizationId, userId]
  )
  return result.rows[0]?.role || null
}
