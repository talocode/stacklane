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
    totalEvents: number;
    totalUnits: number;
    groupedTotals: Record<string, number>;
    dateRangeUsed: {
        from?: string;
        to?: string;
    };
};
export declare function createUsageEvent(params: {
    customerId?: string;
    apiKeyId?: string;
    product: string;
    action: string;
    units?: number;
    metadata?: Record<string, unknown>;
}): Omit<StacklaneUsageEvent, 'id' | 'createdAt'>;
export declare function summarizeUsageEvents(events: StacklaneUsageEvent[], keySelector: (event: StacklaneUsageEvent) => string, range?: {
    from?: string;
    to?: string;
}): UsageSummary;
