import type { IncomingMessage, ServerResponse } from 'node:http';
export declare class HttpError extends Error {
    statusCode: number;
    code: string;
    details?: Record<string, unknown>;
    constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>);
}
export declare function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void;
export declare function sendData(res: ServerResponse, statusCode: number, data: unknown): void;
export declare function sendError(res: ServerResponse, error: HttpError): void;
export declare function parseBody(req: IncomingMessage): Promise<Record<string, unknown>>;
export declare function parseCookies(req: IncomingMessage): Record<string, string>;
export declare function setSessionCookie(res: ServerResponse, token: string): void;
export declare function clearSessionCookie(res: ServerResponse): void;
