import { createHash, randomUUID } from 'node:crypto'
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
import { createCloudUsageEvent, findUsageEventByIdempotencyKey } from '../repositories/cloud-usage-repo'
import { createBillingPurchase, fulfillBillingEvent, setBillingPurchaseCheckout } from '../repositories/billing-purchases-repo'
import { HttpError } from '../http'
import {
  isLemonSqueezyConfigured,
  createLemonSqueezyCheckout,
  parseLemonSqueezyWebhook,
  type LemonWebhookEvent,
} from './payments/lemon-squeezy-provider'
import { getCreditPack, listCreditPacks } from './payments/credit-packs'

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
  const { db } = await import('../db.js')
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
  credits?: number
}): Promise<ChargeResult> {
  let requiredCredits: number
  if (input.credits !== undefined && input.credits > 0) {
    requiredCredits = input.credits
  } else {
    const pricing = getPricingForAction(input.product, input.action)
    if (pricing === null) {
      throw new HttpError(422, 'UNKNOWN_PRICING', `No pricing defined for ${input.product}:${input.action}.`)
    }
    requiredCredits = pricing
  }

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

export async function createPurchaseCheckout(input: {
  projectId: string
  packId: string
}) {
  if (!isLemonSqueezyConfigured()) throw new HttpError(500, 'LEMONSQUEEZY_NOT_CONFIGURED', 'Lemon Squeezy fixed-pack checkout is not configured.')
  const pack = getCreditPack(input.packId)
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!
  const purchase = await createBillingPurchase({
    id: makeId('bp'), project_id: input.projectId, provider: 'lemonsqueezy', pack_id: pack.id,
    variant_id: pack.variantId, store_id: storeId, credits: pack.credits, amount_cents: pack.amountCents,
  })
  const checkout = await createLemonSqueezyCheckout({ purchaseId: purchase.id, variantId: pack.variantId })
  await setBillingPurchaseCheckout(purchase.id, checkout.checkoutId)
  return { purchase: { id: purchase.id, packId: pack.id, credits: pack.credits, status: purchase.status }, checkoutUrl: checkout.checkoutUrl }
}

export async function fulfillLemonSqueezyEvent(event: LemonWebhookEvent) {
  const name = event.meta?.event_name || ''
  const attrs = event.data?.attributes || {}
  const custom = event.meta?.custom_data || {}
  const relationship = event.data as unknown as { relationships?: { store?: { data?: { id?: string } }; variant?: { data?: { id?: string } } } }
  const storeId = typeof attrs.store_id === 'number' || typeof attrs.store_id === 'string' ? String(attrs.store_id) : relationship.relationships?.store?.data?.id || null
  const variantId = typeof attrs.variant_id === 'number' || typeof attrs.variant_id === 'string' ? String(attrs.variant_id) : relationship.relationships?.variant?.data?.id || null
  const orderId = event.data?.id || (typeof attrs.identifier === 'number' || typeof attrs.identifier === 'string' ? String(attrs.identifier) : null)
  const refundAmount = typeof attrs.refund_amount === 'number' ? attrs.refund_amount : typeof attrs.refunded_amount === 'number' ? attrs.refunded_amount : null
  const status = typeof attrs.status === 'string' ? attrs.status.toLowerCase() : ''
  // An order resource ID is shared across its paid and refund lifecycle events.
  // Hashing the signed event payload retains replay idempotency without collapsing them.
  const providerEventId = createHash('sha256').update(JSON.stringify(event)).digest('hex')
  return fulfillBillingEvent({ providerEventId, eventName: name, purchaseId: custom.purchase_id || null, payload: event as unknown as Record<string, unknown>, storeId, variantId, orderId, refundAmountCents: refundAmount, paid: name === 'order_paid' || status === 'paid' })
}

export { parseLemonSqueezyWebhook, isLemonSqueezyConfigured, listCreditPacks }

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
