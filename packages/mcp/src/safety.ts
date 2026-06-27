import path from 'node:path'

const SECRET_PATTERN = /sk_lane_(dev|live)_[A-Za-z0-9_-]{8,}/g

export function redactSecrets(input: string): string {
  return input.replace(SECRET_PATTERN, 'sk_lane_$1_REDACTED')
}

export function redactObject(value: unknown): unknown {
  if (typeof value === 'string') return redactSecrets(value)
  if (Array.isArray(value)) return value.map(redactObject)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (/key|secret|token|password/i.test(key) && typeof v === 'string' && v.length > 0) {
        out[key] = redactSecrets(v)
      } else {
        out[key] = redactObject(v)
      }
    }
    return out
  }
  return value
}

export interface SafeFilenameResult {
  ok: boolean
  error?: string
  normalized?: string
}

export function safeFilename(filename: string): SafeFilenameResult {
  if (typeof filename !== 'string' || filename.length === 0) {
    return { ok: false, error: 'filename is required' }
  }
  if (filename.includes('\0')) {
    return { ok: false, error: 'filename must not contain null bytes' }
  }
  if (filename.includes('..')) {
    return { ok: false, error: 'filename must not contain path traversal sequences' }
  }
  if (path.isAbsolute(filename)) {
    return { ok: false, error: 'filename must not be an absolute path' }
  }
  if (filename.includes('/') || filename.includes('\\')) {
    return { ok: false, error: 'filename must not contain path separators' }
  }
  const normalized = filename.replace(/[^A-Za-z0-9._-]/g, '_')
  if (normalized.length === 0) {
    return { ok: false, error: 'filename must contain valid characters' }
  }
  return { ok: true, normalized }
}

export function safeStoragePath(storagePath: string): SafeFilenameResult {
  if (typeof storagePath !== 'string' || storagePath.length === 0) {
    return { ok: false, error: 'storagePath is required' }
  }
  if (storagePath.includes('\0')) {
    return { ok: false, error: 'storagePath must not contain null bytes' }
  }
  if (storagePath.includes('..')) {
    return { ok: false, error: 'storagePath must not contain path traversal sequences' }
  }
  if (path.isAbsolute(storagePath)) {
    return { ok: false, error: 'storagePath must not be an absolute path' }
  }
  return { ok: true, normalized: storagePath }
}
