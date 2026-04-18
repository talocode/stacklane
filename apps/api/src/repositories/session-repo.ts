import { db } from '../db'
import type { SessionRecord } from '../types'

export async function createSession(input: {
  id: string
  userId: string
  sessionHash: string
  expiresAt: string
}) {
  await db.query(
    `INSERT INTO control_plane_sessions (id, user_id, session_hash, expires_at)
      VALUES ($1, $2, $3, $4::timestamptz)`,
    [input.id, input.userId, input.sessionHash, input.expiresAt]
  )
}

export async function findSessionByHash(sessionHash: string) {
  const result = await db.query<SessionRecord>(
    `SELECT id, user_id, session_hash, expires_at, revoked_at, created_at, last_seen_at
     FROM control_plane_sessions
     WHERE session_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()
     LIMIT 1`,
    [sessionHash]
  )
  return result.rows[0] || null
}

export async function touchSession(sessionId: string) {
  await db.query('UPDATE control_plane_sessions SET last_seen_at = now() WHERE id = $1', [sessionId])
}

export async function revokeSessionByHash(sessionHash: string) {
  await db.query('UPDATE control_plane_sessions SET revoked_at = now() WHERE session_hash = $1 AND revoked_at IS NULL', [sessionHash])
}
