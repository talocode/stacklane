import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { generateCustomerApiKey, summarizeUsageEvents, type StacklaneApiCustomer, type StacklaneApiKey, type StacklaneStoredAsset, type StacklaneUsageEvent } from '@stacklane/core'

const ROOT_DIR = path.resolve(process.cwd(), '.stacklane')
const DEFAULT_FILES_ROOT = '.stacklane/files'
const FILES_DIR = path.join(ROOT_DIR, 'files')
const CUSTOMERS_FILE = path.join(ROOT_DIR, 'customers.json')
const API_KEYS_FILE = path.join(ROOT_DIR, 'api-keys.json')
const USAGE_EVENTS_FILE = path.join(ROOT_DIR, 'usage-events.json')
const ASSETS_FILE = path.join(ROOT_DIR, 'assets.json')
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/json',
  'text/plain',
])

export const localStoragePaths = {
  root: ROOT_DIR,
  files: FILES_DIR,
  customers: CUSTOMERS_FILE,
  apiKeys: API_KEYS_FILE,
  usageEvents: USAGE_EVENTS_FILE,
  assets: ASSETS_FILE,
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function ensureRoot() {
  ensureDir(ROOT_DIR)
  ensureDir(FILES_DIR)
}

function readCollection<T>(filePath: string): T[] {
  ensureRoot()
  if (!fs.existsSync(filePath)) return []
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[]
}

function writeCollection<T>(filePath: string, items: T[]) {
  ensureRoot()
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8')
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
}

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType)
}

export function sanitizeFilenameForStorage(name: string): string {
  const basename = path.basename(name)
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'file'
}

export function generateStorageKey(product: string, filename: string): string {
  return `${product}/${crypto.randomUUID()}-${filename}`
}

function ensureSafeStoragePath(storagePath: string) {
  if (storagePath.includes('..') || path.isAbsolute(storagePath)) {
    throw new Error('Unsafe storage path.')
  }
}

function maxFileSizeBytes() {
  return Number(process.env.STACKLANE_MAX_FILE_SIZE_BYTES || DEFAULT_MAX_FILE_SIZE_BYTES)
}

export function saveLocalFile(input: { product: string; filename: string; buffer: Buffer; contentType: string }) {
  if (!validateMimeType(input.contentType)) {
    throw new Error(`Unsupported content type: ${input.contentType}`)
  }
  if (input.buffer.byteLength > maxFileSizeBytes()) {
    throw new Error(`File exceeds max size of ${maxFileSizeBytes()} bytes`)
  }

  const filename = sanitizeFilenameForStorage(input.filename)
  const storagePath = generateStorageKey(input.product, filename)
  ensureSafeStoragePath(storagePath)
  const absolutePath = path.join(FILES_DIR, storagePath)
  ensureDir(path.dirname(absolutePath))
  fs.writeFileSync(absolutePath, input.buffer)
  const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex')
  return { filename, storagePath, absolutePath, checksum }
}

export function readLocalFile(storagePath: string): Buffer | null {
  ensureSafeStoragePath(storagePath)
  const absolutePath = path.join(FILES_DIR, storagePath)
  if (!fs.existsSync(absolutePath)) return null
  return fs.readFileSync(absolutePath)
}

export function deleteLocalFile(storagePath: string): boolean {
  ensureSafeStoragePath(storagePath)
  const absolutePath = path.join(FILES_DIR, storagePath)
  if (!fs.existsSync(absolutePath)) return false
  fs.unlinkSync(absolutePath)
  return true
}

export function createCustomer(input: { name: string; email?: string; externalRef?: string; status?: StacklaneApiCustomer['status'] }) {
  const items = readCollection<StacklaneApiCustomer>(CUSTOMERS_FILE)
  const now = new Date().toISOString()
  const customer: StacklaneApiCustomer = {
    id: makeId('cust'),
    name: input.name,
    email: input.email,
    externalRef: input.externalRef,
    status: input.status || 'active',
    createdAt: now,
    updatedAt: now,
  }
  items.push(customer)
  writeCollection(CUSTOMERS_FILE, items)
  return customer
}

export function listCustomers() {
  return readCollection<StacklaneApiCustomer>(CUSTOMERS_FILE)
}

export function getCustomer(id: string) {
  return listCustomers().find((item) => item.id === id)
}

export function updateCustomer(id: string, patch: Partial<Omit<StacklaneApiCustomer, 'id' | 'createdAt'>>) {
  const items = listCustomers()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null
  const updated = { ...items[index], ...patch, updatedAt: new Date().toISOString() }
  items[index] = updated
  writeCollection(CUSTOMERS_FILE, items)
  return updated
}

