import { z, type ZodType } from 'zod'
import type { StacklaneMcpClient } from './client'
import { safeFilename, safeStoragePath, redactObject } from './safety'
import {
  createCustomerSchema,
  listCustomersSchema,
  getCustomerSchema,
  updateCustomerSchema,
  createApiKeySchema,
  listApiKeysSchema,
  revokeApiKeySchema,
  verifyApiKeySchema,
  recordUsageEventSchema,
  listUsageEventsSchema,
  summarizeUsageSchema,
  createAssetSchema,
  listAssetsSchema,
  getAssetSchema,
  deleteAssetSchema,
} from './schemas'

export interface ToolContext {
  client: StacklaneMcpClient
}

export type ToolHandler = (args: unknown, ctx: ToolContext) => Promise<unknown>

export interface ToolDef {
  name: string
  description: string
  inputSchema: unknown
  handler: ToolHandler
}

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(redactObject(data)) }] }
}

function okRawKey(data: unknown) {
  const safe = stripKeyHashes(data)
  return { content: [{ type: 'text' as const, text: JSON.stringify(safe) }] }
}

function fail(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: message }) }], isError: true }
}

function validate<T>(schema: ZodType<T>, args: unknown): { data: T; error?: string } {
  const result = schema.safeParse(args)
  if (!result.success) {
    return { data: undefined as unknown as T, error: result.error.issues[0]?.message ?? 'Validation error' }
  }
  return { data: result.data }
}

export const healthTool: ToolDef = {
  name: 'stacklane_health',
  description: 'Check Stacklane API health. Returns ok, service, and version. No API key required.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    const res = await ctx.client.get<{ ok: boolean; service: string; version?: string }>('/api/v1/health')
    if (!res.ok) return fail(res.error ?? 'Health check failed')
    return ok(res.data)
  },
}

export const configStatusTool: ToolDef = {
  name: 'stacklane_config_status',
  description: 'Report Stacklane backend config status. Reports present/missing only; never prints API keys or env values.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    const res = await ctx.client.get<{ ok: boolean; config: unknown }>('/api/v1/config/status')
    if (!res.ok) return fail(res.error ?? 'Config status failed')
    return ok(res.data)
  },
}

export const createCustomerTool: ToolDef = {
  name: 'stacklane_create_customer',
  description: 'Create a Stacklane customer. name is required; email and externalRef are optional.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      externalRef: { type: 'string' },
    },
    required: ['name'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(createCustomerSchema, args)
    if (error) return fail(error)
    const res = await ctx.client.post<{ ok: boolean; customer: unknown }>('/api/v1/customers', data)
    if (!res.ok) return fail(res.error ?? 'Create customer failed')
    return ok(res.data)
  },
}

export const listCustomersTool: ToolDef = {
  name: 'stacklane_list_customers',
  description: 'List all Stacklane customers.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    validate(listCustomersSchema, {})
    const res = await ctx.client.get<{ ok: boolean; customers: unknown[] }>('/api/v1/customers')
    if (!res.ok) return fail(res.error ?? 'List customers failed')
    return ok(res.data)
  },
}

export const getCustomerTool: ToolDef = {
  name: 'stacklane_get_customer',
  description: 'Get a single Stacklane customer by id.',
  inputSchema: {
    type: 'object',
    properties: { customerId: { type: 'string' } },
    required: ['customerId'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(getCustomerSchema, args)
    if (error) return fail(error)
    const res = await ctx.client.get<{ ok: boolean; customer: unknown }>(`/api/v1/customers/${encodeURIComponent(data!.customerId)}`)
    if (!res.ok) return fail(res.error ?? 'Get customer failed')
    return ok(res.data)
  },
}

export const updateCustomerTool: ToolDef = {
  name: 'stacklane_update_customer',
  description: 'Update a Stacklane customer. At least one updatable field is required.',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      externalRef: { type: 'string' },
      status: { type: 'string', enum: ['active', 'suspended', 'deleted'] },
    },
    required: ['customerId'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(updateCustomerSchema, args)
    if (error) return fail(error)
    const { customerId, ...patch } = data!
    const res = await ctx.client.patch<{ ok: boolean; customer: unknown }>(`/api/v1/customers/${encodeURIComponent(customerId)}`, patch)
    if (!res.ok) return fail(res.error ?? 'Update customer failed')
    return ok(res.data)
  },
}

