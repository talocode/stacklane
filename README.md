# Stacklane

Stacklane is a lightweight backend/database/API layer for Talocode products.

## Earlier Versions

- v0.1.0: core API, access tokens, database connection storage, audit events, health endpoint
- v0.2.0: CLI, SDK, env generation, backup flow, token verification

## v0.4.0

Stacklane v0.4.0 is local-first.

- No external platform dependency
- No Supabase dependency
- No Resend dependency
- No billing yet
- API keys are hashed before storage
- Raw API keys are shown only once at creation
- File storage is local under `.stacklane/files/`

## Local Storage

- `.stacklane/customers.json`
- `.stacklane/api-keys.json`
- `.stacklane/usage-events.json`
- `.stacklane/assets.json`
- `.stacklane/files/`

## New v0.4.0 Primitives

- API customers
- API keys with `sk_lane_dev_...` and `sk_lane_live_...`
- Usage events and summaries
- Asset metadata records
- Local file persistence for hosted API workflows

## Docs

- `docs/API.md`
- `docs/SDK.md`
- `docs/CLI.md`
- `docs/STORAGE_AND_USAGE.md`
- `docs/SECURITY.md`
- `docs/TALOCODE_INTEGRATION.md`

## Status

Future adapters may support object storage, but v0.4.0 does not require cloud provisioning or any external platform.

## License

MIT
