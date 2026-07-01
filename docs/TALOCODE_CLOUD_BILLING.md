# Talocode Cloud Billing

Prepaid wallet billing system for Talocode Cloud services.

> **Base URL:** `https://api.talocode.site` (set `TALOCODE_BASE_URL` env var to override; defaults to `http://localhost:4000` in development).

## Credits

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
| signallane | signal.detect | 3 |
| signallane | lead.score | 5 |
| signallane | followup.generate | 5 |
| tradia | trade.import | 2 |
| tradia | performance.analyze | 15 |
| tradia | risk.report | 25 |
| tradia | behavior.report | 25 |
| codra | repo.summary | 10 |
| codra | task.small | 25 |
| codra | task.large | 100 |
| worklane | workflow.small | 10 |
| worklane | workflow.large | 25 |
| talocode_router | chat.fast | 2 |
| talocode_router | chat.auto | 3 |
| talocode_router | chat.coding | 5 |
| talocode_router | compression.logs | 1 |
| talocode_router | compression.diff | 1 |
| talocode_router | compression.trace | 2 |

### Pricing Catalog

The central pricing configuration is in `packages/config/src/pricing.ts`.

## API Key Authentication

- API keys are SHA-256 hashed before storage
- Only the prefix and hash are stored (never the raw key)
- Keys have `dev` or `live` mode
- Keys can be revoked
- Usage is tracked via `last_used_at` timestamp

## Top-ups

- Stripe Embedded Checkout for credit card payments
- Manual top-ups available in development
- Webhook-based confirmation for Stripe payments
- Idempotent: repeated webhook events don't double-credit

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
| `/api/v1/cloud/projects/{id}/topups` | GET/POST | Session | Top-ups |
| `/api/v1/cloud/billing/stripe/webhook` | POST | Stripe | Stripe events |

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

### Step 5: Router chat completion
```bash
curl -s -X POST http://localhost:4000/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"talocode/auto","messages":[{"role":"user","content":"Hello"}]}'
```
Response: OpenAI-compatible response with `provider` field indicating which provider served the request. Credits pre-charged before provider call, delta-charged after response.

### Step 6: View usage history
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
# Billing smoke test (9 checks)
node scripts/smoke-cloud-billing.mjs

# Router smoke test (15 checks)
node scripts/smoke-cloud-router.mjs
```
