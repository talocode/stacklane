export interface StacklaneUsageEvent {
  id: string;
  customerId?: string;
  apiKeyId?: string;
  product: string;
  action: string;
  units: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type UsageSummary = {
  totalEvents: number
  totalUnits: number
  groupedTotals: Record<string, number>
  dateRangeUsed: {
    from?: string
    to?: string
  }
}

export function createUsageEvent(params: {
  customerId?: string;
  apiKeyId?: string;
  product: string;
  action: string;
  units?: number;
  metadata?: Record<string, unknown>;
}): Omit<StacklaneUsageEvent, 'id' | 'createdAt'> {
  return {
    customerId: params.customerId,
    apiKeyId: params.apiKeyId,
    product: params.product,
    action: params.action,
    units: params.units ?? 1,
    metadata: params.metadata || {},
  };
}

export function summarizeUsageEvents(
  events: StacklaneUsageEvent[],
  keySelector: (event: StacklaneUsageEvent) => string,
  range?: { from?: string; to?: string }
): UsageSummary {
  const groupedTotals: Record<string, number> = {}
  let totalUnits = 0

  for (const event of events) {
    const key = keySelector(event)
    groupedTotals[key] = (groupedTotals[key] || 0) + event.units
    totalUnits += event.units
  }

  return {
    totalEvents: events.length,
    totalUnits,
    groupedTotals,
    dateRangeUsed: {
      from: range?.from,
      to: range?.to,
    },
  }
}
