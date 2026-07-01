# Stripe CLI Setup for Talocode Cloud Billing

Use Stripe CLI to automate local billing validation without the Stripe Dashboard.

## Prerequisites

- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed (`stripe` in PATH)
- Stripe account (test mode)
- Stacklane API running locally on port 4000

## Quick Start

```bash
# 1. Login to Stripe
stripe login

# 2. Start webhook forwarding (separate terminal)
./scripts/stripe-cli-dev.sh

# 3. In another terminal, trigger test events
./scripts/stripe-trigger-test-events.sh
```

## Step-by-Step

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux (apt)
echo "deb https://packages.stripe.com/stripe-cli/debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe

# Linux (yum)
sudo dnf config-manager --add-repo https://packages.stripe.com/stripe-cli/rpm/stripe.repo
sudo dnf install stripe

# Verify
stripe version
```

### 2. Login

```bash
stripe login
```

Opens a browser to authenticate. Generates an API key stored at `~/.config/stripe/config.toml`.

### 3. Start Webhook Forwarding

```bash
stripe listen --forward-to localhost:4000/api/v1/cloud/billing/stripe/webhook
```

Output:

```
> Ready! Your webhook signing secret is whsec_abc123... (^C to quit)
```

Copy the `whsec_...` secret. This is your **local** webhook secret.

### 4. Configure Local Environment

Create or edit `apps/api/.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

This file is gitignored (`.env.local` matches `.env.*` in `.gitignore`).

### 5. Start the API

```bash
pnpm --filter @stacklane/api dev
```

The API reads `STRIPE_WEBHOOK_SECRET` from the environment to verify webhook signatures.

### 6. Trigger Test Events

```bash
stripe trigger checkout.session.completed
```

This sends a simulated `checkout.session.completed` event to your local webhook. The API should log the top-up processing.

Verify in the API logs:

```
[webhook] checkout.session.completed — crediting wallet
```

### 7. Check Wallet Balance

```bash
curl http://localhost:4000/api/v1/cloud/projects/{projectId}/wallet \
  -H "Cookie: sl_session=..."
```

## Test Event Catalog

| Stripe CLI Command | Event Triggered | API Handles It |
|---|---|---|
| `stripe trigger checkout.session.completed` | `checkout.session.completed` | Yes — credits wallet |
| `stripe trigger payment_intent.succeeded` | `payment_intent.succeeded` | No — silently ignored |
| `stripe trigger charge.succeeded` | `charge.succeeded` | No — silently ignored |
| `stripe trigger customer.created` | `customer.created` | No — silently ignored |

Only `checkout.session.completed` is handled. All other events return `{ received: true }` with no action.

## How to Test the Full Top-Up Flow

1. Start API, Stripe CLI forwarding, and frontend dev server
2. Navigate to the Wallet page (`/billing`)
3. Enter an amount (minimum $5.00)
4. Complete the embedded Stripe checkout form using test card `4242 4242 4242 4242`
5. After redirect, refresh — wallet should show the credited amount
6. Check the API logs for the webhook processing

## Stripe Test Cards

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline (generic) |
| `4000 0025 0000 3155` | Requires 3D Secure |

## Scripts Reference

| Script | Purpose |
|---|---|
| `scripts/stripe-cli-dev.sh` | Start webhook forwarding with safety checks |
| `scripts/stripe-trigger-test-events.sh` | Trigger handled webhook events |
| `scripts/check-stripe-cli.mjs` | Validate CLI setup and configuration |

## Production Setup (After Deployment)

Do not reuse local `whsec_` secrets in production.

### 1. Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://api.talocode.site/api/v1/cloud/billing/stripe/webhook`
4. Events to listen for:
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the signing secret (`whsec_...`)

### 2. Set Production Environment Variables

Add these to your deployment platform (e.g., Netlify, Railway):

| Variable | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → endpoint → signing secret (`whsec_...`) |

### 3. Verify Production Setup

```bash
# Smoke test the production webhook
curl -X POST https://api.talocode.site/api/v1/cloud/billing/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
# Expect: 400 MISSING_SIGNATURE (not 404 or 500)
```

## Security Notes

- **Never commit secrets** — all `.env.*` files except `.env.example` and `.env.*.example` are gitignored
- **Local `whsec_` ≠ production `whsec_`** — Stripe CLI generates a unique local signing secret each time
- **Test mode vs live mode** — `sk_test_`/`pk_test_` keys only work in test mode; `sk_live_`/`pk_live_` required for real payments
- **Webhook signature validation** prevents forged events in both local and production environments
