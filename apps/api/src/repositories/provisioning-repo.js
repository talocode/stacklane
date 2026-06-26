"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProvisioningTask = createProvisioningTask;
exports.findLatestProvisioningTask = findLatestProvisioningTask;
exports.listProvisioningTasks = listProvisioningTasks;
exports.listProvisioningAttempts = listProvisioningAttempts;
exports.claimRunnableTasks = claimRunnableTasks;
exports.heartbeatTask = heartbeatTask;
exports.markTaskRunning = markTaskRunning;
exports.createProvisioningAttempt = createProvisioningAttempt;
exports.completeProvisioningAttempt = completeProvisioningAttempt;
exports.markTaskReady = markTaskReady;
exports.markTaskFailedOrRetrying = markTaskFailedOrRetrying;
exports.markTaskRetryRequested = markTaskRetryRequested;
exports.upsertRuntimeBinding = upsertRuntimeBinding;
exports.findRuntimeBindingByProject = findRuntimeBindingByProject;
const db_1 = require("../db");
const state_machine_1 = require("../services/provisioning/state-machine");
const CLAIM_TTL_SECONDS = 30;
async function createProvisioningTask(input) {
    const result = await db_1.db.query(`INSERT INTO provisioning_tasks (id, project_id, region_id, status, source, requested_by_user_id, max_attempts, next_run_at)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 3), now())
      RETURNING *`, [input.id, input.projectId, input.regionId, input.status, input.source, input.requestedByUserId || null, input.maxAttempts || 3]);
    return result.rows[0];
}
async function findLatestProvisioningTask(projectId) {
    const result = await db_1.db.query(`SELECT * FROM provisioning_tasks WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [projectId]);
    return result.rows[0] || null;
}
async function listProvisioningTasks(projectId) {
    const result = await db_1.db.query(`SELECT * FROM provisioning_tasks WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50`, [projectId]);
    return result.rows;
}
async function listProvisioningAttempts(taskId) {
    const result = await db_1.db.query(`SELECT * FROM provisioning_attempts WHERE task_id = $1 ORDER BY attempt_no DESC`, [taskId]);
    return result.rows;
}
async function claimRunnableTasks(workerId, limit = 10) {
    const result = await db_1.db.query(`UPDATE provisioning_tasks t
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
      RETURNING *`, [workerId, CLAIM_TTL_SECONDS, limit]);
    return result.rows;
}
async function heartbeatTask(taskId, workerId) {
    await db_1.db.query(`UPDATE provisioning_tasks
      SET last_heartbeat_at = now(), claim_expires_at = now() + ($3 * interval '1 second')
      WHERE id = $1 AND claimed_by = $2`, [taskId, workerId, CLAIM_TTL_SECONDS]);
}
async function markTaskRunning(taskId, attemptNo, workerId) {
    const current = await db_1.db.query('SELECT * FROM provisioning_tasks WHERE id = $1 LIMIT 1', [taskId]);
    const existing = current.rows[0];
    if (!existing)
        return null;
    if (!(0, state_machine_1.canTransition)(existing.status, 'running'))
        return null;
    const result = await db_1.db.query(`UPDATE provisioning_tasks
      SET status = 'running', current_attempt = $2, started_at = COALESCE(started_at, now()), updated_at = now(), last_transition_at = now()
      WHERE id = $1 AND claimed_by = $3
      RETURNING *`, [taskId, attemptNo, workerId]);
    return result.rows[0] || null;
}
async function createProvisioningAttempt(input) {
    const result = await db_1.db.query(`INSERT INTO provisioning_attempts (id, task_id, attempt_no, status, runtime_adapter, started_at)
      VALUES ($1, $2, $3, 'running', $4, now())
      RETURNING *`, [input.id, input.taskId, input.attemptNo, input.adapter]);
    return result.rows[0];
}
async function completeProvisioningAttempt(input) {
    await db_1.db.query(`UPDATE provisioning_attempts
      SET status = $2, step = $3, error_message = $4, diagnostics = $5::jsonb, completed_at = now()
      WHERE id = $1`, [
        input.attemptId,
        input.status,
        input.step || null,
        input.errorMessage || null,
        JSON.stringify(input.diagnostics || {})
    ]);
}
async function markTaskReady(taskId, diagnostics) {
    const result = await db_1.db.query(`UPDATE provisioning_tasks
      SET status = 'ready', completed_at = now(), updated_at = now(), diagnostics = $2::jsonb,
          last_error = null, claimed_by = null, claimed_at = null, claim_expires_at = null, last_transition_at = now()
      WHERE id = $1
      RETURNING *`, [taskId, JSON.stringify(diagnostics || {})]);
    return result.rows[0] || null;
}
async function markTaskFailedOrRetrying(input) {
    const status = input.attemptNo >= input.maxAttempts ? 'failed' : 'retrying';
    const nextRunAt = status === 'retrying' ? (0, state_machine_1.nextRetryAt)(input.attemptNo) : new Date().toISOString();
    const result = await db_1.db.query(`UPDATE provisioning_tasks
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
      RETURNING *`, [input.taskId, status, input.errorMessage, JSON.stringify(input.diagnostics || {}), nextRunAt]);
    return result.rows[0] || null;
}
async function markTaskRetryRequested(taskId, requestedByUserId) {
    const current = await db_1.db.query('SELECT * FROM provisioning_tasks WHERE id = $1 LIMIT 1', [taskId]);
    const existing = current.rows[0];
    if (!existing)
        return null;
    if (!(0, state_machine_1.canTransition)(existing.status, 'retrying'))
        return null;
    const result = await db_1.db.query(`UPDATE provisioning_tasks
      SET status = 'retrying', requested_by_user_id = $2, completed_at = null, next_run_at = now(),
          claimed_by = null, claimed_at = null, claim_expires_at = null,
          updated_at = now(), last_transition_at = now()
      WHERE id = $1
      RETURNING *`, [taskId, requestedByUserId]);
    return result.rows[0] || null;
}
async function upsertRuntimeBinding(input) {
    const result = await db_1.db.query(`INSERT INTO project_runtime_bindings (
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
    RETURNING *`, [
        input.id,
        input.projectId,
        input.regionId,
        input.databaseRef,
        input.storageRef,
        input.authNamespaceRef,
        input.functionsNamespaceRef,
        input.status,
        JSON.stringify(input.diagnostics || {})
    ]);
    return result.rows[0];
}
async function findRuntimeBindingByProject(projectId) {
    const result = await db_1.db.query(`SELECT * FROM project_runtime_bindings WHERE project_id = $1 LIMIT 1`, [projectId]);
    return result.rows[0] || null;
}
//# sourceMappingURL=provisioning-repo.js.map