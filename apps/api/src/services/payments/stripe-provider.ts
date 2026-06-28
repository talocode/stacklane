import Stripe from 'stripe'
import { HttpError } from '../../http'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new HttpError(500, 'STRIPE_NOT_CONFIGURED', 'Stripe is not configured. Set STRIPE_SECRET_KEY.')
  return new Stripe(key, {
    apiVersion: (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) || '2025-02-24.acacia'
  })
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function getStripePublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY || null
}

export async function createStripeEmbeddedCheckoutSession(input: {
  topupId: string
  projectId: string
  amountUsd: number
  credits: number
  successUrl?: string
  cancelUrl?: string
}) {
  const stripe = getStripe()
  const successUrl = input.successUrl || process.env.TALOCODE_CLOUD_SUCCESS_URL || 'http://localhost:5173/dashboard'
  const cancelUrl = input.cancelUrl || process.env.TALOCODE_CLOUD_CANCEL_URL || 'http://localhost:5173/dashboard'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'usd',
    ui_mode: 'embedded',
    return_url: successUrl,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Talocode Cloud credits',
            description: `${input.credits.toLocaleString()} credits`
          },
          unit_amount: Math.round(input.amountUsd * 100)
        },
        quantity: 1
      }
    ],
    metadata: {
      topupId: input.topupId,
      projectId: input.projectId,
      credits: String(input.credits),
      provider: 'stripe'
    }
  })

  return {
    sessionId: session.id,
    clientSecret: session.client_secret,
    amountTotal: session.amount_total
  }
}

export async function constructStripeWebhookEvent(rawBody: string | Buffer, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new HttpError(500, 'WEBHOOK_NOT_CONFIGURED', 'Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET.')

  const stripe = getStripe()
  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    return event
  } catch {
    throw new HttpError(400, 'INVALID_SIGNATURE', 'Invalid Stripe webhook signature.')
  }
}
