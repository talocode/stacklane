# Talocode Cloud Billing

Prepaid wallet billing system for Talocode Cloud services.

> **Base URL:** `https://api.talocode.site` (set `TALOCODE_BASE_URL` env var to override; defaults to `http://localhost:4000` in development).

## Credits

- 1 credit = $0.01 USD
- New projects receive 100 free credits ($1.00)
- Minimum top-up: 500 credits ($5.00)
- Credits are deducted per action based on pricing config

## Wallet

Each cloud project has a wallet with:
- Current balance
- Free credit grant status
- Transaction history (grants, top-ups, usage, refunds)

## Pricing

### Actions

| Product | Action | Credits |
|---------|--------|---------|
| agent_browser | browser.check | 2 |
| agent_browser | browser.screenshot | 3 |
| agent_browser | browser.evidence | 3 |
| agent_browser | browser.trace_report | 5 |
| tera_context | context.capture | 2 |
| tera_context | context.summarize | 5 |
| talocode_reach | web.read | 2 |
| talocode_reach | search.query | 2 |
| talocode_reach | github.read | 2 |
| talocode_reach | rss.read | 1 |
| cliploop | brief.generate | 10 |
| cliploop | script.generate | 10 |
| cliploop | video.render | 150 |
| cliploop | campaign.package | 300 |
| signallane | signallane.x.analyze | 30 |
| signallane | signallane.x.content_plan | 40 |
| signallane | signallane.x.post_drafts | 40 |
| signallane | signallane.x.experiments | 30 |
| signallane | signallane.x.report | 60 |
| tradia | trade.import | 2 |
| tradia | performance.analyze | 15 |
| tradia | risk.report | 25 |
| tradia | behavior.report | 25 |
| codra | repo.summary | 10 |
| codra | task.small | 25 |
| codra | task.large | 100 |
| worklane | workflow.small | 10 |
| worklane | workflow.large | 25 |

### Pricing Catalog

The central pricing configuration is in `packages/config/src/pricing.ts`.

## API Key Authentication

- API keys are SHA-256 hashed before storage
- Only the prefix and hash are stored (never the raw key)
- Keys have `dev` or `live` mode
- Keys can be revoked
- Usage is tracked via `last_used_at` timestamp

## Credit Packs And Payment Events

Checkout accepts only `projectId` and a server-owned `packId`: `starter` (500), `builder` (1,000), `growth` (2,500), `scale` (5,000), `pro` (10,000), or `studio` (25,000) credits. Variant IDs are configured with `LEMONSQUEEZY_VARIANT_MAP`; callers cannot supply an amount, credits, or variant that affects the purchase.

A durable `stacklane.billing_purchases` row is written before a checkout is created. Checkout custom data contains only `purchase_id`, and fixed variants never use custom pricing.

The webhook verifies the raw HMAC before JSON parsing. The payment event is inserted and claimed inside the same transaction that locks the purchase, validates the configured store and variant, writes an immutable ledger entry, changes the wallet once, and marks the event processed. Duplicate event IDs are no-ops.

`order_refunded` debits credited wallet funds. A full refund debits all purchase credits. Partial refunds debit `floor(credits * cumulative_refunded_cents / purchase_amount_cents)` minus the prior cumulative allocation, making sequential partial refunds deterministic and preventing duplicate event debits. If a verified refund would overdraw the wallet, the wallet and credit ledger are unchanged; the payment event and one durable `refund_requires_review` liability record are committed for investigation instead.

`cloud_topups` is retained for historical reads only. New checkout or webhook code must not create or fulfill it. Legacy confirm endpoints return `410`.

## Two Payment Rails

Credits can be bought two ways, and both must quote the same pack at the same credits:

| Method | Rail | Notes |
|---|---|---|
| Card | provider checkout, fixed pack | `POST /api/v1/cloud/billing/topup` with `{ projectId, packId }` |
| $TCODE | on-chain transfer, verified then credited | `POST /api/v1/cloud/tcode/purchase/quote`, then `POST /api/v1/cloud/tcode/purchase` |

