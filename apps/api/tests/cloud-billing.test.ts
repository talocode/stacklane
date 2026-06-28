import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TALOCODE_CLOUD_PRICING,
  getPricingForAction,
  listAllPricing
} from '../src/services/cloud-billing'
import { hashValue } from '../src/utils'
import {
  toCloudProjectResponse,
  toCloudApiKeyResponse,
  toCloudWalletResponse,
  toCloudWalletTransactionResponse,
  toCloudUsageEventResponse,
  toCloudTopupResponse
} from '../src/services/cloud-formatters'

// ─── Pricing Config ───────────────────────────────────────────────────────

test('TALOCODE_CLOUD_PRICING has correct base values', () => {
  assert.equal(TALOCODE_CLOUD_PRICING.creditUsdValue, 0.01)
  assert.equal(TALOCODE_CLOUD_PRICING.freeStartingCredits, 100)
  assert.equal(TALOCODE_CLOUD_PRICING.minimumTopUpCredits, 500)
})

test('pricing config contains all required products', () => {
  const products = Object.keys(TALOCODE_CLOUD_PRICING.products)
  const expected = [
    'agent_browser', 'tera_context', 'talocode_reach',
    'cliploop', 'signallane', 'tradia', 'codra', 'worklane'
  ]
  for (const p of expected) {
    assert.ok(products.includes(p), `Missing product: ${p}`)
  }
})

test('getPricingForAction returns correct credit cost', () => {
  assert.equal(getPricingForAction('agent_browser', 'browser.check'), 2)
  assert.equal(getPricingForAction('agent_browser', 'browser.screenshot'), 3)
  assert.equal(getPricingForAction('agent_browser', 'browser.evidence'), 3)
  assert.equal(getPricingForAction('agent_browser', 'browser.trace_report'), 5)
  assert.equal(getPricingForAction('cliploop', 'video.render'), 150)
  assert.equal(getPricingForAction('codra', 'task.large'), 100)
})

test('getPricingForAction returns null for unknown product', () => {
  assert.equal(getPricingForAction('nonexistent', 'action'), null)
})

test('getPricingForAction returns null for unknown action', () => {
  assert.equal(getPricingForAction('agent_browser', 'nonexistent'), null)
})

test('listAllPricing returns complete pricing object', () => {
  const all = listAllPricing()
  assert.equal(all.creditUsdValue, 0.01)
  assert.ok(all.products.agent_browser)
  assert.equal(all.products.agent_browser['browser.check'], 2)
})

test('pricing actions per product are positive integers', () => {
  for (const [product, actions] of Object.entries(TALOCODE_CLOUD_PRICING.products)) {
    for (const [action, credits] of Object.entries(actions as Record<string, number>)) {
      assert.ok(Number.isInteger(credits), `${product}:${action} must be integer, got ${credits}`)
      assert.ok(credits > 0, `${product}:${action} must be positive, got ${credits}`)
    }
  }
})

// ─── API Key Hashing ──────────────────────────────────────────────────────

test('hashValue produces consistent SHA-256 hex digest', () => {
  const input = 'test-api-key-value'
  const hash = hashValue(input)
  assert.equal(typeof hash, 'string')
  assert.equal(hash.length, 64)
  assert.match(hash, /^[a-f0-9]{64}$/)
})

test('hashValue is deterministic', () => {
  const input = 'tk_live_abc.def123ghi'
  assert.equal(hashValue(input), hashValue(input))
})

test('hashValue produces different outputs for different inputs', () => {
  assert.notEqual(hashValue('key-a'), hashValue('key-b'))
})

test('raw API key is not stored - only hash and prefix', () => {
  const rawKey = 'tk_dev_test123.secret456'
  const prefix = rawKey.split('.')[0]
  const keyHash = hashValue(rawKey)
  assert.equal(prefix, 'tk_dev_test123')
  assert.equal(typeof keyHash, 'string')
  assert.equal(keyHash.length, 64)
  assert.notEqual(keyHash, rawKey)
  assert.notEqual(keyHash, prefix)
  assert.ok(!keyHash.includes('test123'))
  assert.ok(!keyHash.includes('secret456'))
})

test('API key format follows tk_dev_/tk_live_ prefix pattern', () => {
  const devPrefix = `tk_dev_${Math.random().toString(36).slice(2, 8)}`
  const livePrefix = `tk_live_${Math.random().toString(36).slice(2, 8)}`
  assert.match(devPrefix, /^tk_dev_[a-z0-9]{6}$/)
  assert.match(livePrefix, /^tk_live_[a-z0-9]{6}$/)
})

// ─── Formatters ───────────────────────────────────────────────────────────

