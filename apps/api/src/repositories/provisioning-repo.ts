import { db } from '../db'
import { canTransition, nextRetryAt, type ProvisioningStatus } from '../services/provisioning/state-machine'
import type {
  ProjectRuntimeBindingRecord,
  ProvisioningAttemptRecord,
  ProvisioningTaskRecord
} from '../types'

const CLAIM_TTL_SECONDS = 30

export async function createProvisioningTask(input: {
  id: string
  projectId: string
  regionId: string | null
  source: string
  requestedByUserId?: string
  status: 'requested' | 'queued' | 'retrying'
  maxAttempts?: number
}) {
  const result = await db.query<ProvisioningTaskRecord>(
    `INSERT INTO provisioning_tasks (id, project_id, region_id, status, source, requested_by_user_id, max_attempts, next_run_at)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 3), now())
      RETURNING *`,
    [input.id, input.projectId, input.regionId, input.status, input.source, input.requestedByUserId || null, input.maxAttempts || 3]
  )
  return result.rows[0]
}

export async function findLatestProvisioningTask(projectId: string) {
  const result = await db.query<ProvisioningTaskRecord>(
    `SELECT * FROM provisioning_tasks WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  )
  return result.rows[0] || null
}

export async function listProvisioningTasks(projectId: string) {
  const result = await db.query<ProvisioningTaskRecord>(
    `SELECT * FROM provisioning_tasks WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [projectId]
  )
  return result.rows
}

export async function listProvisioningAttempts(taskId: string) {
  const result = await db.query<ProvisioningAttemptRecord>(
    `SELECT * FROM provisioning_attempts WHERE task_id = $1 ORDER BY attempt_no DESC`,
    [taskId]
  )
  return result.rows
}

export async function claimRunnableTasks(workerId: string, limit = 10) {
  const result = await db.query<ProvisioningTaskRecord>(
    `UPDATE provisioning_tasks t
      SET claimed_by = $1,
          claimed_at = now(),
          claim_expires_at = now() + ($2 * interval '1 second'),
          last_heartbeat_at = now(),
          updated_at = now()
      WHERE t.id IN (
        SELECT id
        FROM provisioning_tasks
        WHERE status IN ('queued', 'retrying')
          AND next_run_at <= now()
          AND (claim_expires_at IS NULL OR claim_expires_at < now())
        ORDER BY next_run_at ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *`,
    [workerId, CLAIM_TTL_SECONDS, limit]
  )

  return result.rows
}

export async function heartbeatTask(taskId: string, workerId: string) {
  await db.query(
    `UPDATE provisioning_tasks
      SET last_heartbeat_at = now(), claim_expires_at = now() + ($3 * interval '1 second')
      WHERE id = $1 AND claimed_by = $2`,
    [taskId, workerId, CLAIM_TTL_SECONDS]
  )
}

export async function markTaskRunning(taskId: string, attemptNo: number, workerId: string) {
  const current = await db.query<ProvisioningTaskRecord>('SELECT * FROM provisioning_tasks WHERE id = $1 LIMIT 1', [taskId])
  const existing = current.rows[0]
  if (!existing) return null
  if (!canTransition(existing.status as ProvisioningStatus, 'running')) return null

  const result = await db.query<ProvisioningTaskRecord>(
    `UPDATE provisioning_tasks
      SET status = 'running', current_attempt = $2, started_at = COALESCE(started_at, now()), updated_at = now(), last_transition_at = now()
      WHERE id = $1 AND claimed_by = $3
      RETURNING *`,
    [taskId, attemptNo, workerId]
  )
  return result.rows[0] || null
}

export async function createProvisioningAttempt(input: {
  id: string
  taskId: string
  attemptNo: number
  adapter: string
}) {
  const result = await db.query<ProvisioningAttemptRecord>(
    `INSERT INTO provisioning_attempts (id, task_id, attempt_no, status, runtime_adapter, started_at)
      VALUES ($1, $2, $3, 'running', $4, now())
      RETURNING *`,
    [input.id, input.taskId, input.attemptNo, input.adapter]
  )
  return result.rows[0]
}

