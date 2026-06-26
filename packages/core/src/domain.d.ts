export type StacklaneApiCustomer = {
    id: string;
    name: string;
    email?: string;
    externalRef?: string;
    status: 'active' | 'suspended' | 'deleted';
    createdAt: string;
    updatedAt: string;
};
export type StacklaneApiKey = {
    id: string;
    customerId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    status: 'active' | 'revoked';
    scopes: string[];
    createdAt: string;
    updatedAt: string;
    lastUsedAt?: string;
};
export type StacklaneUsageEvent = {
    id: string;
    customerId?: string;
    apiKeyId?: string;
    product: string;
    action: string;
    units: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
};
export type StacklaneStoredAsset = {
    id: string;
    customerId?: string;
    product: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    storagePath: string;
    publicUrl?: string;
    checksum?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
};
export type StacklaneUsageSummary = {
    totalEvents: number;
    totalUnits: number;
    groupedTotals: Record<string, number>;
    from?: string;
    to?: string;
};