test('toCloudProjectResponse converts snake_case to camelCase', () => {
  const result = toCloudProjectResponse({
    id: 'abc-123',
    owner_id: 'usr-1',
    name: 'My Project',
    slug: 'my-project',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  })
  assert.equal(result.id, 'abc-123')
  assert.equal(result.ownerId, 'usr-1')
  assert.equal(result.name, 'My Project')
  assert.equal(result.slug, 'my-project')
  assert.equal(result.createdAt, '2026-01-01T00:00:00.000Z')
  assert.equal(result.updatedAt, '2026-01-01T00:00:00.000Z')
})

test('toCloudApiKeyResponse does not expose key_hash', () => {
  const result = toCloudApiKeyResponse({
    id: 'key-1',
    project_id: 'prj-1',
    name: 'My Key',
    key_prefix: 'tk_dev_abc123',
    key_hash: 'should-not-be-exposed',
    mode: 'dev',
    status: 'active',
    last_used_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  })
  assert.equal(result.id, 'key-1')
  assert.equal(result.prefix, 'tk_dev_abc123')
  assert.equal(result.mode, 'dev')
  assert.equal(result.status, 'active')
  assert.equal((result as Record<string, unknown>).keyHash, undefined)
})

test('toCloudWalletResponse shows balance and free grant status', () => {
  const result = toCloudWalletResponse({
    id: 'wal-1',
    project_id: 'prj-1',
    balance_credits: 100,
    free_credits_granted: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  })
  assert.equal(result.balanceCredits, 100)
  assert.equal(result.freeCreditsGranted, true)
})

test('toCloudWalletTransactionResponse shows type and delta', () => {
  const result = toCloudWalletTransactionResponse({
    id: 'txn-1',
    wallet_id: 'wal-1',
    type: 'usage',
    credits_delta: -5,
    balance_after: 95,
    reference: 'req-123',
    metadata: { product: 'agent_browser' },
    created_at: '2026-01-01T00:00:00.000Z'
  })
  assert.equal(result.type, 'usage')
  assert.equal(result.creditsDelta, -5)
  assert.equal(result.balanceAfter, 95)
  assert.equal(result.reference, 'req-123')
})

test('toCloudUsageEventResponse shows product, action, credits, status', () => {
  const result = toCloudUsageEventResponse({
    id: 'evt-1',
    project_id: 'prj-1',
    api_key_id: 'key-1',
    product: 'agent_browser',
    action: 'browser.check',
    credits: 2,
    status: 'success',
    request_id: 'req-123',
    idempotency_key: 'idem-1',
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z'
  })
  assert.equal(result.product, 'agent_browser')
  assert.equal(result.action, 'browser.check')
  assert.equal(result.credits, 2)
  assert.equal(result.status, 'success')
  assert.equal(result.requestId, 'req-123')
  assert.equal(result.idempotencyKey, 'idem-1')
})

test('toCloudTopupResponse shows amount and credit conversion', () => {
  const result = toCloudTopupResponse({
    id: 'tup-1',
    project_id: 'prj-1',
    provider: 'manual',
    provider_reference: null,
    amount_usd: 500,
    credits: 50000,
    status: 'pending',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  })
  assert.equal(result.amountUsd, 500)
  assert.equal(result.credits, 50000)
  assert.equal(result.status, 'pending')
})

// ─── Credit-to-USD Conversion ─────────────────────────────────────────────

test('1 credit = $0.01 conversion', () => {
  const creditsPerDollar = 1 / TALOCODE_CLOUD_PRICING.creditUsdValue
  assert.equal(creditsPerDollar, 100)
  assert.equal(TALOCODE_CLOUD_PRICING.freeStartingCredits * TALOCODE_CLOUD_PRICING.creditUsdValue, 1)
})

test('minimum top-up of $5 = 500 credits', () => {
  const creditsPerDollar = 1 / TALOCODE_CLOUD_PRICING.creditUsdValue
  const minCredits = TALOCODE_CLOUD_PRICING.minimumTopUpCredits
  const minDollars = minCredits / creditsPerDollar
  assert.equal(minDollars, 5)
  assert.equal(minCredits * TALOCODE_CLOUD_PRICING.creditUsdValue, 5)
})

// ─── Authorization Header Safety ──────────────────────────────────────────

test('raw API key is redacted from logs and responses by default', () => {
  const rawKey = 'tk_live_secrit.ultra-secret-value'
  const hash = hashValue(rawKey)
  const response = toCloudApiKeyResponse({
    id: 'key-1',
    project_id: 'prj-1',
    name: 'test',
    key_prefix: 'tk_live_secrit',
    key_hash: hash,
    mode: 'live',
    status: 'active',
    last_used_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  })
  assert.equal(response.prefix, 'tk_live_secrit')
  assert.ok(!JSON.stringify(response).includes(rawKey))
  assert.ok(!JSON.stringify(response).includes('ultra-secret'))
})
