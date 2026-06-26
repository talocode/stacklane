export declare function makeId(prefix: string): string;
export declare function safeSlug(value: string): string;
export declare function hashValue(value: string): string;
export declare function hashPassword(password: string): string;
export declare function verifyPassword(password: string, stored: string): boolean;
export declare function createSessionToken(): string;
export declare function createApiSecret(prefix: string): string;
