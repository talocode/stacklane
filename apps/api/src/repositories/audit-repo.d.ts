import type { AuditEventRecord } from '../types';
export declare function recordAuditEvent(input: {
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    organizationId?: string;
    projectId?: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
}): Promise<void>;
export declare function listProjectEvents(projectId: string): Promise<AuditEventRecord[]>;
export declare function listOrganizationEvents(organizationId: string): Promise<AuditEventRecord[]>;
