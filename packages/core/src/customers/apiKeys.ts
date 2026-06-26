import * as crypto from 'node:crypto'

import type { StacklaneApiCustomer, StacklaneApiKey } from '../domain'

export function generateApiKey(mode: 'dev' | 'live' = 'dev') {
  return `sk_lane_${mode}_${crypto.randomBytes(32).toString('base64url')}`
}

export function generateCustomerApiKey(customerId: string, name: string, mode: 'dev' | 'live' = 'dev', scopes: string[] = ['*']): { rawKey: string; record: Omit<StacklaneApiKey, 'id'> } {
  const rawKey = generateApiKey(mode)
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 20) + '...'
  const now = new Date().toISOString()

  return {
    rawKey,
    record: {
      customerId,
      name,
      keyPrefix,
      keyHash,
      status: 'active',
      scopes,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function verifyApiKey(rawKey: string, hashedKey: string): boolean {
  const computed = crypto.createHash('sha256').update(rawKey).digest('hex');
  if (computed.length !== hashedKey.length) return false
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedKey));
}
