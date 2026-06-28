# Talocode Cloud Billing v0.1

Prepaid wallet-based billing for Talocode Cloud APIs.

## Model

- **1 credit = $0.01 USD**
- **Free starting credits:** 100 credits ($1 value)
- **Minimum top-up:** $5 = 500 credits
- **Billing:** prepaid wallet (deduct before use)
- **Access:** `TALOCODE_API_KEY` (Authorization header)

## Products & Pricing

| Product | Action | Credits |
|---|---|---|
| Agent Browser | browser.check | 2 |
| Agent Browser | browser.screenshot | 3 |
| Agent Browser | browser.evidence | 3 |
| Agent Browser | browser.trace_report | 5 |
| Tera Context | context.capture | 2 |
| Tera Context | context.summarize | 5 |
| Talocode Reach | web.read | 2 |
| Talocode Reach | search.query | 2 |
| Talocode Reach | github.read | 2 |
| Talocode Reach | rss.read | 1 |
| Cliploop | brief.generate | 10 |
| Cliploop | script.generate | 10 |
| Cliploop | video.render | 150 |
| Cliploop | campaign.package | 300 |
| SignalLane | signal.detect | 3 |
| SignalLane | lead.score | 5 |
| SignalLane | followup.generate | 5 |
| Tradia | trade.import | 2 |
| Tradia | performance.analyze | 15 |
| Tradia | risk.report | 25 |
| Tradia | behavior.report | 25 |
| Codra | repo.summary | 10 |
| Codra | task.small | 25 |
| Codra | task.large | 100 |
| WorkLane | workflow.small | 10 |
| WorkLane | workflow.large | 25 |

## API Key Format

- **Development:** `tk_dev_<random>.<secret>`
- **Live:** `tk_live_<random>.<secret>`

Only the key hash and prefix are stored. The raw key is shown once at creation.

## Usage Charging

Every paid API request:

1. Authenticate via `Authorization: Bearer $TALOCODE_API_KEY`
2. Resolve product/action pricing
3. Check wallet balance
4. If insufficient: `402 { "error": "insufficient_credits", "required": N, "available": N }`
5. If sufficient: deduct atomically, record usage event, continue
6. Idempotency via `idempotencyKey` — repeated calls with the same key do not double-charge

## Example

```bash
curl https://api.talocode.xyz/v1/browser/check \
  -H "Authorization: Bearer $TALOCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Insufficient Credits Response

```json
{
  "error": "insufficient_credits",
  "required": 5,
  "available": 2
}
```

## Top-ups

Top-ups use **Stripe Embedded Checkout**. Customers enter payment details in an embedded form without leaving the site.

- **Minimum top-up:** $5 = 500 credits
- **Provider:** Stripe (production) or manual (development only)
- **API returns:** `clientSecret` + `publishableKey` for frontend to render Stripe Embedded Checkout
- **Webhook:** `POST /api/v1/cloud/billing/stripe/webhook` — verifies payment and credits wallet
- **Idempotent:** Duplicate webhooks do not double-credit

### Example top-up request

```bash
curl -X POST http://localhost:4000/api/v1/cloud/projects/{projectId}/topups \
  -H "Content-Type: application/json" \
  -H "Cookie: sl_session=..." \
  -d '{"amountUsd": 5, "provider": "stripe"}'
```

Response includes `stripe.clientSecret` — use it with Stripe's `<EmbeddedCheckout>` component.

See [STRIPE_TOPUPS.md](./STRIPE_TOPUPS.md) for full integration details.

## Security

- Raw API keys are never stored or logged
- Authorization headers are redacted from logs
- Usage events do not store sensitive request bodies
- No raw card numbers or CVV are ever accepted or stored
- Payment processing is PCI-compliant via Stripe
