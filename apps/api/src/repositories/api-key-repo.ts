import { db } from '../db'
import type { ApiKeyRecord } from '../types'

export async function listProjectApiKeys(projectId: string) {
  const result = await db.query<ApiKeyRecord>(
    `SELECT id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at
      FROM api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC`,
    [projectId]
  )
  return result.rows
}

export async function createApiKey(input: {
  id: string
  projectId: string
  organizationId: string
  name: string
  keyPrefix: string
  keyHash: string
}) {
  const result = await db.query<ApiKeyRecord>(
    `INSERT INTO api_keys (id, project_id, organization_id, name, key_prefix, key_hash, scope, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'project', 'active')
      RETURNING id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at`,
    [input.id, input.projectId, input.organizationId, input.name, input.keyPrefix, input.keyHash]
  )
  return result.rows[0]
}

export async function findProjectApiKey(projectId: string, keyId: string) {
  const result = await db.query<ApiKeyRecord>(
    `SELECT id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at
     FROM api_keys
     WHERE id = $1 AND project_id = $2
     LIMIT 1`,
    [keyId, projectId]
  )
  return result.rows[0] || null
}

export async function revokeApiKey(keyId: string, projectId: string) {
  const result = await db.query<ApiKeyRecord>(
    `UPDATE api_keys
      SET status = 'revoked', revoked_at = now(), updated_at = now()
      WHERE id = $1 AND project_id = $2
      RETURNING id, project_id, organization_id, name, key_prefix, key_hash, scope, status, revoked_at, last_used_at, created_at, updated_at`,
    [keyId, projectId]
  )
  return result.rows[0] || null
}