export function createApiKeyRecord(input: { customerId: string; name: string; scopes?: string[]; mode?: 'dev' | 'live' }) {
  const items = readCollection<StacklaneApiKey>(API_KEYS_FILE)
  const { rawKey, record } = generateCustomerApiKey(input.customerId, input.name, input.mode || 'dev', input.scopes || ['*'])
  const apiKey: StacklaneApiKey = { id: makeId('key'), ...record }
  items.push(apiKey)
  writeCollection(API_KEYS_FILE, items)
  return { rawKey, apiKey }
}

export function listApiKeys(filters?: { customerId?: string }) {
  return readCollection<StacklaneApiKey>(API_KEYS_FILE).filter((item) => !filters?.customerId || item.customerId === filters.customerId)
}

export function revokeApiKey(id: string) {
  const items = listApiKeys()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null
  const updated = { ...items[index], status: 'revoked' as const, updatedAt: new Date().toISOString() }
  items[index] = updated
  writeCollection(API_KEYS_FILE, items)
  return updated
}

export function verifyStoredApiKey(rawKey: string) {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  return listApiKeys().find((item) => item.keyHash === keyHash && item.status === 'active') || null
}

export function touchApiKeyLastUsed(id: string) {
  const items = listApiKeys()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null
  const updated = { ...items[index], lastUsedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  items[index] = updated
  writeCollection(API_KEYS_FILE, items)
  return updated
}

export function recordUsageEvent(input: Omit<StacklaneUsageEvent, 'id' | 'createdAt'>) {
  const items = readCollection<StacklaneUsageEvent>(USAGE_EVENTS_FILE)
  const event: StacklaneUsageEvent = { id: makeId('usage'), ...input, createdAt: new Date().toISOString() }
  items.push(event)
  writeCollection(USAGE_EVENTS_FILE, items)
  return event
}

export function listUsageEvents(filters?: { customerId?: string; product?: string; action?: string; from?: string; to?: string }) {
  return readCollection<StacklaneUsageEvent>(USAGE_EVENTS_FILE).filter((event) => {
    if (filters?.customerId && event.customerId !== filters.customerId) return false
    if (filters?.product && event.product !== filters.product) return false
    if (filters?.action && event.action !== filters.action) return false
    if (filters?.from && event.createdAt < filters.from) return false
    if (filters?.to && event.createdAt > filters.to) return false
    return true
  })
}

export function summarizeUsage(filters?: { customerId?: string; product?: string; action?: string; from?: string; to?: string }) {
  const events = listUsageEvents(filters)
  return summarizeUsageEvents(events, (event) => `${event.product}:${event.action}`, filters)
}

export function summarizeUsageByCustomer(filters?: { from?: string; to?: string }) {
  const events = listUsageEvents(filters)
  return summarizeUsageEvents(events, (event) => event.customerId || 'unassigned', filters)
}

export function summarizeUsageByProduct(filters?: { from?: string; to?: string }) {
  const events = listUsageEvents(filters)
  return summarizeUsageEvents(events, (event) => event.product, filters)
}

export function summarizeUsageByAction(filters?: { from?: string; to?: string }) {
  const events = listUsageEvents(filters)
  return summarizeUsageEvents(events, (event) => event.action, filters)
}

export function createAssetRecord(input: Omit<StacklaneStoredAsset, 'id' | 'createdAt' | 'updatedAt'>) {
  const items = readCollection<StacklaneStoredAsset>(ASSETS_FILE)
  const now = new Date().toISOString()
  const asset: StacklaneStoredAsset = { id: makeId('asset'), ...input, createdAt: now, updatedAt: now }
  items.push(asset)
  writeCollection(ASSETS_FILE, items)
  return asset
}

export function listAssets(filters?: { customerId?: string; product?: string }) {
  return readCollection<StacklaneStoredAsset>(ASSETS_FILE).filter((asset) => {
    if (filters?.customerId && asset.customerId !== filters.customerId) return false
    if (filters?.product && asset.product !== filters.product) return false
    return true
  })
}

export function getAsset(id: string) {
  return listAssets().find((asset) => asset.id === id)
}

export function deleteAssetRecord(id: string) {
  const items = listAssets()
  const index = items.findIndex((asset) => asset.id === id)
  if (index === -1) return null
  const [removed] = items.splice(index, 1)
  writeCollection(ASSETS_FILE, items)
  return removed
}
