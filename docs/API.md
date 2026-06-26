# Stacklane API

All v0.4.0 endpoints return JSON only.

Legacy compatibility coverage retained from earlier Stacklane releases:

- `GET /health`
- `POST /v1/projects/:id/tokens`
- `POST /v1/tokens/verify`
- `POST /v1/projects/:id/tokens/:tokenId/revoke`

Auth header pattern:

```text
Authorization: Bearer sk_lane_live_...
```

## Health And Config

- `GET /v1/health`
- `GET /v1/config/status`

## Customers

- `POST /v1/customers`
- `GET /v1/customers`
- `GET /v1/customers/:id`
- `PATCH /v1/customers/:id`

## API Keys

- `POST /v1/api-keys`
- `GET /v1/api-keys`
- `POST /v1/api-keys/:id/revoke`
- `POST /v1/api-keys/verify`

Raw keys are returned only once on creation. Storage keeps only `keyHash` and `keyPrefix`.

## Usage

Authenticated with `Authorization: Bearer sk_lane_dev_...` or `x-api-key: sk_lane_live_...`.

- `POST /v1/usage/events`
- `GET /v1/usage/events`
- `GET /v1/usage/summary`

## Assets

Authenticated with an active API key.

- `POST /v1/assets`
- `GET /v1/assets`
- `GET /v1/assets/:id`
- `DELETE /v1/assets/:id`

`POST /v1/assets` accepts metadata-only requests or metadata plus `dataBase64` for local file persistence.

## Files

- `POST /v1/files`

## Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "product and filename are required."
  }
}
```

Missing or revoked API keys return JSON `401` errors. Stack traces are not exposed.
