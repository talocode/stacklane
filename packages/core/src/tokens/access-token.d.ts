type HeaderCarrier = {
    headers: {
        get(name: string): string | null;
    };
};
export interface AccessTokenRecord {
    id: string;
    projectId: string;
    tokenPrefix: string;
    tokenHash: string;
    name: string;
    scopes: string[];
    status: 'active' | 'revoked';
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
}
export declare function generateAccessToken(projectId: string, name: string, isDev?: boolean): {
    rawToken: string;
    record: Omit<AccessTokenRecord, 'id'>;
};
export declare function hashToken(token: string): string;
export declare function verifyToken(rawToken: string, hashedToken: string): boolean;
export declare function extractTokenFromHeader(request: HeaderCarrier): string | null;
export {};
