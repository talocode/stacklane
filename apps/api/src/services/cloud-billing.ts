import { randomUUID } from 'node:crypto'
import { TALOCODE_CLOUD_PRICING, getPricingForAction, listAllPricing } from '@stacklane/config'
import { makeId, hashValue } from '../utils'
import { findCloudProjectById, findCloudProjectBySlug } from '../repositories/cloud-project-repo'
import { findCloudApiKeyByHash, touchCloudApiKey } from '../repositories/cloud-api-key-repo'
import {
  findWalletByProjectId,
  createWallet,
  deductCredits,
  addCredits,
  createWalletTransaction,
  listWalletTransactions
} from '../repositories/cloud-wallet-repo'
import {
  createCloudUsageEvent,
  findUsageEventByIdempotencyKey
} from '../repositories/cloud-usage-repo'
import { HttpError } from '../http'

export interface ChargeResult {
  success: boolean
  event: {
    id: string
    projectId: string
    product: string
    action: string
    credits: number
    status: string
    idempotencyKey: string | null
    createdAt: string
  }
  remainingCredits?: number
}

export async function authenticateTalocodeApiKey(rawKey: string) {
  const keyHash = hashValue(rawKey)
  const apiKey = await findCloudApiKeyByHash(keyHash)
  if (!apiKey || apiKey.status !== 'active') {
    throw new HttpError(401, 'INVALID_API_KEY', 'Invalid or revoked Talocode API key.')
  }
  await touchCloudApiKey(apiKey.id)
  return apiKey
}

export async function ensureWallet(projectId: string) {
  let wallet = await findWalletByProjectId(projectId)
  if (!wallet) {
    wallet = await createWallet({
      id: makeId('cwal'),
      projectId,
      freeCreditsGranted: false
    })
  }
  return wallet
}

export async function grantFreeCredits(projectId: string) {
  let wallet = await findWalletByProjectId(projectId)
  if (!wallet) {
    wallet = await createWallet({
      id: makeId('cwal'),
      projectId,
      freeCreditsGranted: true
    })
    await createWalletTransaction({
      id: makeId('ctxn'),
      walletId: wallet.id,
      type: 'grant',
      creditsDelta: TALOCODE_CLOUD_PRICING.freeStartingCredits,
      balanceAfter: TALOCODE_CLOUD_PRICING.freeStartingCredits,
      reference: 'free_credits_grant',
      metadata: { reason: 'new_project_free_credits' }
    })
  } else if (!wallet.free_credits_granted) {
    wallet = await addCredits(wallet.id, TALOCODE_CLOUD_PRICING.freeStartingCredits)
    await createWalletTransaction({
      id: makeId('ctxn'),
      walletId: wallet.id,
      type: 'grant',
      creditsDelta: TALOCODE_CLOUD_PRICING.freeStartingCredits,
      balanceAfter: wallet.balance_credits,
      reference: 'free_credits_grant',
      metadata: { reason: 'new_project_free_credits' }
    })
    await dbUpdateFreeCreditsFlag(wallet.id)
  }
  return wallet
}

async function dbUpdateFreeCreditsFlag(walletId: string) {
  const { db } = await import('../db')
  await db.query(
    `UPDATE cloud_wallets SET free_credits_granted = TRUE WHERE id = $1`,
    [walletId]
  )
}

