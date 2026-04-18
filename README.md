# Stacklane

Stacklane is a Nigeria-first, Africa-aware backend platform focused on helping teams ship production backends quickly with a reliable control plane.

## Current MVP Control-Plane Implementation
Stacklane currently runs as two apps:

- `apps/api` — TypeScript control-plane API backed by PostgreSQL
- `apps/web` — Next.js operator console

Implemented now:
- operator auth/session boundary (email/password login, session cookie, logout, current-user)
- organization/project membership-scoped access
- organizations, projects, environments, API keys, audit events
- provisioning orchestration foundation:
  - async provisioning tasks and attempts
  - retry/failure modeling
  - region catalog
  - runtime binding records
  - mock provisioning adapter + in-process worker loop
- forward-only Postgres migrations + seed/bootstrap flow

## Provisioning model (current phase)
Provisioning lifecycle states:
- `queued`
- `running`
- `retrying`
- `ready`
- `failed`

Key runtime tables:
- `provisioning_tasks`
- `provisioning_attempts`
- `project_runtime_bindings`
- `regions`

Provisioning endpoints:
- `POST /projects/:idOrSlug/provision`
- `GET /projects/:idOrSlug/provisioning`
- `GET /projects/:idOrSlug/provisioning/tasks`
- `POST /projects/:idOrSlug/provisioning/retry`
- `GET /regions`

## Security model (current)
- Control-plane only auth (not app end-user auth)
- Passwords are hashed (scrypt)
- Session cookie (`sl_session`) stores opaque token; DB stores only token hash
- API keys store only hashed secret; raw secret is returned once at key creation

## Local development
### 1) Start Postgres
```bash
cd infra/docker
docker compose up -d
```

### 2) Prepare API
```bash
cd apps/api
cp .env.example .env
npm install
DATABASE_URL=postgres://stacklane:stacklane@localhost:5432/stacklane npm run migrate
DATABASE_URL=postgres://stacklane:stacklane@localhost:5432/stacklane npm run seed
```

### 3) Start API (includes provisioning worker loop)
```bash
cd apps/api
DATABASE_URL=postgres://stacklane:stacklane@localhost:5432/stacklane WEB_ORIGIN=http://localhost:3000 npm run dev
```

### 4) Start web
```bash
cd apps/web
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 npm run dev
```

Open `http://localhost:3000/signin` and sign in with seeded operator account:
- email: `admin@stacklane.local`
- password: `stacklane-admin`

## What is intentionally deferred
- real managed Postgres clusters / storage runtime / function runtime
- end-user auth for apps built on Stacklane
- billing provider integration
- advanced RBAC, SSO, MFA
- distributed queue infrastructure beyond current in-process worker baseline

## Control-plane role policy
Current roles: `owner`, `admin`, `member`.

Mutation policy baseline:
- `owner` / `admin`: project provisioning trigger/retry, API key create/revoke, environment create/update, project update
- `member`: read-only access to scoped organizations/projects and operational status surfaces

Policy logic is centralized in `apps/api/src/policy.ts` and enforced at API route boundaries.

## Provisioning retry + worker safety model
- Retry scheduling uses `next_run_at` with stepped backoff.
- Worker claims tasks with lease metadata (`claimed_by`, `claim_expires_at`) to reduce duplicate processing risk.
- Worker only picks runnable tasks where `next_run_at <= now()` and lease is free/expired.
- Failed tasks become terminal (`failed`) after `max_attempts`; manual retry endpoint is required to requeue.

## Tests
API test harness currently includes deterministic tests for:
- policy and permission matrix
- provisioning state transition rules
- retry backoff behavior
- provisioning formatter scheduling/lease contract

Run API tests:
```bash
cd apps/api
npm install
npm run test
```
