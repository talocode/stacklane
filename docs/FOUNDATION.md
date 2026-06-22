# Foundation Implementation Notes (Phase 1)

## Scope Alignment
- Plan link: `docs/PLAN.md` -> Phase 1 MVP, recommended sequence items 1-4
- Architecture link: `docs/ARCHITECTURE.md` -> control plane + developer-facing plane foundation
- Why now: Stacklane needs a real control-plane base before provisioning/storage/functions layers.

## Implemented in This Slice
- Monorepo workspace and TypeScript tooling
- Control-plane Postgres schema with first migration
- API service skeleton with organizations/projects endpoints
- Dashboard skeleton with projects list/create flows
- Shared config/types packages for cross-app consistency

## Schema Assumptions
- `development` environment is created by default with `production` for each project.
- Organization context is manual in the dashboard for now.
- API key material is modeled as `hashed_key` only (no plaintext storage).
- Billing account starts as `manual` provider + `NGN` currency for local-friendly defaults.

## Explicit Non-Goals in This Slice
- No tenant data-plane provisioning
- No app end-user auth flows
- No storage/functions runtime
- No billing provider integration logic

## Rollout Notes
- Migration is forward-only (`0001_init_control_plane.sql`).
- Migration runner tracks checksums in `_stacklane_migrations`.
- For schema edits, add new migrations rather than editing `0001`.