`GET /api/v1/cloud/billing/packs` returns the catalog with both methods per pack, including whether
each can actually complete, so a client never renders an option that cannot finish.

Pack values are defined once, in `credit-packs.mjs` on the deployed function and
`apps/api/src/services/payments/credit-packs.ts` here. Keep the two in step: a pack must never cost
different credits depending on the rail or the service that served the request.

The deployed function also still accepts a legacy `amount` on the fiat route for older clients.
That path is deprecated, and pack requests never use custom pricing.

## Rollback

Migration `0007_stacklane_billing_hardening.sql` is forward-only. Do not drop financial records to roll back an application release: stop new checkout creation, retain the tables and ledger for audit, and deploy a corrective forward migration if necessary.

## Usage Events

Every charge creates a usage event with:
- Product and action
- Credits charged
- Status (success, failed, rejected)
- Request ID for idempotency
- Metadata (model, provider, token estimates)

## APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/cloud/pricing` | GET | None | List pricing |
| `/api/v1/cloud/usage/charge` | POST | API Key | Charge credits |
| `/api/v1/cloud/projects` | GET/POST | Session | Manage projects |
| `/api/v1/cloud/projects/{id}/wallet` | GET | Session | Wallet balance |
| `/api/v1/cloud/projects/{id}/api-keys` | GET/POST | Session | API keys |
| `/api/v1/cloud/projects/{id}/usage` | GET | Session | Usage history |
| `/api/v1/cloud/projects/{id}/topups` | GET/POST | Session | Historical top-ups / fixed-pack checkout |
| `/api/v1/cloud/billing/topup` | POST | Session | Fixed-pack checkout (`projectId`, `packId`) |
| `/api/v1/cloud/billing/lemonsqueezy/webhook` | POST | Provider | Verified payment events |

## Demo Flow

### Prerequisites
- Stacklane API server running on `http://localhost:4000`
- Admin credentials (default: `admin@stacklane.local` / `stacklane-admin`)

### Step 1: Login and create a project
```bash
# Login (stores session cookie)
curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@stacklane.local","password":"stacklane-admin"}' \
  -c /tmp/demo-cookies.txt

# Create a project
curl -s -X POST http://localhost:4000/api/v1/cloud/projects \
  -H 'Content-Type: application/json' \
  -b /tmp/demo-cookies.txt \
  -d '{"name":"Demo Project","slug":"demo-project"}'
```

### Step 2: Check wallet (expect 100 free credits)
```bash
curl -s http://localhost:4000/api/v1/cloud/projects/PROJECT_ID/wallet \
  -b /tmp/demo-cookies.txt
```

### Step 3: Generate an API key
```bash
curl -s -X POST http://localhost:4000/api/v1/cloud/projects/PROJECT_ID/api-keys \
  -H 'Content-Type: application/json' \
  -b /tmp/demo-cookies.txt \
  -d '{"name":"Demo Key"}'
```

### Step 4: Charge credits (Agent Browser action)
```bash
curl -s -X POST http://localhost:4000/api/v1/cloud/usage/charge \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"product":"agent_browser","action":"browser.check","requestId":"demo-001"}'
```
Response: `200 {"ok":true,"remainingCredits":98}` (2 credits deducted)

### Step 5: View usage history
```bash
curl -s http://localhost:4000/api/v1/cloud/projects/PROJECT_ID/usage \
  -b /tmp/demo-cookies.txt
```

### Step 7: Test insufficient credits
```bash
# Drain wallet by charging until balance is too low
# Then attempt another charge
curl -s -X POST http://localhost:4000/api/v1/cloud/usage/charge \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"product":"agent_browser","action":"browser.check","requestId":"demo-insuff"}'
```
Response: `402 {"ok":false,"error":"insufficient_credits","required":2,"available":0}`

### Smoke tests
```bash
node scripts/smoke-cloud-billing.mjs
```
