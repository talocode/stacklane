export type ProvisioningStatus = 'queued' | 'running' | 'retrying' | 'ready' | 'failed';
export declare function canTransition(from: ProvisioningStatus, to: ProvisioningStatus): boolean;
export declare function calculateRetryDelayMs(attemptNo: number): number;
export declare function nextRetryAt(attemptNo: number): string;
