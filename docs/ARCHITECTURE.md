# Stacklane Architecture

## Architecture Goals
- Deliver backend primitives that are production-usable in MVP
- Optimize for shipping speed and operational clarity
- Maintain strict tenant isolation boundaries
- Keep architecture simple enough for a small team to operate
- Leave clear scaling paths without premature distributed complexity

## System Design Principles
- **Control-plane first:** all lifecycle operations go through a single source of truth
- **Idempotent provisioning:** retries must be safe
- **Explicit boundaries:** clear contracts between dashboard/API/services
- **Secure-by-default:** secrets, auth, and billing actions require strict handling
- **Observability from day one:** logs and audit trails are mandatory for trust
- **MVP discipline:** build the minimum reliable system, not theoretical final-state architecture

## Overall Platform Shape
Stacklane is split into three planes:

```text
+------------------------- Developer-Facing Plane -------------------------+
| Dashboard (Web) | Public API | CLI/SDK | Docs                           |
+-----------------------------------|-------------------------------------+
                                    v
+------------------------------ Control Plane -----------------------------+
| API Gateway/BFF | Project Service | Provisioner | Auth Control | Billing |
| Usage Metering  | Audit Logs      | Key Mgmt    | Config/Secrets           |
+-----------------------------------|-------------------------------------+
                                    v
+-------------------------------- Data Plane -----------------------------+
| Project Postgres | Object Storage | Functions Runtime | Queue Workers   |
| Runtime Logs     | Backup Jobs    | Infra Health Probes                |
+-------------------------------------------------------------------------+
```

## Recommended Monorepo Structure
```text
stacklane/
├── apps/
│   ├── web/                      # Next.js dashboard + marketing
│   └── api/                      # Public API gateway (TS service)
├── services/
│   ├── control-plane/            # Projects, environments, keys, quotas
│   ├── provisioning-service/     # Infra orchestration + lifecycle
│   ├── auth-service/             # User auth primitives + token issuance
│   ├── storage-service/          # Bucket/file operations, signed URLs
│   ├── functions-service/        # Deploy/build/invoke functions
│   ├── jobs-service/             # Queue workers and async task execution
│   ├── metering-service/         # Usage event ingestion + aggregation
│   └── billing-service/          # Plans, limits, payment hooks
├── packages/
│   ├── contracts/                # Shared API schemas (zod/openapi)
│   ├── sdk/                      # Client SDK
│   ├── observability/            # Logging/metrics helpers
│   └── config/                   # ESLint/TSConfig/shared defaults
├── infra/
│   ├── docker/                   # Local and early-stage deployments
│   ├── migrations/               # Control-plane DB migrations
│   └── scripts/                  # Provisioning and ops scripts
└── docs/
    ├── PLAN.md
    └── ARCHITECTURE.md
```

## Major System Components

### 1. Web Dashboard (`apps/web`)
Responsibilities:
- Project and environment management UI
- Auth, storage, function, usage, billing views
- Developer onboarding and quickstart surfaces

Notes:
- Next.js App Router
- Calls public API only; no direct data-plane access

### 2. Public API (`apps/api`)
Responsibilities:
- Single developer-facing API boundary
- AuthN/AuthZ enforcement
- Rate limiting and request validation
- Routes requests to internal services

Notes:
- TypeScript service
- OpenAPI contract generation

### 3. Auth Service
Responsibilities:
- User/project membership identity model
- Token issuance and validation
- Password and session flows
- Hooks for project-level auth primitives

### 4. Project Orchestration / Provisioning Service
Responsibilities:
- Create/update/delete project lifecycle workflows
- Provision DB/storage/function resources
- Ensure idempotent state transitions
- Record workflow events and failures

### 5. Database Management Layer
Responsibilities:
- Provision per-project Postgres instances or logical DBs
- Generate and rotate connection credentials
- Track health and storage utilization
- Trigger backup/recovery operations

### 6. Storage Service
Responsibilities:
- Bucket and object APIs
- Signed URL generation
- Access policy enforcement
- Usage metering for object operations and storage bytes

### 7. Functions Runtime / Deployment Service
Responsibilities:
- Build/deploy function artifacts
- Manage function versions and rollback pointers
- Route invocations and collect execution logs

### 8. Job/Queue System
Responsibilities:
- Handle async workloads (provisioning steps, cleanup, metering aggregation)
- Retry failed jobs with backoff
- Dead-letter queue for investigation

