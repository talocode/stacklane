# Stacklane Product Plan

## Executive Summary
Stacklane is a backend platform for African developers who need to ship quickly without platform overload or pricing friction. The initial wedge is Nigeria-first: reduce time-to-production while aligning billing, support, and product defaults to local realities.

MVP focus is strict: managed Postgres, auth, storage, functions, dashboard, API keys, logs, usage metering basics, and billing hooks. Stacklane wins by being faster to adopt, clearer to operate, and more predictable for small teams than broad global alternatives.

## Product Vision
Be the most trusted backend execution platform for developers building from Nigeria into Africa and eventually global markets.

## Mission
Help developers ship backend infrastructure faster with fewer decisions, clearer production paths, and local-aware operational support.

## Problem Statement
The backend stack is still a bottleneck for small engineering teams. Existing platforms solve many technical problems but often miss operational realities for African developers:
- Dollar pricing can be volatile and psychologically blocking for early-stage builders
- Card/payment acceptance is inconsistent across local banks and cards
- Support windows and context are often misaligned with local working hours
- Platform complexity creates cognitive load that slows shipping

Developers are forced to spend time managing infrastructure choices rather than shipping product value.

## Why Now
- Startup and indie software activity in Nigeria and Africa continues growing
- More teams are building internet products but still operate with lean budgets
- AI-assisted development accelerates app scaffolding, increasing demand for backend primitives that are quick to activate
- There is room for a region-aware product with global-level engineering discipline

## Market Wedge
Stacklane is not winning by feature-count parity. It wins by execution fit:
- Local-friendly billing and packaging
- Simpler defaults for small teams
- Strong reliability on core backend primitives
- Regional trust and support responsiveness

## Why Not Just Use Supabase / Firebase / Appwrite?
These are strong products, but Stacklane addresses gaps that matter for the target user base:
- **Economic fit:** pricing and packaging can be better tuned for local budgets
- **Payment fit:** local rail and card realities need first-class treatment, not workarounds
- **Operational fit:** support expectations and response cadence can align with local timezones
- **Complexity fit:** Stacklane can optimize for the 80% use case without early enterprise complexity

Stacklane does not claim those tools are bad; it claims there is a high-value segment they are not optimized to serve.

## Target Users
### Solo Indie Hackers
Need fast setup, low cost variance, and straightforward docs to launch quickly.

### Freelance Developers
Need repeatable backend setup for client projects with minimal ops burden.

### Agencies
Need project isolation, predictable operations, and easier handoff between team members.

### Small Startups
Need production reliability and clear upgrade paths without hiring platform engineers too early.

## Top User Pain Points
- Dollar pricing friction and FX uncertainty
- Card/payment friction during upgrades
- Support and timezone mismatch
- Complexity overload from broad platform surfaces
- Slow shipping due to setup and infra decisions

## Product Thesis
If Stacklane provides opinionated, reliable backend primitives with local-aware economic and operational fit, small teams in Nigeria and Africa will choose it over broader platforms because they can ship faster with less risk.

## Core Principles
- **Fast to start:** reduce setup decisions and time-to-first-deploy
- **Simple defaults:** sensible baseline behavior, optional complexity later
- **Local-friendly billing:** clear usage visibility and practical billing hooks
- **Developer trust:** predictable behavior, transparent logs, minimal surprises
- **Production path clarity:** explicit progression from MVP to scale

## MVP Definition
MVP is the minimum platform that can run real production workloads for small products:
- Create project
- Provision database
- Enable auth
- Store files
- Deploy and invoke functions
- Observe core logs and usage
- Upgrade plan through billing hooks

MVP should support real products, not demos.

## Non-Goals for MVP
- Full Supabase/Firebase feature parity
- Complex multi-region orchestration
- Advanced branching environments
- Enterprise SSO, RBAC matrices, and policy engines
- Deep realtime systems beyond essential needs
- AI-native workflow orchestration platform

## Detailed MVP Feature List
### 1. Managed Postgres
- Project-scoped Postgres instance provisioning
- Connection string management
- Basic backup schedule defaults
- Health status visibility

### 2. Authentication
- Email/password auth
- Session and token issuance
- User management endpoints
- Basic role model (owner/member)

### 3. Storage
- Project buckets
- Signed upload/download URLs
- Basic access controls integrated with auth

### 4. Functions
- Deploy HTTP-triggered functions
- Versioned deployment artifacts
- Invocation logs and failure visibility

### 5. Project Dashboard
- Project creation
- Environment view (MVP: production + optional development)
- Service status summary

