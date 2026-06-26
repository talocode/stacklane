import type { SessionRecord } from '../types';
export declare function createSession(input: {
    id: string;
    userId: string;
    sessionHash: string;
    expiresAt: string;
}): Promise<void>;
export declare function findSessionByHash(sessionHash: string): Promise<SessionRecord>;
export declare function touchSession(sessionId: string): Promise<void>;
export declare function revokeSessionByHash(sessionHash: string): Promise<void>;
