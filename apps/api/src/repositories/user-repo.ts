import { db } from '../db'
import type { UserRecord } from '../types'

export async function findUserByEmail(email: string) {
  const result = await db.query<UserRecord>(
    `SELECT id, email, name, status, password_hash, last_login_at, created_at, updated_at
     FROM users WHERE email = $1 LIMIT 1`,
    [email]
  )
  return result.rows[0] || null
}

export async function findUserById(id: string) {
  const result = await db.query<UserRecord>(
    `SELECT id, email, name, status, password_hash, last_login_at, created_at, updated_at
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  )
  return result.rows[0] || null
}

export async function touchUserLogin(id: string) {
  await db.query('UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1', [id])
}
