"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestProjectProvisioning = requestProjectProvisioning;
exports.retryLatestProvisioning = retryLatestProvisioning;
exports.getProjectProvisioningSnapshot = getProjectProvisioningSnapshot;
exports.runProvisioningWorkerTick = runProvisioningWorkerTick;
const utils_1 = require("../../utils");
const project_repo_1 = require("../../repositories/project-repo");
const region_repo_1 = require("../../repositories/region-repo");
const provisioning_repo_1 = require("../../repositories/provisioning-repo");
const audit_repo_1 = require("../../repositories/audit-repo");
async function requestProjectProvisioning(input) {
    const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(input.projectRef, input.user.id);
    if (!project)
        return null;
    const latest = await (0, provisioning_repo_1.findLatestProvisioningTask)(project.id);
    if (latest && ['queued', 'running', 'retrying', 'requested'].includes(latest.status)) {
        return { project, task: latest };
    }
    const region = input.regionCode ? await (0, region_repo_1.findRegionByCode)(input.regionCode) : await (0, region_repo_1.findRegionByCode)(project.region);
    if (!region)
        throw new Error('Region not found');
    const task = await (0, provisioning_repo_1.createProvisioningTask)({
        id: (0, utils_1.makeId)('ptask'),
        projectId: project.id,
        regionId: region.id,
        source: 'user_request',
        requestedByUserId: input.user.id,
        status: 'queued',
        maxAttempts: 3
    });
    await (0, project_repo_1.updateProject)(project.id, { status: 'provisioning' });
    await (0, audit_repo_1.recordAuditEvent)({
        id: (0, utils_1.makeId)('evt'),
        action: 'provisioning.requested',
        targetType: 'provisioning_task',
        targetId: task.id,
        organizationId: project.organization_id,
        projectId: project.id,
        actorUserId: input.user.id,
        metadata: { region: region.code }
    });
    return { project, task };
}
async function retryLatestProvisioning(projectRef, user) {
    const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
    if (!project)
        return null;
    const latest = await (0, provisioning_repo_1.findLatestProvisioningTask)(project.id);
    if (!latest)
        return { project, task: null };
    if (latest.status !== 'failed')
        return { project, task: latest };
    const task = await (0, provisioning_repo_1.markTaskRetryRequested)(latest.id, user.id);
    if (!task)
        return { project, task: latest };
    await (0, audit_repo_1.recordAuditEvent)({
        id: (0, utils_1.makeId)('evt'),
        action: 'provisioning.retried',
        targetType: 'provisioning_task',
        targetId: latest.id,
        organizationId: project.organization_id,
        projectId: project.id,
        actorUserId: user.id,
        metadata: { previousAttempts: latest.current_attempt }
    });
    return { project, task };
}
async function getProjectProvisioningSnapshot(projectId) {
    const task = await (0, provisioning_repo_1.findLatestProvisioningTask)(projectId);
    if (!task)
        return null;
    const attempts = await (0, provisioning_repo_1.listProvisioningAttempts)(task.id);
    const region = task.region_id ? await (0, region_repo_1.findRegionById)(task.region_id) : null;
    return { task, attempts, region };
}
async function runProvisioningWorkerTick(adapter, workerId) {
    const runnable = await (0, provisioning_repo_1.claimRunnableTasks)(workerId, 5);
    for (const task of runnable) {
        const attemptNo = task.current_attempt + 1;
        const runningTask = await (0, provisioning_repo_1.markTaskRunning)(task.id, attemptNo, workerId);
        if (!runningTask)
            continue;
        const attempt = await (0, provisioning_repo_1.createProvisioningAttempt)({
            id: (0, utils_1.makeId)('pattempt'),
            taskId: task.id,
            attemptNo,
            adapter: adapter.name
        });
        const region = task.region_id ? await (0, region_repo_1.findRegionById)(task.region_id) : null;
        const project = await (0, project_repo_1.findProjectById)(task.project_id);
        if (!project)
            continue;
        await (0, provisioning_repo_1.heartbeatTask)(task.id, workerId);
        await (0, audit_repo_1.recordAuditEvent)({
            id: (0, utils_1.makeId)('evt'),
            action: 'provisioning.started',
            targetType: 'provisioning_task',
            targetId: task.id,
            organizationId: project.organization_id,
            projectId: project.id,
            actorUserId: task.requested_by_user_id || undefined,
            metadata: { attempt: attemptNo, workerId }
        });
        try {
            const result = await adapter.provisionProject({
                projectId: project.id,
                projectSlug: project.slug,
                regionCode: region?.code || project.region
            });
            await (0, provisioning_repo_1.completeProvisioningAttempt)({
                attemptId: attempt.id,
                status: 'succeeded',
                step: 'complete',
                diagnostics: result.diagnostics
            });
            await (0, provisioning_repo_1.markTaskReady)(task.id, { ...result.diagnostics, workerId });
            await (0, project_repo_1.updateProject)(project.id, { status: 'ready' });
            await (0, provisioning_repo_1.upsertRuntimeBinding)({
                id: (0, utils_1.makeId)('bind'),
                projectId: project.id,
                regionId: task.region_id || null,
                databaseRef: result.databaseRef,
                storageRef: result.storageRef,
                authNamespaceRef: result.authNamespaceRef,
                functionsNamespaceRef: result.functionsNamespaceRef,
                status: 'ready',
                diagnostics: result.diagnostics
            });
            await (0, audit_repo_1.recordAuditEvent)({
                id: (0, utils_1.makeId)('evt'),
                action: 'provisioning.succeeded',
                targetType: 'provisioning_task',
                targetId: task.id,
                organizationId: project.organization_id,
                projectId: project.id,
                metadata: result.diagnostics
            });
        }
        catch (error) {
            const message = error.message || 'Unknown provisioning failure';
            await (0, provisioning_repo_1.completeProvisioningAttempt)({
                attemptId: attempt.id,
                status: 'failed',
                step: 'adapter',
                errorMessage: message,
                diagnostics: { message }
            });
            const updatedTask = await (0, provisioning_repo_1.markTaskFailedOrRetrying)({
                taskId: task.id,
                attemptNo,
                maxAttempts: task.max_attempts,
                errorMessage: message,
                diagnostics: { message, workerId }
            });
            if (updatedTask?.status === 'failed') {
                await (0, project_repo_1.updateProject)(project.id, { status: 'error' });
            }
            await (0, audit_repo_1.recordAuditEvent)({
                id: (0, utils_1.makeId)('evt'),
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
            });
        }
    }
}
//# sourceMappingURL=orchestrator.js.map