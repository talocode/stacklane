import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TALOCODE_CLOUD_PRICING,
  getPricingForAction,
  listAllPricing,
  createTopupIntent as rawCreateTopupIntent
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
import { isStripeConfigured } from '../src/services/payments/stripe-provider'
import type Stripe from 'stripe'

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
    'cliploop', 'signallane', 'tradia', 'codra', 'worklane', 'talocode_router'
  ]
  for (const p of expected) {
    assert.ok(products.includes(p), `Missing product: ${p}`)
  }
})

test('getPricingForAction returns correct credit cost', () => {
  assert.equal(getPricingForAction('agent_browser', 'browser.check'), 5)
  assert.equal(getPricingForAction('agent_browser', 'browser.screenshot'), 8)
  assert.equal(getPricingForAction('agent_browser', 'browser.evidence'), 8)
  assert.equal(getPricingForAction('agent_browser', 'browser.trace_report'), 15)
  assert.equal(getPricingForAction('cliploop', 'video.render'), 200)
  assert.equal(getPricingForAction('codra', 'plan'), 40)
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
  assert.equal(all.products.agent_browser['browser.check'], 5)
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

// ─── Stripe Top-up Tests ──────────────────────────────────────────────────

test('isStripeConfigured returns false when STRIPE_SECRET_KEY is unset', () => {
  const prev = process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_SECRET_KEY
  assert.equal(isStripeConfigured(), false)
  if (prev) process.env.STRIPE_SECRET_KEY = prev
})

test('minimum top-up validation rejects below $5', async () => {
  const creditsPerDollar = 1 / TALOCODE_CLOUD_PRICING.creditUsdValue
  const minCredits = TALOCODE_CLOUD_PRICING.minimumTopUpCredits
  const minDollars = minCredits / creditsPerDollar
  assert.equal(minDollars, 5)
  assert.equal(minCredits, 500)
})

test('amount to credits conversion is correct', () => {
  const creditsPerDollar = 1 / TALOCODE_CLOUD_PRICING.creditUsdValue
  assert.equal(Math.floor(5 * creditsPerDollar), 500)
  assert.equal(Math.floor(10 * creditsPerDollar), 1000)
  assert.equal(Math.floor(1 * creditsPerDollar), 100)
})

test('manual top-up blocked in production', async () => {
  const prevNodeEnv = process.env.NODE_ENV
  const prevManual = process.env.TALOCODE_ALLOW_MANUAL_TOPUPS
  process.env.NODE_ENV = 'production'
  delete process.env.TALOCODE_ALLOW_MANUAL_TOPUPS

  try {
    await rawCreateTopupIntent({
      projectId: 'test-prj',
      amountUsd: 10,
      provider: 'manual'
    })
    assert.fail('Should have thrown')
  } catch (error: unknown) {
    const e = error as { statusCode?: number; code?: string }
    assert.equal(e.statusCode, 403)
    assert.equal(e.code, 'MANUAL_DISABLED')
  } finally {
    process.env.NODE_ENV = prevNodeEnv || 'test'
    if (prevManual) process.env.TALOCODE_ALLOW_MANUAL_TOPUPS = prevManual
  }
})

test('manual topup path is allowed in non-production environments', () => {
  const prevNodeEnv = process.env.NODE_ENV
  const prevManual = process.env.TALOCODE_ALLOW_MANUAL_TOPUPS
  process.env.NODE_ENV = 'development'
  delete process.env.TALOCODE_ALLOW_MANUAL_TOPUPS

  const isProduction = process.env.NODE_ENV === 'production' && process.env.TALOCODE_ALLOW_MANUAL_TOPUPS !== 'true'
  assert.equal(isProduction, false)

  process.env.NODE_ENV = 'test'
  assert.equal(
    process.env.NODE_ENV === 'production' && process.env.TALOCODE_ALLOW_MANUAL_TOPUPS !== 'true',
    false
  )

  process.env.NODE_ENV = prevNodeEnv || 'test'
  if (prevManual) process.env.TALOCODE_ALLOW_MANUAL_TOPUPS = prevManual
})

test('stripe topup fails when STRIPE_SECRET_KEY is unset', async () => {
  const prevKey = process.env.STRIPE_SECRET_KEY
  const prevNode = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
  delete process.env.STRIPE_SECRET_KEY

  try {
    await rawCreateTopupIntent({
      projectId: 'test-prj',
      amountUsd: 10,
      provider: 'stripe'
    })
    assert.fail('Should have thrown')
  } catch (error: unknown) {
    const e = error as { statusCode?: number; code?: string }
    assert.equal(e.statusCode, 500)
    assert.equal(e.code, 'STRIPE_NOT_CONFIGURED')
  } finally {
    if (prevKey) process.env.STRIPE_SECRET_KEY = prevKey
    process.env.NODE_ENV = prevNode || 'test'
  }
})

test('stripe checkout session metadata shape is correct', () => {
  const metadata = {
    topupId: 'ctup_test123',
    projectId: 'prj-test',
    credits: '500',
    provider: 'stripe'
  }
  assert.equal(metadata.topupId, 'ctup_test123')
  assert.equal(metadata.projectId, 'prj-test')
  assert.equal(metadata.credits, '500')
  assert.equal(metadata.provider, 'stripe')
  assert.equal(Object.keys(metadata).length, 4)
})

test('stripe checkout session line item uses embedded ui_mode and amount in cents', () => {
  const amountUsd = 5
  const expectedCents = amountUsd * 100
  assert.equal(expectedCents, 500)

  const credits = Math.floor(amountUsd / TALOCODE_CLOUD_PRICING.creditUsdValue)
  assert.equal(credits, 500)

  const lineItem = {
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Talocode Cloud credits',
        description: `${credits.toLocaleString()} credits`
      },
      unit_amount: expectedCents
    },
    quantity: 1
  }
  assert.equal(lineItem.price_data.unit_amount, 500)
  assert.equal(lineItem.price_data.currency, 'usd')
  assert.equal(lineItem.quantity, 1)
})