export async function completeProvisioningAttempt(input: {
  attemptId: string
  status: 'succeeded' | 'failed'
  step?: string
  errorMessage?: string
  diagnostics?: Record<string, unknown>
}) {
  await db.query(
    `UPDATE provisioning_attempts
      SET status = $2, step = $3, error_message = $4, diagnostics = $5::jsonb, completed_at = now()
      WHERE id = $1`,
    [
      input.attemptId,
      input.status,
      input.step || null,
      input.errorMessage || null,
      JSON.stringify(input.diagnostics || {})
    ]
  )
}

export async function markTaskReady(taskId: string, diagnostics?: Record<string, unknown>) {
  const result = await db.query<ProvisioningTaskRecord>(
    `UPDATE provisioning_tasks
      SET status = 'ready', completed_at = now(), updated_at = now(), diagnostics = $2::jsonb,
          last_error = null, claimed_by = null, claimed_at = null, claim_expires_at = null, last_transition_at = now()
      WHERE id = $1
      RETURNING *`,
    [taskId, JSON.stringify(diagnostics || {})]
  )
  return result.rows[0] || null
}

export async function markTaskFailedOrRetrying(input: {
  taskId: string
  attemptNo: number
  maxAttempts: number
  errorMessage: string
  diagnostics?: Record<string, unknown>
}) {
  const status = input.attemptNo >= input.maxAttempts ? 'failed' : 'retrying'
  const nextRunAt = status === 'retrying' ? nextRetryAt(input.attemptNo) : new Date().toISOString()

  const result = await db.query<ProvisioningTaskRecord>(
    `UPDATE provisioning_tasks
      SET status = $2,
          last_error = $3,
          diagnostics = $4::jsonb,
          next_run_at = $5::timestamptz,
          completed_at = CASE WHEN $2 = 'failed' THEN now() ELSE completed_at END,
          claimed_by = null,
          claimed_at = null,
          claim_expires_at = null,
          updated_at = now(),
          last_transition_at = now()
      WHERE id = $1
      RETURNING *`,
    [input.taskId, status, input.errorMessage, JSON.stringify(input.diagnostics || {}), nextRunAt]
  )
  return result.rows[0] || null
}

export async function markTaskRetryRequested(taskId: string, requestedByUserId: string) {
  const current = await db.query<ProvisioningTaskRecord>('SELECT * FROM provisioning_tasks WHERE id = $1 LIMIT 1', [taskId])
  const existing = current.rows[0]
  if (!existing) return null
  if (!canTransition(existing.status as ProvisioningStatus, 'retrying')) return null

  const result = await db.query<ProvisioningTaskRecord>(
    `UPDATE provisioning_tasks
      SET status = 'retrying', requested_by_user_id = $2, completed_at = null, next_run_at = now(),
          claimed_by = null, claimed_at = null, claim_expires_at = null,
          updated_at = now(), last_transition_at = now()
      WHERE id = $1
      RETURNING *`,
    [taskId, requestedByUserId]
  )
  return result.rows[0] || null
}

export async function upsertRuntimeBinding(input: {
  id: string
  projectId: string
  regionId: string | null
  databaseRef: string
  storageRef: string
  authNamespaceRef: string
  functionsNamespaceRef: string
  status: string
  diagnostics?: Record<string, unknown>
}) {
  const result = await db.query<ProjectRuntimeBindingRecord>(
    `INSERT INTO project_runtime_bindings (
      id, project_id, region_id, database_ref, storage_ref, auth_namespace_ref, functions_namespace_ref, status, diagnostics
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
    ON CONFLICT (project_id)
    DO UPDATE SET
      region_id = EXCLUDED.region_id,
      database_ref = EXCLUDED.database_ref,
      storage_ref = EXCLUDED.storage_ref,
      auth_namespace_ref = EXCLUDED.auth_namespace_ref,
      functions_namespace_ref = EXCLUDED.functions_namespace_ref,
      status = EXCLUDED.status,
      diagnostics = EXCLUDED.diagnostics,
      updated_at = now()
    RETURNING *`,
    [
      input.id,
      input.projectId,
      input.regionId,
      input.databaseRef,
      input.storageRef,
      input.authNamespaceRef,
      input.functionsNamespaceRef,
      input.status,
      JSON.stringify(input.diagnostics || {})
    ]
  )
  return result.rows[0]
}

export async function findRuntimeBindingByProject(projectId: string) {
  const result = await db.query<ProjectRuntimeBindingRecord>(
    `SELECT * FROM project_runtime_bindings WHERE project_id = $1 LIMIT 1`,
    [projectId]
  )
  return result.rows[0] || null
}
