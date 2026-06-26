import { type StacklaneApiCustomer, type StacklaneApiKey, type StacklaneStoredAsset, type StacklaneUsageEvent } from '@stacklane/core';
export declare const localStoragePaths: {
    root: string;
    files: string;
    customers: string;
    apiKeys: string;
    usageEvents: string;
    assets: string;
};
export declare function validateMimeType(mimeType: string): boolean;
export declare function sanitizeFilenameForStorage(name: string): string;
export declare function generateStorageKey(product: string, filename: string): string;
export declare function saveLocalFile(input: {
    product: string;
    filename: string;
    buffer: Buffer;
    contentType: string;
}): {
    filename: string;
    storagePath: string;
    absolutePath: string;
    checksum: string;
};
export declare function readLocalFile(storagePath: string): Buffer | null;
export declare function deleteLocalFile(storagePath: string): boolean;
export declare function createCustomer(input: {
    name: string;
    email?: string;
    externalRef?: string;
    status?: StacklaneApiCustomer['status'];
}): StacklaneApiCustomer;
export declare function listCustomers(): StacklaneApiCustomer[];
export declare function getCustomer(id: string): StacklaneApiCustomer | undefined;
export declare function updateCustomer(id: string, patch: Partial<Omit<StacklaneApiCustomer, 'id' | 'createdAt'>>): {
    updatedAt: string;
    name: string;
    email?: string;
    status: "active" | "suspended" | "deleted";
    externalRef?: string;
    id: string;
    createdAt: string;
} | null;
export declare function createApiKeyRecord(input: {
    customerId: string;
    name: string;
    scopes?: string[];
    mode?: 'dev' | 'live';
}): {
    rawKey: string;
    apiKey: StacklaneApiKey;
};
export declare function listApiKeys(filters?: {
    customerId?: string;
}): StacklaneApiKey[];
export declare function revokeApiKey(id: string): {
    status: "revoked";
    updatedAt: string;
    id: string;
    customerId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    scopes: string[];
    createdAt: string;
    lastUsedAt?: string;
} | null;
export declare function verifyStoredApiKey(rawKey: string): StacklaneApiKey | null;
export declare function touchApiKeyLastUsed(id: string): {
    lastUsedAt: string;
    updatedAt: string;
    id: string;
    customerId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    status: "active" | "revoked";
    scopes: string[];
    createdAt: string;
} | null;
export declare function recordUsageEvent(input: Omit<StacklaneUsageEvent, 'id' | 'createdAt'>): StacklaneUsageEvent;
export declare function listUsageEvents(filters?: {
    customerId?: string;
    product?: string;
    action?: string;
    from?: string;
    to?: string;
}): StacklaneUsageEvent[];
export declare function summarizeUsage(filters?: {
    customerId?: string;
    product?: string;
    action?: string;
    from?: string;
    to?: string;
}): import("../../core/src/usage").UsageSummary;
export declare function summarizeUsageByCustomer(filters?: {
    from?: string;
    to?: string;
}): import("../../core/src/usage").UsageSummary;
export declare function summarizeUsageByProduct(filters?: {
    from?: string;
    to?: string;
}): import("../../core/src/usage").UsageSummary;
export declare function summarizeUsageByAction(filters?: {
    from?: string;
    to?: string;
}): import("../../core/src/usage").UsageSummary;
export declare function createAssetRecord(input: Omit<StacklaneStoredAsset, 'id' | 'createdAt' | 'updatedAt'>): StacklaneStoredAsset;
export declare function listAssets(filters?: {
    customerId?: string;
    product?: string;
}): StacklaneStoredAsset[];
export declare function getAsset(id: string): StacklaneStoredAsset | undefined;
export declare function deleteAssetRecord(id: string): StacklaneStoredAsset | null;