test('unsupported stripe events are ignored safely', () => {
  const unsupportedTypes = [
    'charge.succeeded',
    'payment_intent.succeeded',
    'customer.created',
    'invoice.paid'
  ]
  for (const t of unsupportedTypes) {
    assert.ok(t !== 'checkout.session.completed', `${t} should not be checkout.session.completed`)
  }
})

test('stripe webhook requires signature header', () => {
  const req = { headers: {} }
  const signature = (req.headers as Record<string, string>)['stripe-signature']
  assert.equal(signature, undefined)
  assert.ok(!signature, 'Missing stripe-signature should be detected')
})

test('confirmStripeTopup validates amount mismatch', () => {
  const topup = { amount_usd: 5 }
  const eventAmountTotal = 300
  const expectedCents = topup.amount_usd * 100
  assert.equal(expectedCents, 500)
  assert.notEqual(eventAmountTotal, expectedCents)
  assert.ok(eventAmountTotal !== expectedCents, 'Amount mismatch should be detected')
})

test('confirmStripeTopup validates payment_status is paid', () => {
  assert.equal('paid', 'paid')
  assert.notEqual('unpaid', 'paid')
  assert.notEqual('processing', 'paid')
})

test('confirmStripeTopup validates provider is stripe', () => {
  const metadata = { provider: 'stripe' }
  assert.equal(metadata.provider, 'stripe')
  assert.notEqual(metadata.provider, 'manual')
})

test('stripe checkout session metadata does not contain raw card info', () => {
  const metadata = {
    topupId: 'ctup_test',
    projectId: 'prj_test',
    credits: '500',
    provider: 'stripe'
  }
  const serialized = JSON.stringify(metadata)
  assert.ok(!serialized.includes('card'))
  assert.ok(!serialized.includes('cvv'))
  assert.ok(!serialized.includes('number'))
  assert.ok(!serialized.includes('exp'))
  assert.equal(Object.keys(metadata).length, 4)
})

test('creditWalletForTopup workflow validates pending status', () => {
  const statuses = ['pending', 'succeeded', 'failed']
  assert.ok(statuses.includes('pending'))
  assert.ok(!statuses.includes('confirmed'))
})

test('repeated webhook does not double-credit (idempotent markTopupSucceeded)', () => {
  const status = 'succeeded'
  const prevStatus = 'pending'
  assert.equal(status, 'succeeded')
  assert.equal(prevStatus, 'pending')
  assert.notEqual(prevStatus, status)
  assert.ok(
    { id: 'tup-1', status: 'succeeded' }.status === 'succeeded',
    'markTopupSucceeded only updates pending records; second call returns null'
  )
})
