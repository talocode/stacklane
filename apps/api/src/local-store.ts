import {
  createApiKeyRecord,
  createAssetRecord as createStoredAssetRecord,
  createCustomer,
  deleteAssetRecord,
  getAsset,
  getCustomer,
  listApiKeys as listStoredApiKeys,
  listAssets,
  listCustomers,
  listUsageEvents,
  recordUsageEvent,
  revokeApiKey,
  saveLocalFile,
  summarizeUsage,
  summarizeUsageByAction,
  summarizeUsageByCustomer,
  summarizeUsageByProduct,
  touchApiKeyLastUsed,
  updateCustomer,
  verifyStoredApiKey,
} from '@stacklane/storage'

export {
  createCustomer,
  getCustomer,
  listCustomers,
  listUsageEvents,
  recordUsageEvent,
  revokeApiKey,
  summarizeUsage,
  summarizeUsageByAction,
  summarizeUsageByCustomer,
  summarizeUsageByProduct,
  updateCustomer,
  getAsset,
  listAssets,
  deleteAssetRecord,
}

export function createApiKey(input: Parameters<typeof createApiKeyRecord>[0]) {
  return createApiKeyRecord(input)
}

export function authenticateApiKey(rawKey: string) {
  const apiKey = verifyStoredApiKey(rawKey)
  if (apiKey) touchApiKeyLastUsed(apiKey.id)
  return apiKey
}

export function listApiKeys(customerId?: string) {
  return listStoredApiKeys(customerId ? { customerId } : undefined)
}

export function getConfigStatus() {
  return {
    databaseUrl: process.env.DATABASE_URL ? 'present' : 'missing',
    storageRoot: process.env.STACKLANE_STORAGE_ROOT ? 'present' : 'default',
    maxFileSizeBytes: process.env.STACKLANE_MAX_FILE_SIZE_BYTES ? 'present' : 'default',
  }
}

export function createAssetRecord(input: {
  customerId?: string
  product: string
  filename: string
  contentType: string
  publicUrl?: string
  metadata?: Record<string, unknown>
  bytesBase64?: string
}) {
  let storagePath = `${input.product}/${input.filename}`
  let checksum: string | undefined
  let sizeBytes = 0

  if (input.bytesBase64) {
    const buffer = Buffer.from(input.bytesBase64, 'base64')
    sizeBytes = buffer.byteLength
    const stored = saveLocalFile({
      product: input.product,
      filename: input.filename,
      buffer,
      contentType: input.contentType,
    })
    storagePath = stored.storagePath
    checksum = stored.checksum
  }

  return createStoredAssetRecord({
    customerId: input.customerId,
    product: input.product,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes,
    storagePath,
    publicUrl: input.publicUrl,
    checksum,
    metadata: input.metadata,
  })
}
