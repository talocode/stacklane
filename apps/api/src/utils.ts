import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

export function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, derived] = stored.split(':')
  if (!salt || !derived) return false
  const next = scryptSync(password, salt, 64)
  const existing = Buffer.from(derived, 'hex')
  if (next.length !== existing.length) return false
  return timingSafeEqual(next, existing)
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function createApiSecret(prefix: string) {
  const secretPart = randomBytes(24).toString('base64url')
  return `${prefix}.${secretPart}`
}
