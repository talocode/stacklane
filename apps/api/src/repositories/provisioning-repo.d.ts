import type { ProjectRuntimeBindingRecord, ProvisioningAttemptRecord, ProvisioningTaskRecord } from '../types';
export declare function createProvisioningTask(input: {
    id: string;
    projectId: string;
    regionId: string | null;
    source: string;
    requestedByUserId?: string;
    status: 'requested' | 'queued' | 'retrying';
    maxAttempts?: number;
}): Promise<ProvisioningTaskRecord>;
export declare function findLatestProvisioningTask(projectId: string): Promise<ProvisioningTaskRecord>;
export declare function listProvisioningTasks(projectId: string): Promise<ProvisioningTaskRecord[]>;
export declare function listProvisioningAttempts(taskId: string): Promise<ProvisioningAttemptRecord[]>;
export declare function claimRunnableTasks(workerId: string, limit?: number): Promise<ProvisioningTaskRecord[]>;
export declare function heartbeatTask(taskId: string, workerId: string): Promise<void>;
export declare function markTaskRunning(taskId: string, attemptNo: number, workerId: string): Promise<ProvisioningTaskRecord | null>;
export declare function createProvisioningAttempt(input: {
    id: string;
    taskId: string;
    attemptNo: number;
    adapter: string;
}): Promise<ProvisioningAttemptRecord>;
export declare function completeProvisioningAttempt(input: {
    attemptId: string;
    status: 'succeeded' | 'failed';
    step?: string;
    errorMessage?: string;
    diagnostics?: Record<string, unknown>;
}): Promise<void>;
export declare function markTaskReady(taskId: string, diagnostics?: Record<string, unknown>): Promise<ProvisioningTaskRecord>;
export declare function markTaskFailedOrRetrying(input: {
    taskId: string;
    attemptNo: number;
    maxAttempts: number;
    errorMessage: string;
    diagnostics?: Record<string, unknown>;
}): Promise<ProvisioningTaskRecord>;
export declare function markTaskRetryRequested(taskId: string, requestedByUserId: string): Promise<ProvisioningTaskRecord | null>;
export declare function upsertRuntimeBinding(input: {
    id: string;
    projectId: string;
    regionId: string | null;
    databaseRef: string;
    storageRef: string;
    authNamespaceRef: string;
    functionsNamespaceRef: string;
    status: string;
    diagnostics?: Record<string, unknown>;
}): Promise<ProjectRuntimeBindingRecord>;
export declare function findRuntimeBindingByProject(projectId: string): Promise<ProjectRuntimeBindingRecord>;
