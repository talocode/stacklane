import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getCreditPack, listCreditPacks } from '../src/services/payments/credit-packs'
import { createLemonSqueezyCheckout, parseLemonSqueezyWebhook } from '../src/services/payments/lemon-squeezy-provider'
import { refundCreditDebit } from '../src/repositories/billing-purchases-repo'
import { fulfillBillingEvent } from '../src/repositories/billing-purchases-repo'
import { db } from '../src/db'

function withPaymentEnv(run: () => Promise<void> | void) {
  const original = { ...process.env }
  process.env.LEMONSQUEEZY_API_KEY = 'test-key'
  process.env.LEMONSQUEEZY_STORE_ID = '42'
  process.env.LEMONSQUEEZY_VARIANT_MAP = '{"500":"501","1000":"1001","2500":"2501","5000":"5001","10000":"10001","25000":"25001"}'
  return Promise.resolve(run()).finally(() => {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key]
    Object.assign(process.env, original)
  })
}

test('fixed pack registry controls credits and configured variants', async () => {
  await withPaymentEnv(() => {
    assert.deepEqual(listCreditPacks().map((pack) => pack.id), ['starter', 'builder', 'growth', 'scale', 'pro', 'studio'])
    assert.deepEqual(getCreditPack('starter'), { id: 'starter', credits: 500, amountCents: 500, variantId: '501' })
    assert.throws(() => getCreditPack('500'), { code: 'INVALID_PACK' })
  })
})

test('checkout sends only purchase_id custom data and never custom_price', async () => {
  await withPaymentEnv(async () => {
    const originalFetch = globalThis.fetch
    let request: Record<string, unknown> | undefined
    globalThis.fetch = (async (_url, init) => {
      request = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ data: { id: 'checkout_1', attributes: { url: 'https://checkout.test' } } }), { status: 201 })
    }) as typeof fetch
    try {
      await createLemonSqueezyCheckout({ purchaseId: 'bp_1', variantId: '501' })
    } finally {
      globalThis.fetch = originalFetch
    }
    const attributes = (request!.data as { attributes: Record<string, unknown> }).attributes
    assert.equal(attributes.custom_price, undefined)
    assert.deepEqual((attributes.checkout_data as { custom: unknown }).custom, { purchase_id: 'bp_1' })
    assert.equal(((request!.data as { relationships: { variant: { data: { id: string } } } }).relationships.variant.data.id), '501')
  })
})

test('webhook rejects bad signatures before parsing and rejects bad JSON after a valid signature', async () => {
  await withPaymentEnv(() => {
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook-secret'
    assert.throws(() => parseLemonSqueezyWebhook('{bad json', 'not-valid'), { code: 'INVALID_SIGNATURE' })
    const raw = '{bad json'
    const signature = createHmac('sha256', 'webhook-secret').update(raw).digest('hex')
    assert.throws(() => parseLemonSqueezyWebhook(raw, signature), { code: 'INVALID_PAYLOAD' })
  })
})

test('full, partial, and duplicate refund math is deterministic', () => {
  assert.equal(refundCreditDebit(500, 500, 0, 500), 500)
  assert.equal(refundCreditDebit(500, 500, 0, 125), 125)
  assert.equal(refundCreditDebit(500, 500, 125, 125), 125)
  assert.equal(refundCreditDebit(500, 500, 250, 0), 0)
  assert.equal(refundCreditDebit(500, 500, 250, 250), 250)
})

test('fulfillment SQL claims events, serializes purchase handling, and rolls back failures', () => {
  const source = readFileSync(new URL('../src/repositories/billing-purchases-repo.ts', import.meta.url), 'utf8')
  assert.match(source, /INSERT INTO payment_events[\s\S]*ON CONFLICT \(provider, provider_event_id\) DO NOTHING/)
  assert.match(source, /SELECT \* FROM billing_purchases WHERE id = \$1 FOR UPDATE/)
  assert.match(source, /await client\.query\('BEGIN'\)/)
  assert.match(source, /await client\.query\('ROLLBACK'\)/)
  assert.match(source, /status = 'processed'/)
})

test('sequential and concurrent duplicate events are no-ops after the first claim', async () => {
  const originalConnect = db.connect.bind(db)
  const calls: string[] = []
  ;(db as unknown as { connect: () => Promise<unknown> }).connect = async () => ({
    query: async (sql: string) => {
      calls.push(sql)
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [], rowCount: 0 }
      if (sql.includes('INSERT INTO payment_events')) return { rows: [], rowCount: 0 }
      throw new Error(`unexpected query: ${sql}`)
    },
    release: () => undefined,
  })
  try {
    const input = { providerEventId: 'evt_duplicate', eventName: 'order_paid', purchaseId: 'bp_1', payload: {}, storeId: '42', variantId: '501', orderId: 'order_1', refundAmountCents: null, paid: true }
    const [first, second] = await Promise.all([fulfillBillingEvent(input), fulfillBillingEvent(input)])
    assert.deepEqual([first.outcome, second.outcome], ['duplicate', 'duplicate'])
    assert.equal(calls.filter((sql) => sql.includes('INSERT INTO payment_events')).length, 2)
    assert.equal(calls.some((sql) => sql.includes('cloud_wallets')), false)
  } finally {
    ;(db as unknown as { connect: typeof db.connect }).connect = originalConnect
  }
})