export const createApiKeyTool: ToolDef = {
  name: 'stacklane_create_api_key',
  description: 'Create a Stacklane API key. The raw key is returned ONCE here only. Store it securely; it will not be shown again. Key hashes are never returned by other tools.',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: { type: 'string' },
      name: { type: 'string' },
      scopes: { type: 'array', items: { type: 'string' } },
      mode: { type: 'string', enum: ['dev', 'live'] },
    },
    required: ['customerId', 'name'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(createApiKeySchema, args)
    if (error) return fail(error)
    const res = await ctx.client.post<{ ok: boolean; apiKey: unknown; rawKey: string; warning: string }>('/api/v1/api-keys', data)
    if (!res.ok) return fail(res.error ?? 'Create API key failed')
    return okRawKey(res.data)
  },
}

export const listApiKeysTool: ToolDef = {
  name: 'stacklane_list_api_keys',
  description: 'List Stacklane API keys. Returns key metadata only; never returns raw keys or key hashes.',
  inputSchema: {
    type: 'object',
    properties: { customerId: { type: 'string' } },
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(listApiKeysSchema, args)
    if (error) return fail(error)
    const suffix = data?.customerId ? `?customerId=${encodeURIComponent(data.customerId)}` : ''
    const res = await ctx.client.get<{ ok: boolean; apiKeys: unknown[] }>(`/api/v1/api-keys${suffix}`)
    if (!res.ok) return fail(res.error ?? 'List API keys failed')
    const safe = stripKeyHashes(res.data)
    return ok(safe)
  },
}

export const revokeApiKeyTool: ToolDef = {
  name: 'stacklane_revoke_api_key',
  description: 'Revoke a Stacklane API key by id.',
  inputSchema: {
    type: 'object',
    properties: { apiKeyId: { type: 'string' } },
    required: ['apiKeyId'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(revokeApiKeySchema, args)
    if (error) return fail(error)
    const res = await ctx.client.post<{ ok: boolean; apiKey: unknown }>(`/api/v1/api-keys/${encodeURIComponent(data!.apiKeyId)}/revoke`)
    if (!res.ok) return fail(res.error ?? 'Revoke API key failed')
    const safe = stripKeyHashes(res.data)
    return ok(safe)
  },
}

export const verifyApiKeyTool: ToolDef = {
  name: 'stacklane_verify_api_key',
  description: 'Verify a Stacklane API key. Returns valid boolean and key metadata; never returns the raw key or hash.',
  inputSchema: {
    type: 'object',
    properties: { key: { type: 'string' } },
    required: ['key'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(verifyApiKeySchema, args)
    if (error) return fail(error)
    const res = await ctx.client.post<{ ok: boolean; valid: boolean; apiKeyId?: string; customerId?: string; scopes?: string[] }>('/api/v1/api-keys/verify', { key: data!.key })
    if (!res.ok) return fail(res.error ?? 'Verify API key failed')
    return ok(res.data)
  },
}

export const recordUsageEventTool: ToolDef = {
  name: 'stacklane_record_usage_event',
  description: 'Record a Stacklane usage event. product, action, and positive units are required. Requires a configured API key.',
  inputSchema: {
    type: 'object',
    properties: {
      product: { type: 'string' },
      action: { type: 'string' },
      units: { type: 'number' },
      customerId: { type: 'string' },
      apiKeyId: { type: 'string' },
      metadata: { type: 'object' },
    },
    required: ['product', 'action', 'units'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(recordUsageEventSchema, args)
    if (error) return fail(error)
    const res = await ctx.client.post<{ ok: boolean; event: unknown }>('/api/v1/usage/events', data)
    if (!res.ok) return fail(res.error ?? 'Record usage event failed')
    return ok(res.data)
  },
}

export const listUsageEventsTool: ToolDef = {
  name: 'stacklane_list_usage_events',
  description: 'List Stacklane usage events with optional filters. Requires a configured API key.',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: { type: 'string' },
      product: { type: 'string' },
      action: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
    },
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(listUsageEventsSchema, args)
    if (error) return fail(error)
    const suffix = data ? `?${new URLSearchParams(data as Record<string, string>).toString()}` : ''
    const res = await ctx.client.get<{ ok: boolean; events: unknown[] }>(`/api/v1/usage/events${suffix}`)
    if (!res.ok) return fail(res.error ?? 'List usage events failed')
    return ok(res.data)
  },
}

export const summarizeUsageTool: ToolDef = {
  name: 'stacklane_summarize_usage',
  description: 'Summarize Stacklane usage with optional filters. Requires a configured API key.',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: { type: 'string' },
      product: { type: 'string' },
      action: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
    },
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(summarizeUsageSchema, args)
    if (error) return fail(error)
    const suffix = data ? `?${new URLSearchParams(data as Record<string, string>).toString()}` : ''
    const res = await ctx.client.get<{ ok: boolean; summary: unknown; byCustomer: unknown; byProduct: unknown; byAction: unknown }>(`/api/v1/usage/summary${suffix}`)
    if (!res.ok) return fail(res.error ?? 'Summarize usage failed')
    return ok(res.data)
  },
}

