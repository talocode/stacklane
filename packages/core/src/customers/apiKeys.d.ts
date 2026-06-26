import type { StacklaneApiKey } from '../domain';
export declare function generateApiKey(mode?: 'dev' | 'live'): string;
export declare function generateCustomerApiKey(customerId: string, name: string, mode?: 'dev' | 'live', scopes?: string[]): {
    rawKey: string;
    record: Omit<StacklaneApiKey, 'id'>;
};
export declare function hashApiKey(key: string): string;
export declare function verifyApiKey(rawKey: string, hashedKey: string): boolean;
