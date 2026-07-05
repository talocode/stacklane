# Stacklane Agent Operating Manual

## Repo Mission
Build a focused, trustworthy backend platform that helps developers in Nigeria and Africa ship faster with managed backend primitives and local-aware product decisions.

## Source-of-Truth Docs
- Product strategy: `docs/PLAN.md`
- Technical boundaries: `docs/ARCHITECTURE.md`
- Contributor guardrails: `SKILL.md`
- Repository overview: `README.md`

If there is conflict, resolve in this order:
1. `docs/PLAN.md`
2. `docs/ARCHITECTURE.md`
3. `SKILL.md`
4. `README.md`

## Mandatory Reading Order Before Coding
1. `README.md`
2. `docs/PLAN.md`
3. `docs/ARCHITECTURE.md`
4. `SKILL.md`

Do not write implementation code before reviewing all four.

## Operating Rules
- Tie every task to a specific scope item and phase
- Deliver concrete, runnable increments
- Prefer deterministic and testable changes over cleverness
- Keep commit/task scope narrow and reviewable

## Scope Discipline
- Reject work that does not map to MVP or approved phase roadmap
- If asked for out-of-scope features, provide a scoped alternative aligned to the current phase
- Do not silently expand requirements

## MVP Discipline
- MVP is a production-capable core, not a prototype demo
- Implement only what is needed for core journeys to work end-to-end
- Defer advanced variants unless explicitly approved

## Never Break Core Product Thesis
Never optimize for feature parity over local fit and shipping speed.

Prioritize:
- Fast onboarding
- Clear usage and billing behavior
- Reliable core backend operations
- Low-complexity developer workflows

## Prefer Concrete Deliverables
Good output:
- Working endpoint + tests + migration + docs update

Bad output:
- Vague design notes with no implementation path

## Handling Uncertainty
When uncertain:
1. State assumptions explicitly
2. Choose the smallest safe implementation
3. Add clear follow-up notes with phase tagging
4. Escalate only when decision risk affects security, billing, auth, or data integrity

## Reporting Work
Every implementation report must include:
- Scope item and phase
- Files changed
- Migrations added/modified
- Tests run and results
- Risks/limitations
- Follow-up items

## Staging Implementation
Use this order unless task dictates otherwise:
1. Contracts/schema
2. Core logic
3. Integration wiring
4. Tests
5. Docs and rollout notes

## Avoid Overengineering
- No abstract framework layers without immediate need
- No speculative extension points
- No premature multi-region or enterprise controls
- No broad refactors without clear MVP impact

## Required Output Format for Implementation Tasks
Use this exact section order in completion notes:
1. `Scope`
2. `Changes`
3. `Migrations`
4. `Tests`
5. `Risks`
6. `Follow-ups`

## Migration Rules
- Forward-only migrations
- Include data safety checks for destructive operations
- Document rollback approach in task notes
- Validate against representative seed/state when possible

## Rules for Sensitive Areas

### Auth
- Must include token/session validation tests
- Must include misuse/abuse edge case handling
- Must log security-relevant events without leaking secrets

### Billing
- Must preserve reproducibility of usage-to-charge mapping
- Must include idempotency for webhook/event processing
- Must include explicit failure handling and retry strategy

### Provisioning
- Must be idempotent and observable by state transitions
- Must support retries and partial-failure diagnostics
- Must not leave hidden orphan resources

### Storage
- Must enforce tenant and policy boundaries
- Must meter usage events
- Must prevent unauthorized object access paths

## Rules for Updating Docs After Code Changes
Update docs in the same change when behavior or contracts shift:
- API or schema changes -> update architecture/contracts docs
- Scope/roadmap implications -> update `docs/PLAN.md`
- Operational behavior changes -> update README and runbooks if present

## Definition of Done
A task is done only when:
- Functionality works end-to-end for the scoped outcome
- Tests cover critical behavior and edge cases
- Migrations are safe and documented
- Logs/metrics/audit behavior is adequate for supportability
- Docs reflect actual behavior
- No scope creep introduced

## Talocode Domains

| Domain | Purpose |
|--------|---------|
| [talocode.site](https://talocode.site) | Main site / homepage |
| [docs.talocode.site](https://docs.talocode.site) | Documentation |
| [api.talocode.site](https://api.talocode.site) | API endpoint |
| [cloud.talocode.site](https://cloud.talocode.site) | Cloud dashboard |
| [stacklane.talocode.site](https://stacklane.talocode.site) | Stacklane platform |
| [dashboard.talocode.site](https://dashboard.talocode.site) | Dashboard |

## Good vs Bad Agent Behavior

### Good
- Implements project provisioning retry logic with tests and state transition logs
- Adds usage metering event schema and updates billing docs
- Defers realtime subscriptions with explicit phase-2 note

### Bad
- Adds unrequested multi-region abstractions in MVP
- Touches auth or billing without tests
- Introduces generic framework layers with no immediate use
- Ships code changes without updating docs or migration notes
