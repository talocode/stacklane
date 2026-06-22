export interface ApiCustomer {
  id: string;
  projectId: string;
  name: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  projectId: string;
  customerId: string;
  keyPrefix: string;
  keyHash: string;
  name: string;
  scopes: string[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export function generateCustomerApiKey(customerId: string, name: string): { rawKey: string; record: Omit<ApiKeyRecord, 'id'> } {
  const crypto = require('crypto');
  const prefix = 'sk_lane_customer_';
  const rawKey = prefix + crypto.randomBytes(48).toString('base64url');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 16) + '...';

  return {
    rawKey,
    record: {
      projectId: '',
      customerId,
      keyPrefix,
      keyHash,
      name,
      scopes: ['*'],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    },
  };
}

export function hashApiKey(key: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function verifyApiKey(rawKey: string, hashedKey: string): boolean {
  const crypto = require('crypto');
  const computed = crypto.createHash('sha256').update(rawKey).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedKey));
}
