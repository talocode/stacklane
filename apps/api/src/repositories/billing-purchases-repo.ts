import { db } from '../db'
import { makeId } from '../utils'

type Purchase = {
  id: string
  project_id: string
  provider: string
  pack_id: string
  variant_id: string
  store_id: string
  credits: number
  amount_cents: number
  status: 'pending' | 'paid' | 'refunded' | 'failed'
  checkout_id: string | null
  provider_order_id: string | null
  refunded_credits: number
}

export async function createBillingPurchase(input: Omit<Purchase, 'status' | 'checkout_id' | 'provider_order_id' | 'refunded_credits'>) {
  const result = await db.query<Purchase>(
    `INSERT INTO billing_purchases (id, project_id, provider, pack_id, variant_id, store_id, credits, amount_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [input.id, input.project_id, input.provider, input.pack_id, input.variant_id, input.store_id, input.credits, input.amount_cents],
  )
  return result.rows[0]
}

export async function setBillingPurchaseCheckout(id: string, checkoutId: string) {
  await db.query(`UPDATE billing_purchases SET checkout_id = $2, updated_at = now() WHERE id = $1 AND status = 'pending'`, [id, checkoutId])
}

/** Allocate rounded-down refund credits cumulatively so partial refunds add up deterministically. */
export function refundCreditDebit(credits: number, amountCents: number, previouslyRefundedCents: number, eventRefundCents: number) {
  const totalAfter = Math.min(amountCents, previouslyRefundedCents + Math.max(0, eventRefundCents))
  return Math.floor((credits * totalAfter) / amountCents) - Math.floor((credits * previouslyRefundedCents) / amountCents)
}

export async function fulfillBillingEvent(input: {
  providerEventId: string
  eventName: string
  purchaseId: string | null
  payload: Record<string, unknown>
  storeId: string | null
  variantId: string | null
  orderId: string | null
  refundAmountCents: number | null
  paid: boolean
}) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO payment_events (id, provider, provider_event_id, event_name, purchase_id, payload)
       VALUES ($1, 'lemonsqueezy', $2, $3, $4, $5)
       ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`,
      [makeId('pevt'), input.providerEventId, input.eventName, input.purchaseId, JSON.stringify(input.payload)],
    )
    if (!inserted.rowCount) {
      await client.query('COMMIT')
      return { outcome: 'duplicate' as const }
    }
    const eventId = inserted.rows[0].id
    await client.query(`UPDATE payment_events SET status = 'processing', claimed_at = now() WHERE id = $1`, [eventId])
    const purchaseResult = await client.query<Purchase>(`SELECT * FROM billing_purchases WHERE id = $1 FOR UPDATE`, [input.purchaseId])
    const purchase = purchaseResult.rows[0]
    const reject = async (outcome: string) => {
      await client.query(`UPDATE payment_events SET status = 'ignored', outcome = $2, processed_at = now() WHERE id = $1`, [eventId, outcome])
      await client.query('COMMIT')
      return { outcome: 'ignored' as const }
    }
    if (!purchase || !input.storeId || !input.variantId || purchase.store_id !== input.storeId || purchase.variant_id !== input.variantId) return reject('purchase_mismatch')

    const walletResult = await client.query<{ id: string; balance_credits: number }>(
      `INSERT INTO cloud_wallets (id, project_id, balance_credits, free_credits_granted)
       VALUES ($1, $2, 0, false) ON CONFLICT (project_id) DO UPDATE SET project_id = EXCLUDED.project_id
       RETURNING id, balance_credits`,
      [makeId('cwal'), purchase.project_id],
    )
    const wallet = walletResult.rows[0]
    if (!['order_created', 'order_paid', 'order_refunded'].includes(input.eventName)) return reject('unsupported_event')
    if (input.eventName === 'order_refunded') {
      if (purchase.status !== 'paid' || !input.orderId || purchase.provider_order_id !== input.orderId) return reject('refund_mismatch')
      const cents = Math.min(Math.max(input.refundAmountCents ?? purchase.amount_cents, 0), purchase.amount_cents)
      const prior = await client.query<{ refunded_cents: string }>(
        `SELECT COALESCE(SUM(refund_amount_cents), 0) AS refunded_cents FROM credit_ledger WHERE purchase_id = $1 AND entry_type = 'refund_debit'`, [purchase.id])
      const priorCents = Number(prior.rows[0].refunded_cents)
      const debit = refundCreditDebit(purchase.credits, purchase.amount_cents, priorCents, cents)
       if (debit > 0) {
         const updated = await client.query<{ balance_credits: number }>(`UPDATE cloud_wallets SET balance_credits = balance_credits - $1, updated_at = now() WHERE id = $2 AND balance_credits >= $1 RETURNING balance_credits`, [debit, wallet.id])
        if (!updated.rowCount) {
          await client.query(
            `INSERT INTO refund_requires_review (
               id, purchase_id, payment_event_id, provider_order_id, provider_event_id,
               requested_credits, already_reversed_credits, outstanding_credits,
               available_balance_credits, reason
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'insufficient_wallet_balance')
             ON CONFLICT (payment_event_id) DO NOTHING`,
            [makeId('rrr'), purchase.id, eventId, input.orderId, input.providerEventId, purchase.refunded_credits + debit, purchase.refunded_credits, debit, wallet.balance_credits],
          )
          await client.query(`UPDATE payment_events SET status = 'processed', outcome = 'refund_requires_review', processed_at = now() WHERE id = $1`, [eventId])
          await client.query('COMMIT')
          return { outcome: 'refund_requires_review' as const }
        }
        await client.query(`INSERT INTO credit_ledger (id, purchase_id, payment_event_id, wallet_id, entry_type, credits_delta, balance_after, provider_order_id, refund_amount_cents) VALUES ($1, $2, $3, $4, 'refund_debit', $5, $6, $7, $8)`, [makeId('cled'), purchase.id, eventId, wallet.id, -debit, updated.rows[0].balance_credits, input.orderId, cents])
        await client.query(`UPDATE billing_purchases SET refunded_credits = refunded_credits + $2, status = CASE WHEN refunded_credits + $2 >= credits THEN 'refunded' ELSE 'paid' END, updated_at = now() WHERE id = $1`, [purchase.id, debit])
      }
    } else {
      if (!input.paid || purchase.status !== 'pending' || !input.orderId || (purchase.provider_order_id && purchase.provider_order_id !== input.orderId)) return reject('purchase_not_pending')
      const updated = await client.query<{ balance_credits: number }>(`UPDATE cloud_wallets SET balance_credits = balance_credits + $1, updated_at = now() WHERE id = $2 RETURNING balance_credits`, [purchase.credits, wallet.id])
      await client.query(`INSERT INTO credit_ledger (id, purchase_id, payment_event_id, wallet_id, entry_type, credits_delta, balance_after, provider_order_id) VALUES ($1, $2, $3, $4, 'purchase_credit', $5, $6, $7)`, [makeId('cled'), purchase.id, eventId, wallet.id, purchase.credits, updated.rows[0].balance_credits, input.orderId])
      await client.query(`UPDATE billing_purchases SET status = 'paid', provider_order_id = $2, updated_at = now() WHERE id = $1`, [purchase.id, input.orderId])
    }
    await client.query(`UPDATE payment_events SET status = 'processed', outcome = 'fulfilled', processed_at = now() WHERE id = $1`, [eventId])
    await client.query('COMMIT')
    return { outcome: 'fulfilled' as const }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
