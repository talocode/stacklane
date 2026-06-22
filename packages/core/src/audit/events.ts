export interface AuditEvent {
  id: string;
  projectId: string;
  action: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type AuditAction =
  | 'project.created'
  | 'project.updated'
  | 'database.connected'
  | 'database.updated'
  | 'token.created'
  | 'token.verified'
  | 'token.revoked'
  | 'backup.created'
  | 'env.generated';

export function createAuditEvent(params: {
  projectId: string;
  action: AuditAction;
  actor: string;
  metadata?: Record<string, unknown>;
}): Omit<AuditEvent, 'id'> {
  return {
    projectId: params.projectId,
    action: params.action,
    actor: params.actor,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString(),
  };
}
