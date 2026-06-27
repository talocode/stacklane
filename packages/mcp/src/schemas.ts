import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  externalRef: z.string().max(200).optional(),
})

export const listCustomersSchema = z.object({}).optional()

export const getCustomerSchema = z.object({
  customerId: z.string().min(1),
})

export const updateCustomerSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  externalRef: z.string().max(200).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
}).refine((value) => Object.keys(value).some((k) => k !== 'customerId'), {
  message: 'At least one updatable field must be provided',
})

export const createApiKeySchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1).max(120),
  scopes: z.array(z.string()).optional(),
  mode: z.enum(['dev', 'live']).optional(),
})

export const listApiKeysSchema = z.object({
  customerId: z.string().min(1).optional(),
}).optional()

export const revokeApiKeySchema = z.object({
  apiKeyId: z.string().min(1),
})

export const verifyApiKeySchema = z.object({
  key: z.string().min(1),
})

export const recordUsageEventSchema = z.object({
  product: z.string().min(1).max(120),
  action: z.string().min(1).max(120),
  units: z.number().positive(),
  customerId: z.string().min(1).optional(),
  apiKeyId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const listUsageEventsSchema = z.object({
  customerId: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
}).optional()

export const summarizeUsageSchema = z.object({
  customerId: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
}).optional()

export const createAssetSchema = z.object({
  product: z.string().min(1).max(120),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(200),
  sizeBytes: z.number().int().nonnegative(),
  storagePath: z.string().min(1).max(512),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const listAssetsSchema = z.object({
  customerId: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
}).optional()

export const getAssetSchema = z.object({
  assetId: z.string().min(1),
})

export const deleteAssetSchema = z.object({
  assetId: z.string().min(1),
})

export const healthSchema = z.object({}).optional()
export const configStatusSchema = z.object({}).optional()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
export type RecordUsageEventInput = z.infer<typeof recordUsageEventSchema>
export type CreateAssetInput = z.infer<typeof createAssetSchema>