### 9. Usage Metering / Billing Service
Responsibilities:
- Ingest usage events from APIs and runtimes
- Aggregate usage per project/plan window
- Enforce quotas/limits
- Emit billing events for payment provider hooks

### 10. Logging / Audit Layer
Responsibilities:
- Centralized logs for control-plane and data-plane actions
- Immutable audit trail for sensitive actions
- Queryable logs in dashboard for developer trust

## Suggested Tech Stack (MVP)

### Core Choices
- **Next.js (TypeScript):** dashboard + marketing + strong DX
- **TypeScript across services:** consistent contracts and faster small-team velocity
- **Postgres (control plane):** durable metadata, workflows, billing events
- **Docker-based provisioning:** pragmatic early infra lifecycle and local reproducibility
- **Object storage:** S3-compatible backend (MinIO local, S3-compatible provider in cloud)
- **Redis:** queue broker, lightweight caching, rate-limit counters
- **Queue worker stack:** BullMQ or equivalent for deterministic job orchestration

### Service Boundary Guidance
- Start with modular services in one deployable cluster
- Enforce boundaries at code/package/API layers first
- Split into separately deployed services when scale or team structure justifies it

### Deployment Assumptions (Early Stage)
- Single primary region for MVP
- Container-based deployment on managed Kubernetes or VM cluster
- Managed Postgres for control plane
- Managed Redis and object storage when possible

## Plane Separation Details

### Control Plane
- Project metadata
- Environment configuration
- API keys and membership
- Quotas and billing state
- Provisioning state machine

### Data Plane
- Tenant Postgres workloads
- Object data and storage traffic
- Function runtime execution
- Async worker execution

### Developer-Facing Plane
- Dashboard UX
- Public API + SDK
- Documentation and onboarding flows

## Tenant / Project Model
- **Organization** owns one or more projects
- **Project** is the primary tenant boundary
- **Environment** belongs to project (`production` mandatory, `development` optional in MVP)
- Resource names and credentials are environment-scoped

Isolation requirements:
- Credential separation per project/environment
- API keys scoped by project and permission set
- No shared tenant data tables without strict scoping

## Environment Model
MVP model:
- `production` (default)
- `development` (optional, lower limits)

Later:
- preview branches / ephemeral environments

## Provisioning Lifecycle
1. Project created in control-plane DB (`status=provisioning`)
2. Provisioning workflow enqueues step jobs
3. DB resource created and validated
4. Storage bucket namespace created
5. Function runtime namespace prepared
6. API keys/secrets generated
7. Project marked `ready`

Failure handling:
- Step-level retries
- Compensating cleanup actions
- Terminal failure with operator-visible diagnostics

## Auth Model
- Platform user identity (dashboard/API access)
- Project auth configuration for app end-users
- JWT issuance with project-scoped claims
- Password hashing and secure session storage
- Refresh token rotation for long-lived sessions

## File Storage Model
- Bucket per project with prefixed object keys
- ACL/policy metadata enforced in storage-service layer
- Signed URL issuance for direct upload/download
- Object events sent to metering pipeline

## Function Deployment Model
- Upload artifact/source via API
- Build into runtime package (container/lambda-like unit)
- Store deployment metadata and version history
- Route traffic to latest stable version
- Capture invocation logs, latency, and failures

## Secrets / Config Model
- Encrypted secret storage in control plane
- Environment-scoped secret sets
- Secret access audited and restricted to authorized service paths
- No plaintext secret logging, ever

## Logs and Observability Model
MVP observability:
- Structured logs (`service`, `project_id`, `env`, `request_id`)
- Audit logs for sensitive operations (keys, billing, auth config)
- Basic metrics (request counts, error rates, queue backlog)

Later expansion:
- Distributed traces
- Per-function profiling
- Alert policies and SLO dashboards

## Metering and Billing Model
- Event-driven usage capture from API/storage/functions/db stats
- Aggregator computes periodic usage snapshots
- Quota checker enforces tier limits on write paths
- Billing service emits provider-facing events and status updates

Billing design rule:
- Usage calculation must be reproducible and explainable to users.

## Backup and Recovery
MVP:
- Scheduled control-plane DB backups
- Scheduled tenant DB backups with retention policy
- Recovery runbook tested in non-production before release

