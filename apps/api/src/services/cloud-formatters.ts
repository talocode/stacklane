import type {
  CloudProjectRecord,
  CloudApiKeyRecord,
  CloudWalletRecord,
  CloudWalletTransactionRecord,
  CloudUsageEventRecord,
  CloudTopupRecord
} from '@stacklane/types'

export function toCloudProjectResponse(record: CloudProjectRecord) {
  return {
    id: record.id,
    ownerId: record.owner_id,
    name: record.name,
    slug: record.slug,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  }
}

export function toCloudApiKeyResponse(record: CloudApiKeyRecord) {
  return {
    id: record.id,
    projectId: record.project_id,
    name: record.name,
    prefix: record.key_prefix,
    mode: record.mode,
    status: record.status,
    lastUsedAt: record.last_used_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  }
}

export function toCloudWalletResponse(record: CloudWalletRecord) {
  return {
    id: record.id,
    projectId: record.project_id,
    balanceCredits: record.balance_credits,
    freeCreditsGranted: record.free_credits_granted,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  }
}

export function toCloudWalletTransactionResponse(record: CloudWalletTransactionRecord) {
  return {
    id: record.id,
    walletId: record.wallet_id,
    type: record.type,
    creditsDelta: record.credits_delta,
    balanceAfter: record.balance_after,
    reference: record.reference,
    metadata: record.metadata,
    createdAt: record.created_at
  }
}

export function toCloudUsageEventResponse(record: CloudUsageEventRecord) {
  return {
    id: record.id,
    projectId: record.project_id,
    apiKeyId: record.api_key_id,
    product: record.product,
    action: record.action,
    credits: record.credits,
    status: record.status,
    requestId: record.request_id,
    idempotencyKey: record.idempotency_key,
    createdAt: record.created_at
  }
}

export function toCloudTopupResponse(record: CloudTopupRecord) {
  return {
    id: record.id,
    projectId: record.project_id,
    provider: record.provider,
    providerReference: record.provider_reference,
    amountUsd: record.amount_usd,
    credits: record.credits,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  }
}
