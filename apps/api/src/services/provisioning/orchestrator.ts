import { makeId } from '../../utils'
import {
  findProjectById,
  findProjectByIdOrSlugForUser,
  updateProject
} from '../../repositories/project-repo'
import { findRegionByCode, findRegionById } from '../../repositories/region-repo'
import {
  claimRunnableTasks,
  completeProvisioningAttempt,
  createProvisioningAttempt,
  createProvisioningTask,
  findLatestProvisioningTask,
  heartbeatTask,
  listProvisioningAttempts,
  markTaskFailedOrRetrying,
  markTaskReady,
  markTaskRetryRequested,
  markTaskRunning,
  upsertRuntimeBinding
} from '../../repositories/provisioning-repo'
import { recordAuditEvent } from '../../repositories/audit-repo'
import type { UserRecord } from '../../types'
import type { ProvisioningAdapter } from './adapter'

export async function requestProjectProvisioning(input: {
  projectRef: string
  user: UserRecord
  regionCode?: string
}) {
  const project = await findProjectByIdOrSlugForUser(input.projectRef, input.user.id)
  if (!project) return null

  const latest = await findLatestProvisioningTask(project.id)
  if (latest && ['queued', 'running', 'retrying', 'requested'].includes(latest.status)) {
    return { project, task: latest }
  }

  const region = input.regionCode ? await findRegionByCode(input.regionCode) : await findRegionByCode(project.region)
  if (!region) throw new Error('Region not found')

  const task = await createProvisioningTask({
    id: makeId('ptask'),
    projectId: project.id,
    regionId: region.id,
    source: 'user_request',
    requestedByUserId: input.user.id,
    status: 'queued',
    maxAttempts: 3
  })

  await updateProject(project.id, { status: 'provisioning' })

  await recordAuditEvent({
    id: makeId('evt'),
    action: 'provisioning.requested',
    targetType: 'provisioning_task',
    targetId: task.id,
    organizationId: project.organization_id,
    projectId: project.id,
    actorUserId: input.user.id,
    metadata: { region: region.code }
  })

  return { project, task }
}

export async function retryLatestProvisioning(projectRef: string, user: UserRecord) {
  const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
  if (!project) return null

  const latest = await findLatestProvisioningTask(project.id)
  if (!latest) return { project, task: null }
  if (latest.status !== 'failed') return { project, task: latest }

  const task = await markTaskRetryRequested(latest.id, user.id)
  if (!task) return { project, task: latest }

  await recordAuditEvent({
    id: makeId('evt'),
    action: 'provisioning.retried',
    targetType: 'provisioning_task',
    targetId: latest.id,
    organizationId: project.organization_id,
    projectId: project.id,
    actorUserId: user.id,
    metadata: { previousAttempts: latest.current_attempt }
  })

  return { project, task }
}

export async function getProjectProvisioningSnapshot(projectId: string) {
  const task = await findLatestProvisioningTask(projectId)
  if (!task) return null
  const attempts = await listProvisioningAttempts(task.id)
  const region = task.region_id ? await findRegionById(task.region_id) : null
  return { task, attempts, region }
}

export async function runProvisioningWorkerTick(adapter: ProvisioningAdapter, workerId: string) {
  const runnable = await claimRunnableTasks(workerId, 5)

  for (const task of runnable) {
    const attemptNo = task.current_attempt + 1
    const runningTask = await markTaskRunning(task.id, attemptNo, workerId)
    if (!runningTask) continue

    const attempt = await createProvisioningAttempt({
      id: makeId('pattempt'),
      taskId: task.id,
      attemptNo,
      adapter: adapter.name
    })

    const region = task.region_id ? await findRegionById(task.region_id) : null
    const project = await findProjectById(task.project_id)
    if (!project) continue

    await heartbeatTask(task.id, workerId)

    await recordAuditEvent({
      id: makeId('evt'),
      action: 'provisioning.started',
      targetType: 'provisioning_task',
      targetId: task.id,
      organizationId: project.organization_id,
      projectId: project.id,
      actorUserId: task.requested_by_user_id || undefined,
      metadata: { attempt: attemptNo, workerId }
    })

    try {
      const result = await adapter.provisionProject({
        projectId: project.id,
        projectSlug: project.slug,
        regionCode: region?.code || project.region
      })

      await completeProvisioningAttempt({
        attemptId: attempt.id,
        status: 'succeeded',
        step: 'complete',
        diagnostics: result.diagnostics
      })

      await markTaskReady(task.id, { ...result.diagnostics, workerId })
      await updateProject(project.id, { status: 'ready' })
      await upsertRuntimeBinding({
        id: makeId('bind'),
        projectId: project.id,
        regionId: task.region_id || null,
        databaseRef: result.databaseRef,
        storageRef: result.storageRef,
        authNamespaceRef: result.authNamespaceRef,
        functionsNamespaceRef: result.functionsNamespaceRef,
        status: 'ready',
        diagnostics: result.diagnostics
      })

      await recordAuditEvent({
        id: makeId('evt'),
        action: 'provisioning.succeeded',
        targetType: 'provisioning_task',
        targetId: task.id,
        organizationId: project.organization_id,
        projectId: project.id,
        metadata: result.diagnostics
      })
    } catch (error) {
      const message = (error as Error).message || 'Unknown provisioning failure'

      await completeProvisioningAttempt({
        attemptId: attempt.id,
        status: 'failed',
        step: 'adapter',
        errorMessage: message,
        diagnostics: { message }
      })

      const updatedTask = await markTaskFailedOrRetrying({
        taskId: task.id,
        attemptNo,
        maxAttempts: task.max_attempts,
        errorMessage: message,
        diagnostics: { message, workerId }
      })

      if (updatedTask?.status === 'failed') {
        await updateProject(project.id, { status: 'error' })
      }

      await recordAuditEvent({
        id: makeId('evt'),
        action: updatedTask?.status === 'failed' ? 'provisioning.failed' : 'provisioning.retrying',
        targetType: 'provisioning_task',
        targetId: task.id,
        organizationId: project.organization_id,
        projectId: project.id,
        metadata: {
          error: message,
          attempt: attemptNo,
          status: updatedTask?.status || 'failed',
          nextRunAt: updatedTask?.next_run_at || null
        }
      })
    }
  }
}
