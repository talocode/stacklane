import { db } from '../db'
import type { EnvironmentRecord, ProjectRecord } from '../types'

export async function listProjectsByUser(userId: string) {
  const result = await db.query<ProjectRecord>(
    `SELECT p.id, p.organization_id, p.name, p.slug, p.status, p.region, p.description, p.created_at, p.updated_at
     FROM projects p
     INNER JOIN organization_members m ON m.organization_id = p.organization_id
     WHERE m.user_id = $1 AND m.status = 'active'
     ORDER BY p.created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function listProjectsByOrganizationForUser(organizationId: string, userId: string) {
  const result = await db.query<ProjectRecord>(
    `SELECT p.id, p.organization_id, p.name, p.slug, p.status, p.region, p.description, p.created_at, p.updated_at
     FROM projects p
     INNER JOIN organization_members m ON m.organization_id = p.organization_id
     WHERE p.organization_id = $1
       AND m.user_id = $2
       AND m.status = 'active'
     ORDER BY p.created_at DESC`,
    [organizationId, userId]
  )
  return result.rows
}

export async function findProjectByIdOrSlugForUser(idOrSlug: string, userId: string) {
  const result = await db.query<ProjectRecord>(
    `SELECT p.id, p.organization_id, p.name, p.slug, p.status, p.region, p.description, p.created_at, p.updated_at
      FROM projects p
      INNER JOIN organization_members m ON m.organization_id = p.organization_id
      WHERE (p.id = $1 OR p.slug = $1)
        AND m.user_id = $2
        AND m.status = 'active'
      LIMIT 1`,
    [idOrSlug, userId]
  )
  return result.rows[0] || null
}


export async function findProjectById(projectId: string) {
  const result = await db.query<ProjectRecord>(
    `SELECT p.id, p.organization_id, p.name, p.slug, p.status, p.region, p.description, p.created_at, p.updated_at
      FROM projects p
      WHERE p.id = $1
      LIMIT 1`,
    [projectId]
  )
  return result.rows[0] || null
}

export async function createProject(input: {
  id: string
  organizationId: string
  name: string
  slug: string
  status: string
  region: string
  description: string
}) {
  const result = await db.query<ProjectRecord>(
    `INSERT INTO projects (id, organization_id, name, slug, status, region, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, organization_id, name, slug, status, region, description, created_at, updated_at`,
    [input.id, input.organizationId, input.name, input.slug, input.status, input.region, input.description]
  )
  return result.rows[0]
}

export async function updateProject(
  id: string,
  updates: { name?: string; status?: string; description?: string }
) {
  const fields: string[] = []
  const values: string[] = []

  if (updates.name !== undefined) {
    fields.push(`name = $${fields.length + 1}`)
    values.push(updates.name)
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${fields.length + 1}`)
    values.push(updates.status)
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${fields.length + 1}`)
    values.push(updates.description)
  }

  fields.push('updated_at = now()')

  const result = await db.query<ProjectRecord>(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${fields.length + 1}
     RETURNING id, organization_id, name, slug, status, region, description, created_at, updated_at`,
    [...values, id]
  )

  return result.rows[0] || null
}

export async function listProjectEnvironments(projectId: string) {
  const result = await db.query<EnvironmentRecord>(
    `SELECT id, project_id, name, slug, status, region, deployment_target, created_at, updated_at
      FROM environments
      WHERE project_id = $1
      ORDER BY created_at ASC`,
    [projectId]
  )
  return result.rows
}

export async function createProjectEnvironment(input: {
  id: string
  projectId: string
  name: string
  slug: string
  status: string
  region: string
  deploymentTarget: string
}) {
  const result = await db.query<EnvironmentRecord>(
    `INSERT INTO environments (id, project_id, name, slug, status, region, deployment_target)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, project_id, name, slug, status, region, deployment_target, created_at, updated_at`,
    [input.id, input.projectId, input.name, input.slug, input.status, input.region, input.deploymentTarget]
  )
  return result.rows[0]
}

export async function updateEnvironment(
  environmentId: string,
  projectId: string,
  updates: { status?: string; region?: string; deploymentTarget?: string }
) {
  const fields: string[] = []
  const values: string[] = []
  if (updates.status !== undefined) {
    fields.push(`status = $${fields.length + 1}`)
    values.push(updates.status)
  }
  if (updates.region !== undefined) {
    fields.push(`region = $${fields.length + 1}`)
    values.push(updates.region)
  }
  if (updates.deploymentTarget !== undefined) {
    fields.push(`deployment_target = $${fields.length + 1}`)
    values.push(updates.deploymentTarget)
  }

  fields.push('updated_at = now()')

  const result = await db.query<EnvironmentRecord>(
    `UPDATE environments
      SET ${fields.join(', ')}
      WHERE id = $${fields.length + 1} AND project_id = $${fields.length + 2}
      RETURNING id, project_id, name, slug, status, region, deployment_target, created_at, updated_at`,
    [...values, environmentId, projectId]
  )
  return result.rows[0] || null
}

export async function findUserRoleForProject(projectId: string, userId: string) {
  const result = await db.query<{ role: 'owner' | 'admin' | 'member' }>(
    `SELECT m.role
      FROM projects p
      INNER JOIN organization_members m ON m.organization_id = p.organization_id
      WHERE p.id = $1 AND m.user_id = $2 AND m.status = 'active'
      LIMIT 1`,
    [projectId, userId]
  )
  return result.rows[0]?.role || null
}
