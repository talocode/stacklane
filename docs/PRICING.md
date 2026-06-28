# Talocode Cloud Pricing

## Credit Model

- **1 credit = $0.01 USD**
- **Free credits:** 100 credits ($1) per new project
- **Minimum top-up:** $5 (500 credits)
- **Billing:** prepaid wallet (pay before you use)

## Pricing Table

| Product | Action | Credits | USD |
|---|---|---|---|
| agent_browser | browser.check | 2 | $0.02 |
| agent_browser | browser.screenshot | 3 | $0.03 |
| agent_browser | browser.evidence | 3 | $0.03 |
| agent_browser | browser.trace_report | 5 | $0.05 |
| tera_context | context.capture | 2 | $0.02 |
| tera_context | context.summarize | 5 | $0.05 |
| talocode_reach | web.read | 2 | $0.02 |
| talocode_reach | search.query | 2 | $0.02 |
| talocode_reach | github.read | 2 | $0.02 |
| talocode_reach | rss.read | 1 | $0.01 |
| cliploop | brief.generate | 10 | $0.10 |
| cliploop | script.generate | 10 | $0.10 |
| cliploop | video.render | 150 | $1.50 |
| cliploop | campaign.package | 300 | $3.00 |
| signallane | signal.detect | 3 | $0.03 |
| signallane | lead.score | 5 | $0.05 |
| signallane | followup.generate | 5 | $0.05 |
| tradia | trade.import | 2 | $0.02 |
| tradia | performance.analyze | 15 | $0.15 |
| tradia | risk.report | 25 | $0.25 |
| tradia | behavior.report | 25 | $0.25 |
| codra | repo.summary | 10 | $0.10 |
| codra | task.small | 25 | $0.25 |
| codra | task.large | 100 | $1.00 |
| worklane | workflow.small | 10 | $0.10 |
| worklane | workflow.large | 25 | $0.25 |

## Wallet

- Each project has a wallet
- Credits are deducted before each paid API call
- Insufficient balance returns `402 Payment Required`

## Top-ups

- Minimum top-up: $5 (500 credits)
- Top-ups are prepaid and non-refundable
- Payment via **Stripe Embedded Checkout** — customers enter card details in an embedded form
- Manual/test top-ups available in development mode only
- Webhook verifies payment before crediting wallet
- Duplicate webhook events do not double-credit

## Pricing Endpoint

```
GET /api/v1/cloud/pricing
```

Returns the complete pricing catalog.

## Idempotency

Use `idempotencyKey` on charge requests to prevent double-charging on retries.
