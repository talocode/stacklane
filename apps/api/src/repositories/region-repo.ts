import { db } from '../db'
import type { RegionRecord } from '../types'

export async function listRegions() {
  const result = await db.query<RegionRecord>(
    `SELECT id, code, name, market_scope, deployment_target, is_active, metadata, created_at, updated_at
     FROM regions
     WHERE is_active = true
     ORDER BY code ASC`
  )
  return result.rows
}

export async function findRegionByCode(code: string) {
  const result = await db.query<RegionRecord>(
    `SELECT id, code, name, market_scope, deployment_target, is_active, metadata, created_at, updated_at
     FROM regions
     WHERE code = $1
     LIMIT 1`,
    [code]
  )
  return result.rows[0] || null
}

export async function findRegionById(id: string) {
  const result = await db.query<RegionRecord>(
    `SELECT id, code, name, market_scope, deployment_target, is_active, metadata, created_at, updated_at
     FROM regions
     WHERE id = $1
     LIMIT 1`,
    [id]
  )
  return result.rows[0] || null
}

export async function upsertRegion(input: {
  id: string
  code: string
  name: string
  marketScope: string
  deploymentTarget: string
  metadata?: Record<string, unknown>
}) {
  await db.query(
    `INSERT INTO regions (id, code, name, market_scope, deployment_target, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (code)
     DO UPDATE SET name = EXCLUDED.name, market_scope = EXCLUDED.market_scope,
                   deployment_target = EXCLUDED.deployment_target,
                   metadata = EXCLUDED.metadata,
                   updated_at = now()`,
    [input.id, input.code, input.name, input.marketScope, input.deploymentTarget, JSON.stringify(input.metadata || {})]
  )
}
