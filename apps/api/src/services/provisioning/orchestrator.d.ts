import type { UserRecord } from '../../types';
import type { ProvisioningAdapter } from './adapter';
export declare function requestProjectProvisioning(input: {
    projectRef: string;
    user: UserRecord;
    regionCode?: string;
}): Promise<{
    project: import("../../types").ProjectRecord;
    task: import("../../types").ProvisioningTaskRecord;
} | null>;
export declare function retryLatestProvisioning(projectRef: string, user: UserRecord): Promise<{
    project: import("../../types").ProjectRecord;
    task: null;
} | {
    project: import("../../types").ProjectRecord;
    task: import("../../types").ProvisioningTaskRecord;
} | null>;
export declare function getProjectProvisioningSnapshot(projectId: string): Promise<{
    task: import("../../types").ProvisioningTaskRecord;
    attempts: import("../../types").ProvisioningAttemptRecord[];
    region: import("../../types").RegionRecord | null;
} | null>;
export declare function runProvisioningWorkerTick(adapter: ProvisioningAdapter, workerId: string): Promise<void>;
