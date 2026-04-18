# Stacklane Contributor Skill Guide

## What Stacklane Is
Stacklane is a Nigeria-first, Africa-aware backend platform that helps developers ship production backends faster through managed Postgres, auth, storage, functions, jobs, usage visibility, and local-friendly billing integration.

## Repository Goal
This repository is the implementation and decision hub for Stacklane's MVP and staged expansion. Every change should move the platform toward reliable, trustable backend execution for small teams.

## Product Boundaries
- Build core backend primitives that are practical in production
- Prioritize small-team usability and operational clarity
- Do not chase broad feature parity with larger platforms

## MVP-First Policy
Before starting any work, map it to `docs/PLAN.md`:
- If it is in MVP scope, proceed
- If it is post-MVP but high leverage, mark as deferred unless explicitly approved
- If it is outside roadmap direction, reject or rewrite to fit MVP

## Preferred Engineering Philosophy
- Simple, explicit implementations over abstract frameworks
- Correctness in critical paths over feature breadth
- Fast iteration with clear contracts
- Boring, proven technologies where possible

## Documentation-First Workflow
1. Read relevant sections in `docs/PLAN.md` and `docs/ARCHITECTURE.md`
2. State the scope item being implemented
3. Implement code and tests
4. Update docs when behavior, interfaces, or operational expectations change

## Rules for Making Changes
- Keep PRs/task units focused on one logical outcome
- Preserve backward compatibility for public APIs unless explicitly changing contracts
- Add or update migrations for schema changes
- Add rollout notes when touching production-sensitive paths

## How to Propose Changes
Every proposal should include:
- Problem statement
- Scope classification (`mvp`, `phase-2`, `phase-3`, `out-of-scope`)
- Affected components
- Risks and rollback plan
- Test and observability plan

## Coding Style Expectations
- TypeScript-first where practical
- Clear naming: prefer domain-specific terms (`projectProvisioningJob`) over generic names (`handler2`)
- Small modules with clear ownership
- Minimize hidden side effects
- Structured logging fields, not string-only logs

## Architecture Guardrails
- Respect control plane vs data plane boundaries
- Public API is the only external integration boundary
- Provisioning flows must be idempotent
- Async workflows must have retry and failure visibility
- Never bypass service boundaries for convenience

## Security Guardrails
- Validate and authorize all external inputs
- Never log secrets or tokens
- Encrypt sensitive data at rest and in transit
- Follow least-privilege credentials between services
- Require audit logs for sensitive operations (auth config, keys, billing, provisioning actions)

## Billing/Auth/Data Safety Guardrails
- Billing calculations must be reproducible and explainable
- Metering events must be durable and traceable
- Auth token issuance and verification paths need tests for expiry, revocation, and scope
- Tenant data isolation is non-negotiable

## What Not to Build Prematurely
- Complex plugin systems
- Multi-region orchestration
- Advanced policy engines for enterprise use cases
- Broad language/runtime support for functions beyond approved scope
- Deep realtime/vector features before MVP adoption evidence

## Keeping Implementation Aligned
For every significant code change, include a short alignment note:
- `Plan link:` section in `docs/PLAN.md`
- `Architecture link:` section in `docs/ARCHITECTURE.md`
- `Why now:` why this is needed in current phase

## Expectations for Tests, Docs, Migrations, Rollout Notes
- Tests:
  - Unit tests for business logic
  - Integration tests for critical flows (project creation, auth, billing events)
- Docs:
  - Update API contracts and behavior notes
- Migrations:
  - Forward-only, reviewed, with rollback strategy documented
- Rollout notes:
  - Required for changes touching auth, billing, provisioning, storage

## Naming and Folder Structure Expectations
- Folder names reflect domain boundaries, not technical layers alone
- Shared contracts in `packages/contracts`
- Service-specific logic stays in service directories
- Avoid dumping cross-domain utilities in generic `utils` without ownership

## Avoid Unnecessary Abstraction
- Do not introduce abstraction before at least two concrete use cases exist
- Prefer direct, readable code in MVP
- Keep interface surfaces minimal and stable

## TODOs and Follow-Up Notes
When leaving a TODO:
- Include reason and constraint
- Include owner or expected follow-up role
- Include intended phase (`phase-1`, `phase-2`, `phase-3`)

Bad TODO:
- `TODO: improve later`

Good TODO:
- `TODO(phase-2, metering): move from hourly aggregation to near-real-time stream processor after >5k active projects.`
