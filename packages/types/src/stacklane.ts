import { z } from 'zod'

export const stacklaneApiCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  externalRef: z.string().optional(),
  status: z.enum(['active', 'suspended', 'deleted']),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const stacklaneApiKeySchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  keyHash: z.string(),
  keyPrefix: z.string(),
  status: z.enum(['active', 'revoked']),
  scopes: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedAt: z.string().optional()
})

export const stacklaneUsageEventSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  apiKeyId: z.string().optional(),
  product: z.string(),
  action: z.string(),
  units: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string()
})

export const stacklaneStoredAssetSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  product: z.string(),
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  storagePath: z.string(),
  publicUrl: z.string().optional(),
  checksum: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type StacklaneApiCustomer = z.infer<typeof stacklaneApiCustomerSchema>
export type StacklaneApiKey = z.infer<typeof stacklaneApiKeySchema>
export type StacklaneUsageEvent = z.infer<typeof stacklaneUsageEventSchema>
export type StacklaneStoredAsset = z.infer<typeof stacklaneStoredAssetSchema>

// ─── Talocode Cloud Billing Types ───────────────────────────────────────────

export interface CloudProjectRecord {
  id: string
  owner_id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface CloudApiKeyRecord {
  id: string
  project_id: string
  name: string
  key_prefix: string
  key_hash: string
  mode: 'dev' | 'live'
  status: 'active' | 'revoked'
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface CloudWalletRecord {
  id: string
  project_id: string
  balance_credits: number
  free_credits_granted: boolean
  created_at: string
  updated_at: string
}

export interface CloudWalletTransactionRecord {
  id: string
  wallet_id: string
  type: 'grant' | 'topup' | 'usage' | 'refund' | 'adjustment'
  credits_delta: number
  balance_after: number
  reference: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CloudUsageEventRecord {
  id: string
  project_id: string
  api_key_id: string | null
  product: string
  action: string
  credits: number
  status: 'success' | 'failed' | 'rejected'
  request_id: string | null
  idempotency_key: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CloudTopupRecord {
  id: string
  project_id: string
  provider: string
  provider_reference: string | null
  amount_usd: number
  credits: number
  status: 'pending' | 'succeeded' | 'failed'
  created_at: string
  updated_at: string
}

export interface CloudPricingResponse {
  creditUsdValue: number
  freeStartingCredits: number
  minimumTopUpCredits: number
  products: Record<string, Record<string, number>>
}