test('a fulfillment failure rolls back event, ledger, and wallet changes together', async () => {
  const originalConnect = db.connect.bind(db)
  const calls: string[] = []
  ;(db as unknown as { connect: () => Promise<unknown> }).connect = async () => ({
    query: async (sql: string) => {
      calls.push(sql)
      if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql.includes("status = 'processing'")) return { rows: [], rowCount: 1 }
      if (sql.includes('INSERT INTO payment_events')) return { rows: [{ id: 'pevt_1' }], rowCount: 1 }
      if (sql.includes('SELECT * FROM billing_purchases')) return { rows: [{ id: 'bp_1', project_id: 'prj_1', store_id: '42', variant_id: '501', credits: 500, amount_cents: 500, status: 'pending', provider_order_id: null }], rowCount: 1 }
      if (sql.includes('INSERT INTO cloud_wallets')) return { rows: [{ id: 'cwal_1', balance_credits: 0 }], rowCount: 1 }
      if (sql.includes('UPDATE cloud_wallets')) throw new Error('wallet write failed')
      throw new Error(`unexpected query: ${sql}`)
    },
    release: () => undefined,
  })
  try {
    await assert.rejects(() => fulfillBillingEvent({ providerEventId: 'evt_rollback', eventName: 'order_paid', purchaseId: 'bp_1', payload: {}, storeId: '42', variantId: '501', orderId: 'order_1', refundAmountCents: null, paid: true }), /wallet write failed/)
    assert.ok(calls.includes('ROLLBACK'))
    assert.equal(calls.some((sql) => sql.includes('INSERT INTO credit_ledger')), false)
  } finally {
    ;(db as unknown as { connect: typeof db.connect }).connect = originalConnect
  }
})

test('an insufficient refund commits the payment event and one review record without a ledger debit', async () => {
  const originalConnect = db.connect.bind(db)
  const calls: string[] = []
  ;(db as unknown as { connect: () => Promise<unknown> }).connect = async () => ({
    query: async (sql: string) => {
      calls.push(sql)
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql.includes("status = 'processing'") || sql.includes("outcome = 'refund_requires_review'")) return { rows: [], rowCount: 1 }
      if (sql.includes('INSERT INTO payment_events')) return { rows: [{ id: 'pevt_refund_1' }], rowCount: 1 }
      if (sql.includes('SELECT * FROM billing_purchases')) return { rows: [{ id: 'bp_1', project_id: 'prj_1', store_id: '42', variant_id: '501', credits: 500, amount_cents: 500, status: 'paid', provider_order_id: 'order_1', refunded_credits: 0 }], rowCount: 1 }
      if (sql.includes('INSERT INTO cloud_wallets')) return { rows: [{ id: 'cwal_1', balance_credits: 100 }], rowCount: 1 }
      if (sql.includes('SELECT COALESCE(SUM(refund_amount_cents)')) return { rows: [{ refunded_cents: '0' }], rowCount: 1 }
      if (sql.includes('UPDATE cloud_wallets SET balance_credits = balance_credits -')) return { rows: [], rowCount: 0 }
      if (sql.includes('INSERT INTO refund_requires_review')) return { rows: [], rowCount: 1 }
      throw new Error(`unexpected query: ${sql}`)
    },
    release: () => undefined,
  })
  try {
    const result = await fulfillBillingEvent({ providerEventId: 'evt_refund_shortfall', eventName: 'order_refunded', purchaseId: 'bp_1', payload: {}, storeId: '42', variantId: '501', orderId: 'order_1', refundAmountCents: 500, paid: false })
    assert.equal(result.outcome, 'refund_requires_review')
    assert.ok(calls.includes('COMMIT'))
    assert.equal(calls.some((sql) => sql.includes("INSERT INTO credit_ledger") && sql.includes("'refund_debit'")), false)
    const review = calls.find((sql) => sql.includes('INSERT INTO refund_requires_review'))
    assert.ok(review)
    assert.match(review!, /ON CONFLICT \(payment_event_id\) DO NOTHING/)
  } finally {
    ;(db as unknown as { connect: typeof db.connect }).connect = originalConnect
  }
})

test('migration structurally blocks browser financial mutation and enforces idempotency', () => {
  const migration = readFileSync(new URL('../migrations/0007_stacklane_billing_hardening.sql', import.meta.url), 'utf8')
  for (const table of ['stacklane.billing_purchases', 'stacklane.payment_events', 'stacklane.credit_ledger']) {
    assert.match(migration, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`))
  }
  assert.match(migration, /REVOKE ALL ON stacklane\.billing_purchases, stacklane\.payment_events, stacklane\.credit_ledger FROM PUBLIC/)
  assert.match(migration, /UNIQUE \(provider, provider_event_id\)/)
  assert.match(migration, /payment_event_id TEXT NOT NULL UNIQUE/)
  assert.match(migration, /credit_ledger_immutable/)
})

test('review migration isolates refund liabilities and makes each payment event review idempotent', () => {
  const migration = readFileSync(new URL('../migrations/0008_refund_requires_review.sql', import.meta.url), 'utf8')
  assert.match(migration, /CREATE TABLE IF NOT EXISTS stacklane\.refund_requires_review/)
  assert.match(migration, /payment_event_id TEXT NOT NULL UNIQUE/)
  assert.match(migration, /provider_order_id TEXT NOT NULL/)
  assert.match(migration, /provider_event_id TEXT NOT NULL/)
  assert.match(migration, /requested_credits INTEGER NOT NULL/)
  assert.match(migration, /already_reversed_credits INTEGER NOT NULL/)
  assert.match(migration, /outstanding_credits INTEGER NOT NULL/)
  assert.match(migration, /available_balance_credits INTEGER NOT NULL/)
  assert.match(migration, /review_status TEXT NOT NULL DEFAULT 'pending'/)
  assert.match(migration, /outstanding_credits = requested_credits - already_reversed_credits/)
  assert.match(migration, /ALTER TABLE stacklane\.refund_requires_review ENABLE ROW LEVEL SECURITY/)
})
