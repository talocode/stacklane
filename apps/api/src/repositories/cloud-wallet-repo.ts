import { db } from '../db'
import type { CloudWalletRecord, CloudWalletTransactionRecord } from '@stacklane/types'

export async function findWalletByProjectId(projectId: string) {
  const result = await db.query<CloudWalletRecord>(
    `SELECT id, project_id, balance_credits, free_credits_granted, created_at, updated_at
     FROM cloud_wallets
     WHERE project_id = $1
     LIMIT 1`,
    [projectId]
  )
  return result.rows[0] || null
}

export async function createWallet(input: {
  id: string
  projectId: string
  freeCreditsGranted: boolean
}) {
  const result = await db.query<CloudWalletRecord>(
    `INSERT INTO cloud_wallets (id, project_id, balance_credits, free_credits_granted)
     VALUES ($1, $2, $3, $4)
     RETURNING id, project_id, balance_credits, free_credits_granted, created_at, updated_at`,
    [input.id, input.projectId, input.freeCreditsGranted ? 100 : 0, input.freeCreditsGranted]
  )
  return result.rows[0]
}

export async function deductCredits(walletId: string, amount: number) {
  const result = await db.query<CloudWalletRecord>(
    `UPDATE cloud_wallets
     SET balance_credits = balance_credits - $1, updated_at = now()
     WHERE id = $2 AND balance_credits >= $1
     RETURNING id, project_id, balance_credits, free_credits_granted, created_at, updated_at`,
    [amount, walletId]
  )
  return result.rows[0] || null
}

export async function addCredits(walletId: string, amount: number) {
  const result = await db.query<CloudWalletRecord>(
    `UPDATE cloud_wallets
     SET balance_credits = balance_credits + $1, updated_at = now()
     WHERE id = $2
     RETURNING id, project_id, balance_credits, free_credits_granted, created_at, updated_at`,
    [amount, walletId]
  )
  return result.rows[0]
}

export async function createWalletTransaction(input: {
  id: string
  walletId: string
  type: CloudWalletTransactionRecord['type']
  creditsDelta: number
  balanceAfter: number
  reference?: string
  metadata?: Record<string, unknown>
}) {
  const result = await db.query<CloudWalletTransactionRecord>(
    `INSERT INTO cloud_wallet_transactions (id, wallet_id, type, credits_delta, balance_after, reference, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, wallet_id, type, credits_delta, balance_after, reference, metadata, created_at`,
    [
      input.id,
      input.walletId,
      input.type,
      input.creditsDelta,
      input.balanceAfter,
      input.reference || null,
      input.metadata ? JSON.stringify(input.metadata) : '{}'
    ]
  )
  return result.rows[0]
}

export async function listWalletTransactions(walletId: string, limit = 50) {
  const result = await db.query<CloudWalletTransactionRecord>(
    `SELECT id, wallet_id, type, credits_delta, balance_after, reference, metadata, created_at
     FROM cloud_wallet_transactions
     WHERE wallet_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [walletId, limit]
  )
  return result.rows
}
