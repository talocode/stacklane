"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUserResponse = toUserResponse;
exports.toMembershipResponse = toMembershipResponse;
exports.toOrganizationResponse = toOrganizationResponse;
exports.toRegionResponse = toRegionResponse;
exports.toProjectResponse = toProjectResponse;
exports.toEnvironmentResponse = toEnvironmentResponse;
exports.toApiKeyResponse = toApiKeyResponse;
exports.toProvisioningTaskResponse = toProvisioningTaskResponse;
exports.toProvisioningAttemptResponse = toProvisioningAttemptResponse;
exports.toRuntimeBindingResponse = toRuntimeBindingResponse;
exports.toAuditResponse = toAuditResponse;
function toUserResponse(record) {
    return {
        id: record.id,
        email: record.email,
        name: record.name,
        status: record.status,
        lastLoginAt: record.last_login_at,
        createdAt: record.created_at,
        updatedAt: record.updated_at
    };
}
function toMembershipResponse(record) {
    return {
        id: record.id,
        organizationId: record.organization_id,
        userId: record.user_id,
        role: record.role,
        status: record.status
    };
}
function toOrganizationResponse(record) {
    return {
        id: record.id,
        name: record.name,
        slug: record.slug,
        status: record.status,
        createdAt: record.created_at,
        updatedAt: record.updated_at
    };
}
function toRegionResponse(record) {
    return {
        id: record.id,
        code: record.code,
        name: record.name,
        marketScope: record.market_scope,
        deploymentTarget: record.deployment_target,
        isActive: record.is_active,
        metadata: record.metadata,
        createdAt: record.created_at,
        updatedAt: record.updated_at
    };
}
function toProjectResponse(record, organization) {
    return {
        id: record.id,
        name: record.name,
        slug: record.slug,
        status: record.status,
        region: record.region,
        description: record.description,
        organizationId: record.organization_id,
        organization,
        createdAt: record.created_at,
        updatedAt: record.updated_at
    };
}
function toEnvironmentResponse(record) {
    return {
        id: record.id,
        projectId: record.project_id,
        name: record.name,
        slug: record.slug,
        status: record.status,
        region: record.region,
        deploymentTarget: record.deployment_target,
        createdAt: record.created_at,
        updatedAt: record.updated_at
    };
}
function toApiKeyResponse(record) {
    return {
        id: record.id,
        projectId: record.project_id,
        organizationId: record.organization_id,
        name: record.name,
        prefix: record.key_prefix,
        status: record.status,
        revokedAt: record.revoked_at,
        lastUsedAt: record.last_used_at,
        createdAt: record.created_at,
        updatedAt: record.updated_at
    };
}
function toProvisioningTaskResponse(record, region) {
    return {
        id: record.id,
        projectId: record.project_id,
        environmentId: record.environment_id,
        region,
        status: record.status,
        source: record.source,
        requestedByUserId: record.requested_by_user_id,
        currentAttempt: record.current_attempt,
        maxAttempts: record.max_attempts,
        lastError: record.last_error,
        diagnostics: record.diagnostics,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        startedAt: record.started_at,
        completedAt: record.completed_at,
        nextRunAt: record.next_run_at,
        claimedBy: record.claimed_by,
        claimedAt: record.claimed_at,
        claimExpiresAt: record.claim_expires_at,
        lastHeartbeatAt: record.last_heartbeat_at,
        lastTransitionAt: record.last_transition_at
    };
}
function toProvisioningAttemptResponse(record) {
    return {
        id: record.id,
        taskId: record.task_id,
        attemptNo: record.attempt_no,
        status: record.status,
        adapter: record.runtime_adapter,
        step: record.step,
        errorMessage: record.error_message,
        diagnostics: record.diagnostics,
        createdAt: record.created_at,
        startedAt: record.started_at,
        completedAt: record.completed_at,
        nextRunAt: record.next_run_at,
        claimedBy: record.claimed_by,
        claimedAt: record.claimed_at,
        claimExpiresAt: record.claim_expires_at,
        lastHeartbeatAt: record.last_heartbeat_at,
        lastTransitionAt: record.last_transition_at
    };
}
function toRuntimeBindingResponse(record) {
    return {
        id: record.id,
        projectId: record.project_id,
        regionId: record.region_id,
        databaseRef: record.database_ref,
        storageRef: record.storage_ref,
        authNamespaceRef: record.auth_namespace_ref,
        functionsNamespaceRef: record.functions_namespace_ref,
        status: record.status,
        diagnostics: record.diagnostics,
        createdAt: record.created_at,
        updatedAt: record.updated_at
    };
}
function toAuditResponse(record) {
    return {
        id: record.id,
        organizationId: record.organization_id,
        projectId: record.project_id,
        actorUserId: record.actor_user_id,
        action: record.action,
        targetType: record.target_type,
        targetId: record.target_id,
        metadata: record.metadata,
        createdAt: record.created_at
    };
}
//# sourceMappingURL=formatters.js.map