### 6. API Keys
- Create/revoke project API keys
- Key scopes for core APIs
- Last-used timestamp

### 7. Logs
- Basic logs for auth, function invocation, storage operations, provisioning events
- Search/filter by service and time

### 8. Basic Usage Metering
- Request counts
- Function invocations
- Storage usage snapshots
- Database size tracking

### 9. Billing Hooks
- Plan tiers and limits
- Usage-to-billing event pipeline
- Local payment rail integration surface (hook-based in MVP)

## Nice-to-Have Later Features
- Realtime data subscriptions
- Vector support and embeddings storage
- Environment/database branching
- Expanded observability (traces, advanced metrics)
- AI workflow orchestration primitives
- Multi-region deployment and failover

## User Journeys
### Create Project
1. User signs up and lands on dashboard
2. User creates project with region and plan
3. Control plane creates project metadata and triggers provisioning
4. User sees project-ready status and starter credentials

### Provision Database
1. Provisioning service requests DB allocation
2. Credentials generated and stored securely
3. Health checks run
4. Connection details exposed in dashboard/API

### Set Up Auth
1. User enables auth in project settings
2. Auth defaults initialized
3. SDK/API endpoints become active
4. User integrates sign-up/sign-in in app

### Upload Files
1. User creates bucket and access policy
2. Client requests signed upload URL
3. File uploaded to storage backend
4. Metadata and usage events recorded

### Deploy Function
1. User uploads function artifact/source
2. Functions service builds/deploys runtime unit
3. Endpoint issued with auth requirements
4. Invocation logs available in dashboard

### Inspect Usage
1. Metering service aggregates usage by project
2. Dashboard shows current cycle usage vs limits
3. User receives threshold warning when near limits

### Upgrade Billing
1. User selects higher tier
2. Billing hook initiates payment flow
3. Successful payment updates plan and quotas
4. New limits applied without service interruption

## Go-to-Market Thinking
- Start with developer communities in Nigeria and selected African tech hubs
- Drive adoption through fast onboarding and transparent pricing communication
- Publish practical templates: SaaS starter, marketplace starter, API product starter
- Focus on case studies showing faster shipping and lower friction

## Pricing Direction (Principles)
- Clear entry tier for hobby and early MVP teams
- Predictable paid tiers with visible limits
- Transparent overage behavior
- Support local payment methods and smoother upgrade paths
- Avoid hidden infra fees that break trust

## Risks and Constraints
- Infrastructure reliability expectations are high even at MVP stage
- Billing and payment complexity may slow rollout
- Provisioning orchestration can become operationally fragile if rushed
- Abuse/fraud risk for auth, storage, and functions surfaces
- Competing products have deeper feature sets and stronger brand recognition

## Success Metrics
- Time-to-first-project-ready (target: <10 minutes)
- Time-to-first-auth-integration (target: <30 minutes)
- Week-4 active project retention
- Upgrade conversion from free to paid tiers
- Support response-time satisfaction in target timezone
- Monthly shipped projects per active team

## Phased Roadmap
### Phase 1: MVP
- Core primitives online and usable in production
- Basic billing hooks and metering visibility
- Docs and templates for common use cases

### Phase 2: Developer Experience Expansion
- CLI improvements and local tooling
- Better diagnostics and deeper logs
- Expanded auth and storage policies
- Starter kits and migration guides from common stacks

### Phase 3: Scale and Differentiation
- Multi-region strategy
- Advanced observability and reliability controls
- Realtime/vector capabilities where demand is proven
- Strong ecosystem and partner integrations

## Recommended Initial Execution Sequence
1. Define control-plane schema and project lifecycle contracts
2. Build project provisioning orchestration with idempotent workflows
3. Deliver managed Postgres provisioning and credential lifecycle
4. Ship auth service and API key management
5. Ship storage service with signed URL flows
6. Ship functions deployment/invocation MVP
7. Add logs pipeline and usage metering base events
8. Integrate billing hooks and plan enforcement
9. Harden reliability/security and finalize developer onboarding docs

## Open Questions and Assumptions
### Open Questions
- Which local payment providers should be first-class in Phase 1.5?
- Should MVP launch with one region only or two for resilience?
- What level of function runtime isolation is acceptable for early workloads?
- How strict should plan limits be enforced initially to reduce support friction?

### Assumptions
- Initial users value fast shipping over broad feature depth
- Single-region MVP is acceptable if reliability and backups are clear
- TypeScript-heavy stack improves team velocity and maintainability
- Local-aware billing support is a decisive adoption factor
