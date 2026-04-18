import { db } from '../db'
import type { AuditEventRecord } from '../types'

export async function recordAuditEvent(input: {
  id: string
  action: string
  targetType: string
  targetId: string
  organizationId?: string
  projectId?: string
  actorUserId?: string
  metadata?: Record<string, unknown>
}) {
  await db.query(
    `INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, action, target_type, target_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      input.id,
      input.organizationId || null,
      input.projectId || null,
      input.actorUserId || null,
      input.action,
      input.targetType,
      input.targetId,
      JSON.stringify(input.metadata || {})
    ]
  )
}

export async function listProjectEvents(projectId: string) {
  const result = await db.query<AuditEventRecord>(
    `SELECT id, organization_id, project_id, actor_user_id, action, target_type, target_id, metadata, created_at
      FROM audit_events
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [projectId]
  )
  return result.rows
}

export async function listOrganizationEvents(organizationId: string) {
  const result = await db.query<AuditEventRecord>(
    `SELECT id, organization_id, project_id, actor_user_id, action, target_type, target_id, metadata, created_at
      FROM audit_events
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [organizationId]
  )
  return result.rows
}
