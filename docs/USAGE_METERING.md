# Talocode Cloud Usage Metering

## Overview

Every paid API request generates a usage event with product, action, credits consumed, and status.

## Usage Events

Events are recorded with the following fields:

| Field | Description |
|---|---|
| project_id | The Talocode Cloud project |
| api_key_id | The API key used |
| product | Product name (e.g., agent_browser) |
| action | Action name (e.g., browser.check) |
| credits | Credits charged |
| status | success / failed / rejected |
| request_id | Optional client-provided request ID |
| idempotency_key | Optional idempotency key |
| metadata | Additional context |

## Charge Endpoint

```
POST /api/v1/cloud/usage/charge
Authorization: Bearer $TALOCODE_API_KEY
Content-Type: application/json

{
  "product": "agent_browser",
  "action": "browser.check",
  "requestId": "req-abc-123",
  "idempotencyKey": "idem-xyz-456"
}
```

Successful response:

```json
{
  "ok": true,
  "event": {
    "id": "cevt_...",
    "projectId": "...",
    "product": "agent_browser",
    "action": "browser.check",
    "credits": 2,
    "status": "success",
    "idempotencyKey": "idem-xyz-456"
  },
  "remainingCredits": 98
}
```

Insufficient balance response (402):

```json
{
  "ok": false,
  "error": "insufficient_credits",
  "required": 5,
  "available": 2
}
```

## Idempotency

Pass an `idempotencyKey` to make the charge endpoint idempotent. If the same key is used again, the original result is returned without deducting credits again.

## Usage Summary

```
GET /api/v1/cloud/projects/:projectId/usage/summary?from=ISO&to=ISO
```

Returns total credits used, total requests, and rejected count.

## Usage Events List

```
GET /api/v1/cloud/projects/:projectId/usage?product=&action=&from=&to=
```

## Wallet Endpoint

```
GET /api/v1/cloud/projects/:projectId/wallet
```

Returns balance and recent transactions.

## Security

- Usage events do not store sensitive request bodies
- Authorization headers are redacted from logs
- Usage events are immutable once written
