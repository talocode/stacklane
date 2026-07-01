# Stripe Top-ups for Talocode Cloud

Talocode Cloud uses **Stripe Embedded Checkout** for wallet top-ups. Customers enter payment details in an embedded form without leaving the site.

## How It Works

1. User requests a top-up with `amountUsd` and `provider: "stripe"`
2. API creates a pending top-up record and a Stripe Checkout Session (`ui_mode: 'embedded'`)
3. API returns a `clientSecret` and `publishableKey`
4. Frontend renders Stripe's `<EmbeddedCheckout>` component with the client secret
5. Customer fills in payment details in the embedded Stripe form
6. Stripe sends a `checkout.session.completed` webhook to the server
7. Server verifies the webhook signature, confirms payment, and credits the wallet

## API

### Create Top-up (embedded checkout)

```bash
curl -X POST http://localhost:4000/api/v1/cloud/projects/{projectId}/topups \
  -H "Content-Type: application/json" \
  -H "Cookie: sl_session=..." \
  -d '{"amountUsd": 5, "provider": "stripe"}'
```

Response:

```json
{
  "data": {
    "topup": {
      "id": "ctup_...",
      "projectId": "...",
      "provider": "stripe",
      "amountUsd": 5,
      "credits": 500,
      "status": "pending",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "stripe": {
      "sessionId": "cs_test_...",
      "clientSecret": "cs_test_..._secret_...",
      "publishableKey": "pk_test_..."
    },
    "creditsPerDollar": 100
  }
}
```

### Frontend Integration

```tsx
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

function TopupCheckout({ clientSecret, publishableKey, onComplete }) {
  const stripePromise = loadStripe(publishableKey)

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ clientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  )
}
```

When payment succeeds, Stripe redirects to the `return_url`. The frontend should then refresh the wallet balance via `GET /api/v1/cloud/projects/:id/wallet`.

## Webhook

Stripe sends events to:

```
POST /api/v1/cloud/billing/stripe/webhook
```

The server verifies the `Stripe-Signature` header using `STRIPE_WEBHOOK_SECRET`.

Handled events:
- `checkout.session.completed` — credits the wallet

Unsupported events are silently ignored.

## Testing with Stripe CLI

See the dedicated guide: [`STRIPE_CLI_SETUP.md`](./STRIPE_CLI_SETUP.md)

Quick reference:

```bash
# Automated setup script (handles secrets safely)
./scripts/stripe-cli-dev.sh

# Trigger handled webhook events
./scripts/stripe-trigger-test-events.sh

# Validate setup
node scripts/check-stripe-cli.mjs
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Yes (production) | — | Stripe secret key (sk_live_ or sk_test_) |
| `STRIPE_PUBLISHABLE_KEY` | Yes (frontend) | — | Stripe publishable key (pk_live_ or pk_test_) |
| `STRIPE_WEBHOOK_SECRET` | Yes | — | Webhook signing secret (whsec_...) |
| `TALOCODE_CLOUD_SUCCESS_URL` | No | `http://localhost:5173/dashboard` | Return URL after payment |
| `TALOCODE_CLOUD_CANCEL_URL` | No | `http://localhost:5173/dashboard` | Cancel URL (unused in embedded mode) |
| `STRIPE_API_VERSION` | No | `2025-02-24.acacia` | Stripe API version |
| `TALOCODE_ALLOW_MANUAL_TOPUPS` | No | — | Set to `true` to enable manual top-ups in production |

## Production Checklist

- [ ] Set `STRIPE_SECRET_KEY` (live)
- [ ] Set `STRIPE_PUBLISHABLE_KEY` (live)
- [ ] Set `STRIPE_WEBHOOK_SECRET` (live)
- [ ] Register webhook endpoint in Stripe Dashboard → Webhooks → Add endpoint
- [ ] URL: `https://api.talocode.site/api/v1/cloud/billing/stripe/webhook`
- [ ] Events: `checkout.session.completed`
- [ ] Set `TALOCODE_CLOUD_SUCCESS_URL` to production dashboard URL
- [ ] Verify `TALOCODE_ALLOW_MANUAL_TOPUPS` is NOT set (disabled by default in production)

## Security

- No raw card numbers or CVV are ever collected or stored
- Stripe handles all PCI-compliant payment processing
- Webhook signature verification prevents forged events
- Amount mismatch detection prevents underpayment
- Duplicate webhook events are idempotent (second call returns null)
- Manual top-ups are blocked in production by default
