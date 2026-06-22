# Stacklane API

## Authentication

All endpoints (except `/health`) require an access token:

```
Authorization: Bearer sk_lane_live_...
```

Or:

```
x-api-key: sk_lane_live_...
```

## Endpoints

### Health Check

**GET** `/health`

```json
{ "status": "ok", "service": "stacklane-api", "timestamp": "...", "database": "up" }
```

### Create Project

**POST** `/v1/projects`

```json
{ "name": "My App", "organizationId": "org_xxx" }
```

### List Projects

**GET** `/v1/projects`

### Get Project

**GET** `/v1/projects/:id`

### Set Database Connection

**POST** `/v1/projects/:id/database`

```json
{ "databaseUrl": "postgresql://...", "password": "secret", "provider": "postgres" }
```

### Get Database Info

**GET** `/v1/projects/:id/database`

### Create Access Token

**POST** `/v1/projects/:id/tokens`

```json
{ "name": "api-key", "scopes": ["read", "write"] }
```

**Response includes `rawToken` — store it securely, it will not be shown again.**

### Verify Token

**POST** `/v1/tokens/verify`

```json
{ "token": "sk_lane_live_..." }
```

### Revoke Token

**POST** `/v1/projects/:id/tokens/:tokenId/revoke`

### List Audit Events

**GET** `/v1/projects/:id/audit?limit=50`

## Error Format

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

## Rate Limiting

Not implemented in v0.2.0. Add reverse proxy rate limiting in production.