export async function chargeCredits(input: {
  projectId: string
  apiKeyId?: string
  product: string
  action: string
  requestId?: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}): Promise<ChargeResult> {
  const pricing = getPricingForAction(input.product, input.action)
  if (pricing === null) {
    throw new HttpError(422, 'UNKNOWN_PRICING', `No pricing defined for ${input.product}:${input.action}.`)
  }

  const requiredCredits = pricing

  if (input.idempotencyKey) {
    const existing = await findUsageEventByIdempotencyKey(input.idempotencyKey)
    if (existing) {
      return {
        success: existing.status === 'success',
        event: {
          id: existing.id,
          projectId: existing.project_id,
          product: existing.product,
          action: existing.action,
          credits: existing.credits,
          status: existing.status,
          idempotencyKey: existing.idempotency_key,
          createdAt: existing.created_at
        }
      }
    }
  }

  const wallet = await ensureWallet(input.projectId)

  if (wallet.balance_credits < requiredCredits) {
    const rejectedEvent = await createCloudUsageEvent({
      id: makeId('cevt'),
      projectId: input.projectId,
      apiKeyId: input.apiKeyId,
      product: input.product,
      action: input.action,
      credits: requiredCredits,
      status: 'rejected',
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      metadata: { ...input.metadata, reason: 'insufficient_credits', available: wallet.balance_credits, required: requiredCredits }
    })

    return {
      success: false,
      event: {
        id: rejectedEvent.id,
        projectId: rejectedEvent.project_id,
        product: rejectedEvent.product,
        action: rejectedEvent.action,
        credits: rejectedEvent.credits,
        status: rejectedEvent.status,
        idempotencyKey: rejectedEvent.idempotency_key,
        createdAt: rejectedEvent.created_at
      },
      remainingCredits: wallet.balance_credits
    }
  }

  const updatedWallet = await deductCredits(wallet.id, requiredCredits)
  if (!updatedWallet) {
    throw new HttpError(409, 'CONCURRENT_CHARGE', 'Concurrent balance deduction conflict. Retry.')
  }

  await createWalletTransaction({
    id: makeId('ctxn'),
    walletId: wallet.id,
    type: 'usage',
    creditsDelta: -requiredCredits,
    balanceAfter: updatedWallet.balance_credits,
    reference: input.requestId,
    metadata: { product: input.product, action: input.action }
  })

  const event = await createCloudUsageEvent({
    id: makeId('cevt'),
    projectId: input.projectId,
    apiKeyId: input.apiKeyId,
    product: input.product,
    action: input.action,
    credits: requiredCredits,
    status: 'success',
    requestId: input.requestId,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata
  })

  return {
    success: true,
    event: {
      id: event.id,
      projectId: event.project_id,
      product: event.product,
      action: event.action,
      credits: event.credits,
      status: event.status,
      idempotencyKey: event.idempotency_key,
      createdAt: event.created_at
    },
    remainingCredits: updatedWallet.balance_credits
  }
}

export async function createTopupIntent(input: {
  projectId: string
  amountUsd: number
  provider?: string
}) {
  const creditsPerDollar = 1 / TALOCODE_CLOUD_PRICING.creditUsdValue
  const credits = Math.floor(input.amountUsd * creditsPerDollar)

  if (credits < TALOCODE_CLOUD_PRICING.minimumTopUpCredits) {
    throw new HttpError(422, 'MINIMUM_TOPUP', `Minimum top-up is $${(TALOCODE_CLOUD_PRICING.minimumTopUpCredits / creditsPerDollar).toFixed(2)} (${TALOCODE_CLOUD_PRICING.minimumTopUpCredits} credits).`)
  }

  const { createCloudTopup } = await import('../repositories/cloud-usage-repo')

  const topup = await createCloudTopup({
    id: makeId('ctup'),
    projectId: input.projectId,
    provider: input.provider || 'manual',
    amountUsd: input.amountUsd,
    credits,
    status: 'pending'
  })

  return {
    topup,
    creditsPerDollar,
    confirmationRequired: true,
    message: `To confirm the top-up, call confirmTopup with the topup ID. In development, use confirmTopup with provider=manual.`
  }
}

export async function confirmTopup(topupId: string, providerRef?: string) {
  const { db } = await import('../db')
  const result = await db.query(
    `UPDATE cloud_topups
     SET status = 'succeeded', provider_reference = COALESCE($1, provider_reference), updated_at = now()
     WHERE id = $2 AND status = 'pending'
     RETURNING id, project_id, provider, provider_reference, amount_usd, credits, status, created_at, updated_at`,
    [providerRef || null, topupId]
  )
  const topup = result.rows[0]
  if (!topup) throw new HttpError(404, 'TOPUP_NOT_FOUND', 'Top-up not found or already confirmed.')

  const wallet = await addCredits(topup.project_id, topup.credits)
  await createWalletTransaction({
    id: makeId('ctxn'),
    walletId: wallet.id,
    type: 'topup',
    creditsDelta: topup.credits,
    balanceAfter: wallet.balance_credits,
    reference: topup.id,
    metadata: { provider: topup.provider, amountUsd: topup.amount_usd }
  })

  return { topup, wallet }
}

export async function checkBalance(projectId: string) {
  const wallet = await ensureWallet(projectId)
  return { balanceCredits: wallet.balance_credits, freeCreditsGranted: wallet.free_credits_granted }
}

export async function getWalletWithTransactions(projectId: string, transactionLimit = 50) {
  const wallet = await ensureWallet(projectId)
  const transactions = await listWalletTransactions(wallet.id, transactionLimit)
  return { wallet, transactions }
}

export { TALOCODE_CLOUD_PRICING, getPricingForAction, listAllPricing }
