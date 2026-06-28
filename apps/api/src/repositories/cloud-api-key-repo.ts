import { db } from '../db'
import type { CloudApiKeyRecord } from '@stacklane/types'

export async function listCloudApiKeys(projectId: string) {
  const result = await db.query<CloudApiKeyRecord>(
    `SELECT id, project_id, name, key_prefix, key_hash, mode, status, last_used_at, created_at, updated_at
     FROM cloud_api_keys
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  )
  return result.rows
}

export async function createCloudApiKey(input: {
  id: string
  projectId: string
  name: string
  keyPrefix: string
  keyHash: string
  mode: 'dev' | 'live'
}) {
  const result = await db.query<CloudApiKeyRecord>(
    `INSERT INTO cloud_api_keys (id, project_id, name, key_prefix, key_hash, mode, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     RETURNING id, project_id, name, key_prefix, key_hash, mode, status, last_used_at, created_at, updated_at`,
    [input.id, input.projectId, input.name, input.keyPrefix, input.keyHash, input.mode]
  )
  return result.rows[0]
}

export async function findCloudApiKeyById(keyId: string) {
  const result = await db.query<CloudApiKeyRecord>(
    `SELECT id, project_id, name, key_prefix, key_hash, mode, status, last_used_at, created_at, updated_at
     FROM cloud_api_keys
     WHERE id = $1
     LIMIT 1`,
    [keyId]
  )
  return result.rows[0] || null
}

export async function findCloudApiKeyByHash(keyHash: string) {
  const result = await db.query<CloudApiKeyRecord>(
    `SELECT id, project_id, name, key_prefix, key_hash, mode, status, last_used_at, created_at, updated_at
     FROM cloud_api_keys
     WHERE key_hash = $1
     LIMIT 1`,
    [keyHash]
  )
  return result.rows[0] || null
}

export async function revokeCloudApiKey(keyId: string) {
  const result = await db.query<CloudApiKeyRecord>(
    `UPDATE cloud_api_keys
     SET status = 'revoked', updated_at = now()
     WHERE id = $1 AND status = 'active'
     RETURNING id, project_id, name, key_prefix, key_hash, mode, status, last_used_at, created_at, updated_at`,
    [keyId]
  )
  return result.rows[0] || null
}

export async function touchCloudApiKey(keyId: string) {
  await db.query(
    `UPDATE cloud_api_keys SET last_used_at = now() WHERE id = $1`,
    [keyId]
  )
}