export const createAssetTool: ToolDef = {
  name: 'stacklane_create_asset',
  description: 'Create a Stacklane asset metadata record. Rejects unsafe filenames and path traversal. Requires a configured API key.',
  inputSchema: {
    type: 'object',
    properties: {
      product: { type: 'string' },
      filename: { type: 'string' },
      contentType: { type: 'string' },
      sizeBytes: { type: 'number' },
      storagePath: { type: 'string' },
      metadata: { type: 'object' },
    },
    required: ['product', 'filename', 'contentType', 'sizeBytes', 'storagePath'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(createAssetSchema, args)
    if (error) return fail(error)
    const fn = safeFilename(data!.filename)
    if (!fn.ok) return fail(fn.error!)
    const sp = safeStoragePath(data!.storagePath)
    if (!sp.ok) return fail(sp.error!)
    const payload = {
      product: data!.product,
      filename: fn.normalized,
      contentType: data!.contentType,
      publicUrl: undefined,
      metadata: data!.metadata,
    }
    const res = await ctx.client.post<{ ok: boolean; asset: unknown }>('/api/v1/assets', payload)
    if (!res.ok) return fail(res.error ?? 'Create asset failed')
    return ok(res.data)
  },
}

export const listAssetsTool: ToolDef = {
  name: 'stacklane_list_assets',
  description: 'List Stacklane assets with optional filters. Requires a configured API key.',
  inputSchema: {
    type: 'object',
    properties: { customerId: { type: 'string' }, product: { type: 'string' } },
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(listAssetsSchema, args)
    if (error) return fail(error)
    const suffix = data ? `?${new URLSearchParams(data as Record<string, string>).toString()}` : ''
    const res = await ctx.client.get<{ ok: boolean; assets: unknown[] }>(`/api/v1/assets${suffix}`)
    if (!res.ok) return fail(res.error ?? 'List assets failed')
    return ok(res.data)
  },
}

export const getAssetTool: ToolDef = {
  name: 'stacklane_get_asset',
  description: 'Get a single Stacklane asset by id. Requires a configured API key.',
  inputSchema: {
    type: 'object',
    properties: { assetId: { type: 'string' } },
    required: ['assetId'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(getAssetSchema, args)
    if (error) return fail(error)
    const res = await ctx.client.get<{ ok: boolean; asset: unknown }>(`/api/v1/assets/${encodeURIComponent(data!.assetId)}`)
    if (!res.ok) return fail(res.error ?? 'Get asset failed')
    return ok(res.data)
  },
}

export const deleteAssetTool: ToolDef = {
  name: 'stacklane_delete_asset',
  description: 'Delete a Stacklane asset by id. Requires a configured API key.',
  inputSchema: {
    type: 'object',
    properties: { assetId: { type: 'string' } },
    required: ['assetId'],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const { data, error } = validate(deleteAssetSchema, args)
    if (error) return fail(error)
    const res = await ctx.client.delete<{ ok: boolean; asset: unknown }>(`/api/v1/assets/${encodeURIComponent(data!.assetId)}`)
    if (!res.ok) return fail(res.error ?? 'Delete asset failed')
    return ok(res.data)
  },
}

function stripKeyHashes(data: unknown): unknown {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.apiKeys)) {
      return { ...obj, apiKeys: obj.apiKeys.map((k) => omitHashes(k)) }
    }
    if (obj.apiKey && typeof obj.apiKey === 'object') {
      return { ...obj, apiKey: omitHashes(obj.apiKey) }
    }
  }
  return data
}

function omitHashes(record: unknown): unknown {
  if (record && typeof record === 'object') {
    const { keyHash, ...rest } = record as Record<string, unknown>
    return rest
  }
  return record
}

export const ALL_TOOLS: ToolDef[] = [
  healthTool,
  configStatusTool,
  createCustomerTool,
  listCustomersTool,
  getCustomerTool,
  updateCustomerTool,
  createApiKeyTool,
  listApiKeysTool,
  revokeApiKeyTool,
  verifyApiKeyTool,
  recordUsageEventTool,
  listUsageEventsTool,
  summarizeUsageTool,
  createAssetTool,
  listAssetsTool,
  getAssetTool,
  deleteAssetTool,
]

export const TOOL_NAMES = ALL_TOOLS.map((t) => t.name)
