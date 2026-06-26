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
