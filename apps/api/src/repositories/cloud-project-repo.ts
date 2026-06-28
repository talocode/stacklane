import { db } from '../db'
import type { CloudProjectRecord } from '@stacklane/types'

export async function createCloudProject(input: {
  id: string
  ownerId: string
  name: string
  slug: string
}) {
  const result = await db.query<CloudProjectRecord>(
    `INSERT INTO cloud_projects (id, owner_id, name, slug)
     VALUES ($1, $2, $3, $4)
     RETURNING id, owner_id, name, slug, created_at, updated_at`,
    [input.id, input.ownerId, input.name, input.slug]
  )
  return result.rows[0]
}

export async function listCloudProjectsByOwner(ownerId: string) {
  const result = await db.query<CloudProjectRecord>(
    `SELECT id, owner_id, name, slug, created_at, updated_at
     FROM cloud_projects
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [ownerId]
  )
  return result.rows
}

export async function findCloudProjectById(id: string) {
  const result = await db.query<CloudProjectRecord>(
    `SELECT id, owner_id, name, slug, created_at, updated_at
     FROM cloud_projects
     WHERE id = $1
     LIMIT 1`,
    [id]
  )
  return result.rows[0] || null
}

export async function findCloudProjectBySlug(slug: string) {
  const result = await db.query<CloudProjectRecord>(
    `SELECT id, owner_id, name, slug, created_at, updated_at
     FROM cloud_projects
     WHERE slug = $1
     LIMIT 1`,
    [slug]
  )
  return result.rows[0] || null
}
