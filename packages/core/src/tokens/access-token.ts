import * as crypto from 'crypto';

const TOKEN_PREFIX = 'sk_lane_';
const DEV_PREFIX = 'sk_lane_dev_';
const TOKEN_LENGTH = 48;

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

export function generateAccessToken(projectId: string, name: string, isDev = false): { rawToken: string; record: Omit<AccessTokenRecord, 'id'> } {
  const randomBytes = crypto.randomBytes(TOKEN_LENGTH);
  const rawToken = (isDev ? DEV_PREFIX : TOKEN_PREFIX) + randomBytes.toString('base64url');
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawToken.slice(0, 12) + '...';

  return {
    rawToken,
    record: {
      projectId,
      tokenPrefix,
      tokenHash,
      name,
      scopes: ['*'],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    },
  };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyToken(rawToken: string, hashedToken: string): boolean {
  const computed = hashToken(rawToken);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedToken));
}

export function extractTokenFromHeader(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const apiKey = request.headers.get('x-api-key') || request.headers.get('x-stacklane-api-key');
  return apiKey || null;
}
