import { createApiKeyRecord, createCustomer, deleteAssetRecord, getAsset, getCustomer, listAssets, listCustomers, listUsageEvents, recordUsageEvent, revokeApiKey, summarizeUsage, summarizeUsageByAction, summarizeUsageByCustomer, summarizeUsageByProduct, updateCustomer } from '@stacklane/storage';
export { createCustomer, getCustomer, listCustomers, listUsageEvents, recordUsageEvent, revokeApiKey, summarizeUsage, summarizeUsageByAction, summarizeUsageByCustomer, summarizeUsageByProduct, updateCustomer, getAsset, listAssets, deleteAssetRecord, };
export declare function createApiKey(input: Parameters<typeof createApiKeyRecord>[0]): {
    rawKey: string;
    apiKey: import("@stacklane/core").ApiKeyRecord;
};
export declare function authenticateApiKey(rawKey: string): import("@stacklane/core").ApiKeyRecord | null;
export declare function listApiKeys(customerId?: string): import("@stacklane/core").ApiKeyRecord[];
export declare function getConfigStatus(): {
    databaseUrl: string;
    storageRoot: string;
    maxFileSizeBytes: string;
};
export declare function createAssetRecord(input: {
    customerId?: string;
    product: string;
    filename: string;
    contentType: string;
    publicUrl?: string;
    metadata?: Record<string, unknown>;
    bytesBase64?: string;
}): import("@stacklane/core").StacklaneStoredAsset;