Later:
- Point-in-time recovery improvements
- Cross-region backup replication

## Abuse Prevention and Rate Limiting
- API key and token-level rate limiting
- Signup and auth endpoint throttling
- Storage upload caps by tier
- Function invocation concurrency limits by plan
- Basic anomaly detection flags for abuse operations

## Security Principles
- Least-privilege service credentials
- Encryption in transit and at rest
- Secret rotation support
- Auditability for high-risk mutations
- Strict input validation at public boundaries
- Secure defaults over opt-in hardening

## Compliance Awareness
Initial posture:
- Privacy and data handling discipline suitable for regional regulations
- Retention and deletion policies documented
- Consent-aware logging for sensitive user metadata

Later:
- Formal certifications and external audits as enterprise demand increases

## Reliability Approach
- Idempotent control-plane operations
- Retries with jittered backoff
- Circuit breakers around external dependencies
- Graceful degradation for non-critical features
- Clear incident runbooks for provisioning, auth, and billing paths

## Scaling Path: MVP -> Later
MVP:
- Single region, modular monolith + workers
- Shared observability stack
- Strong schema contracts and event logs

Phase 2:
- Service extraction where bottlenecks exist
- Better queue partitioning and workload isolation
- Enhanced metrics and alerting

Phase 3:
- Multi-region support
- Data-plane segmentation by geography
- Higher-availability controls and failover automation

## Sample Request Flows

### 1) Project Creation Flow
```text
Dashboard -> Public API -> Control Plane DB (create project record)
         -> Provisioning Queue -> Provisioning Service
         -> DB/Storage/Functions setup
         -> Control Plane DB (status=ready)
         -> Dashboard polls status -> ready
```

### 2) Auth Request Flow
```text
Client App -> Public API/Auth Service -> Validate credentials
           -> Issue JWT/refresh token
           -> Log auth event + meter request
           -> Return session tokens
```

### 3) File Upload Flow
```text
Client App -> Public API/Storage Service (request signed URL)
           -> AuthZ + policy checks
           -> Signed URL returned
           -> Client uploads directly to object storage
           -> Storage event -> metering/log pipeline
```

### 4) Function Deploy Flow
```text
Dashboard/CLI -> Public API -> Functions Service
              -> Build/package artifact
              -> Deploy runtime version
              -> Register endpoint + config
              -> Emit deployment logs/events
```

## Tradeoffs and Key Decisions
- **Modular monolith first:** faster team velocity, lower operational overhead
- **Single region first:** lower complexity, faster MVP delivery
- **S3-compatible abstraction:** portability across local and cloud storage
- **Queue-based provisioning:** resilience over synchronous orchestration
- **Control-plane Postgres:** strong consistency and simpler operations

## What to Fake/Simplify in MVP
- Simplified plan tiers and quota enforcement rules
- Limited auth providers (email/password first)
- Basic usage dashboards (daily aggregates instead of near-real-time analytics)
- Limited function runtime language support initially
- Minimal environment model (production + optional development)

## What Must Be Built Correctly From Day One
- Tenant isolation boundaries
- Provisioning idempotency and rollback behavior
- Auth token security and key management
- Usage event integrity for billing trust
- Audit logging for sensitive operations
- Backup and restore viability

## Current Repository Implementation Snapshot (April 2026)
Current code in this repository provides an MVP control-plane admin slice focused on organizations and projects.

Implemented in code:
- `apps/api` (Node HTTP server):
  - `GET/POST /organizations`
  - `GET /organizations/:idOrSlug`
  - `GET/POST /projects`
  - `GET /projects/:idOrSlug`
  - `PATCH /projects/:idOrSlug`
  - structured error responses and validation handling
- `apps/web` (Next.js):
  - Console-style shell and nav system
  - Wired organization/project pages using API client calls
  - Structured infrastructure area placeholders for deferred runtime services

Local persistence note:
- `apps/api/data/control-plane.json` is a development persistence mechanism for local iteration only.
- Production-grade control-plane persistence should migrate to Postgres with forward-only migrations.

## Control-Plane Persistence Baseline (Phase 1.1)
Stacklane now uses PostgreSQL as the control-plane persistence layer for local development and MVP API workflows.

### Implemented schema domains
- `users`
- `organizations`
- `organization_members`
- `projects`
- `environments`
- `api_keys` (scaffold)
- `billing_accounts` (scaffold)
- `audit_events`

