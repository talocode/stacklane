import type { ApiKeyRecord } from '../types';
export declare function listProjectApiKeys(projectId: string): Promise<ApiKeyRecord[]>;
export declare function createApiKey(input: {
    id: string;
    projectId: string;
    organizationId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
}): Promise<ApiKeyRecord>;
export declare function findProjectApiKey(projectId: string, keyId: string): Promise<ApiKeyRecord>;
export declare function revokeApiKey(keyId: string, projectId: string): Promise<ApiKeyRecord>;
