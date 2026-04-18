# Stacklane

**Ship your backend faster.**

Stacklane is a Nigeria-first, Africa-aware backend platform for developers who need to ship production software quickly without stitching five infrastructure products together.

## Overview
Stacklane provides the core backend primitives most products need:
- Managed Postgres
- Authentication
- File storage
- Serverless functions
- Background jobs
- Usage visibility
- Local-friendly billing hooks

The goal is not to clone an existing backend platform feature-for-feature. The goal is to remove the friction African developers face when using global tools that were not designed for their pricing reality, payment rails, support windows, or product constraints.

## The Problem
Developers can build fast locally, but backend production setup still slows them down:
- Too many infra decisions early
- Dollar-denominated pricing anxiety and poor budget predictability
- Card/payment failures and limited local payment support
- Support timelines that miss local business hours
- Feature-heavy platforms that are powerful but operationally overwhelming for small teams

## Why Stacklane Exists
Stacklane exists to become the default backend lane for developers in Nigeria and across Africa who want:
- Fast onboarding
- Clear production paths
- Trustworthy pricing and usage visibility
- Support context that matches local realities

## Who It Is For
- Solo indie hackers shipping MVPs
- Freelance developers shipping client products
- Agencies managing multiple small-to-medium projects
- Small startups needing reliable backend velocity without infra headcount

## Core Capabilities (MVP)
- Project creation and environment setup
- Managed Postgres instances per project
- Built-in authentication (email/password and token flows)
- Object storage for user/app files
- Function deployment and invocation
- Basic job/queue execution
- API key management
- Usage metering and billing integration hooks
- Logs for core platform actions

## Nigeria-First / Africa-Aware Wedge
Stacklane is opinionated about local developer constraints from day one:
- Cost and packaging designed for local purchasing power
- Billing integration paths that can support local rails and wallet-first behavior
- Support and docs optimized for regional developer contexts
- Product defaults that prioritize fast delivery over platform complexity

Global expansion is expected later, but Nigeria-first is the wedge and focus.

## MVP Scope
**In scope now:** backend fundamentals required to launch and run real products.

**Out of scope now:** advanced enterprise controls, deep multi-region orchestration, broad plugin ecosystems, and every “nice-to-have” parity feature.

## What Stacklane Is Not
- Not a Supabase clone
- Not a generic cloud provider
- Not a no-code builder
- Not a large enterprise platform in v1

Stacklane is a focused backend execution platform with local market fit at the center.

## High-Level Architecture
Stacklane uses a control plane + data plane + developer-facing plane model:
- Control plane: project lifecycle, provisioning orchestration, auth/admin metadata, metering, billing, audit logs
- Data plane: tenant Postgres instances, storage buckets, function runtime, queues
- Developer-facing plane: dashboard, CLI/API, docs, logs and usage views

See full architecture details in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Suggested Repository Structure
```text
stacklane/
├── apps/
│   ├── web/                  # Dashboard + marketing (Next.js)
│   ├── api/                  # Public API gateway / BFF
│   └── docs/                 # Developer docs site (optional later)
├── services/
│   ├── control-plane/        # Projects, provisioning, billing, usage, keys
│   ├── auth-service/         # Identity + token service
│   ├── storage-service/      # Object storage API layer
│   ├── functions-service/    # Deploy/run lifecycle for functions
│   └── jobs-service/         # Background tasks and queue workers
├── packages/
│   ├── sdk/                  # TypeScript SDK
│   ├── config/               # Shared configs (tsconfig/eslint)
│   ├── ui/                   # Shared dashboard components
│   └── types/                # Shared domain types/contracts
├── infra/
│   ├── docker/               # Local infra definitions
│   ├── terraform/            # Cloud infra (later stages)
│   └── migrations/           # Control-plane DB migrations
├── docs/
│   ├── PLAN.md
│   └── ARCHITECTURE.md
├── SKILL.md
└── AGENTS.md
```

## Local Development Philosophy
- Local-first, production-minded
- One-command bootstrapping wherever possible
- Deterministic dev environments through containers
- Explicit environment files and safe defaults
- Fast feedback loops for provisioning, auth, and function flows

## Documentation Map
- Product strategy and execution sequencing: [`docs/PLAN.md`](docs/PLAN.md)
- Technical architecture and system boundaries: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Contributor and coding-agent operating guide: [`SKILL.md`](SKILL.md)
- Strict autonomous agent behavior guide: [`AGENTS.md`](AGENTS.md)

## Build Principles
- MVP-first delivery discipline
- Opinionated defaults over configurable complexity
- Trust through transparent usage, logs, and billing behavior
- Security and data safety as non-negotiable foundations
- Architecture that can scale without rewriting everything

## Roadmap (Short)
1. MVP platform core: project lifecycle, Postgres, auth, storage, functions, metering hooks
2. DX expansion: CLI polish, templates, deeper logs, smoother onboarding
3. Differentiation and scale: realtime, vector features, multi-region resilience, advanced observability

## Contributing / Development Note
Read `docs/PLAN.md` and `docs/ARCHITECTURE.md` before writing implementation code. New code should map to a defined MVP scope item or an approved roadmap phase. Changes that expand scope must include explicit rationale and tradeoff analysis.

## Vision
Stacklane aims to become the trusted backend lane for developers building from Nigeria into Africa and beyond: simple to start, reliable in production, fair on cost, and focused on what helps teams ship real software faster.
