export interface UsageEvent {
  id: string;
  projectId: string;
  customerId?: string;
  apiKeyId?: string;
  eventType: string;
  units: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type UsageEventType =
  | 'asset.generate'
  | 'screenshot.upload'
  | 'api.request'
  | 'storage.write'
  | 'storage.read';

export function createUsageEvent(params: {
  projectId: string;
  customerId?: string;
  apiKeyId?: string;
  eventType: UsageEventType;
  units?: number;
  metadata?: Record<string, unknown>;
}): Omit<UsageEvent, 'id'> {
  return {
    projectId: params.projectId,
    customerId: params.customerId,
    apiKeyId: params.apiKeyId,
    eventType: params.eventType,
    units: params.units ?? 1,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString(),
  };
}
