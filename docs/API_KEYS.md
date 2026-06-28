# Talocode Cloud API Keys

## Format

```
tk_dev_<6-char-random>.<44-char-secret>
tk_live_<6-char-random>.<44-char-secret>
```

- `tk_dev_` prefix = development mode
- `tk_live_` prefix = production/live mode

## Storage

Only the following are persisted:

- `key_prefix` — the `tk_dev_xxx` or `tk_live_xxx` prefix (for identification)
- `key_hash` — SHA-256 hex digest of the full raw key

The raw key secret is returned once at creation and cannot be retrieved later.

## Endpoints

### Create API Key

```
POST /api/v1/cloud/projects/:projectId/api-keys
Authorization: <session cookie>
Content-Type: application/json

{
  "name": "My Key",
  "mode": "dev"
}
```

Response includes the `rawKey` — store it securely.

### List API Keys

```
GET /api/v1/cloud/projects/:projectId/api-keys
```

### Revoke API Key

```
POST /api/v1/cloud/api-keys/:keyId/revoke
```

## Usage

Pass the API key in the `Authorization` header:

```
Authorization: Bearer tk_dev_abc123.xyz456...
```

Or the `X-Api-Key` header:

```
X-Api-Key: tk_dev_abc123.xyz456...
```

## Security

- Keys are hashed with SHA-256 before storage
- Only the hash and prefix are saved to the database
- Raw keys are never logged or exposed in responses after creation
- Revoked keys are immediately rejected