### Migration model
- Forward-only SQL migrations in `apps/api/migrations`
- Migration runner script: `apps/api/scripts/migrate.mjs`
- Applied migration tracking table: `schema_migrations`

### Local infrastructure
- PostgreSQL via Docker Compose: `infra/docker/docker-compose.yml`
- API migrations + seed scripts provide first-run bootstrapping

### API layering
`apps/api/src` is organized into:
- `repositories/` (data-access queries)
- `services/` (response mapping)
- `bootstrap/` (initial seed-on-empty behavior)
- `server.ts` (HTTP routing + validation + orchestration)

This keeps boundaries simple while avoiding premature service extraction.

## Control-Plane Auth/Authorization Baseline (Phase 1.2)
Stacklane now enforces an operator authentication boundary for dashboard/API access.

### Auth/session model
- Operator login endpoint: `POST /auth/login`
- Session inspection endpoint: `GET /auth/me`
- Logout endpoint: `POST /auth/logout`
- Session transport: HTTP-only cookie (`sl_session`)
- Session storage: `control_plane_sessions` table stores only hashed session token
- Password storage: salted scrypt hash in `users.password_hash`

### Authorization model
- Membership-scoped access via `organization_members`
- Roles currently supported: `owner`, `admin`, `member`
- Organizations/projects/environments/api-keys/events are filtered/enforced by current user membership

### API key lifecycle model
- API keys are project-scoped
- Raw key secret is generated once and returned only at creation
- Database stores key hash + prefix, never raw secret
- Revoke operation marks key status + revoked timestamp

### Audit coverage baseline
Audit events include actor and metadata for:
- auth login/logout
- organization create
- project create/update
- environment create/update
- api key create/revoke

## Provisioning Orchestration Baseline (Phase 1.3)
Stacklane now includes a first real control-plane provisioning orchestration layer.

### Domain model
- `regions`: controlled region catalog for deployment targets.
- `provisioning_tasks`: lifecycle unit for a project provisioning request.
- `provisioning_attempts`: per-task attempt history and diagnostics.
- `project_runtime_bindings`: recorded runtime references for provisioned project resources.

### Lifecycle model
Current task statuses:
- `queued`
- `running`
- `retrying`
- `ready`
- `failed`

### Execution model
- Request API writes a provisioning task.
- In-process worker loop polls runnable tasks.
- Orchestrator transitions state and records attempts.
- Adapter boundary executes provisioning steps.
- Mock adapter simulates allocation for:
  - database reference
  - storage reference
  - auth namespace reference
  - functions namespace reference

### Adapter boundary
Provisioning logic is separated from execution via `ProvisioningAdapter` interface. The current implementation uses `MockProvisioningAdapter`, allowing future replacement with real runtime adapters without rewriting orchestration flow.

### API surface
- `POST /projects/:idOrSlug/provision`
- `GET /projects/:idOrSlug/provisioning`
- `GET /projects/:idOrSlug/provisioning/tasks`
- `POST /projects/:idOrSlug/provisioning/retry`
- `GET /regions`

### Audit coverage
Provisioning-related events emitted:
- `provisioning.requested`
- `provisioning.started`
- `provisioning.succeeded`
- `provisioning.failed`
- `provisioning.retried`

## Control-Plane Hardening Notes (Phase 1.4)

### Permission model
A centralized policy layer (`policy.ts`) enforces owner/admin/member behavior for mutating actions.
- owner/admin: provisioning triggers/retries, API key lifecycle mutations, environment mutations, project update
- member: scoped read-only surfaces

### Worker safety + scheduling
Provisioning tasks now carry scheduling and lease metadata:
- `next_run_at`
- `claimed_by`
- `claimed_at`
- `claim_expires_at`
- `last_heartbeat_at`
- `last_transition_at`

Worker execution model:
- claims runnable tasks via DB update lease
- executes only tasks whose schedule is due
- records transition timestamps and attempt diagnostics
- applies stepped retry backoff before retrying

### Operations visibility
Organization-level operations API and page expose project provisioning fleet view with status, region, error context, and last update timestamps.

### Test strategy
Current test baseline focuses on correctness-critical control-plane semantics:
- policy matrix checks
- provisioning transition validity
- retry backoff behavior
- response contract checks for scheduling/lease metadata
