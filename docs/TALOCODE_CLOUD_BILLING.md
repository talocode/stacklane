# Talocode Cloud Billing

Prepaid wallet billing system for Talocode Cloud services.

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
