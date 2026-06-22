# Stacklane

**Lightweight backend/database layer for builders and developers.**

Stacklane provides project management, access tokens, database connection storage, and audit logging — the core primitives you need to ship backend features without heavy infrastructure overhead.

## Quick Start

```bash
# Initialize
npx stacklane init

# Create a project
npx stacklane project create -n "My App"

# Generate access token
npx stacklane token create -n "api-key"

# Set database connection
npx stacklane db set -u "postgresql://..." -p "secret"

# Generate environment file
npx stacklane env generate
```

## v0.1.0 Features

- Project creation and management
- Access token generation, verification, and revocation
- Database connection storage
- Audit event logging
- Health endpoint
- JSON-only API responses

## v0.2.0 Features

- CLI (`stacklane`)
- TypeScript SDK (`@stacklane/sdk`)
- Environment file generator
- Local config backup
- Token verification

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/projects` | Create project |
| GET | `/v1/projects` | List projects |
| GET | `/v1/projects/:id` | Get project |
| POST | `/v1/projects/:id/database` | Set database connection |
| GET | `/v1/projects/:id/database` | Get database info |
| POST | `/v1/projects/:id/tokens` | Create access token |
| POST | `/v1/tokens/verify` | Verify access token |
| POST | `/v1/projects/:id/tokens/:tokenId/revoke` | Revoke token |
| GET | `/v1/projects/:id/audit` | List audit events |

## Security Model

- Access tokens are hashed before storage (SHA-256)
- Raw tokens shown only at creation time
- Database passwords stored as references, not in logs
- All API responses are JSON-only
- Audit events logged for all state changes

## Limitations (v0.2.0)

- No production multi-tenant auth
- No realtime subscriptions
- No file storage buckets
- No billing integration
- No automatic database provisioning
- No vector database

## License

MIT
