# Storage And Usage

Stacklane v0.4.1 is local-first.

## Storage Files

- `.stacklane/customers.json`
- `.stacklane/api-keys.json`
- `.stacklane/usage-events.json`
- `.stacklane/assets.json`
- `.stacklane/files/`

## Usage Summaries

Usage summaries return:

- total events
- total units
- grouped totals
- date range used

No billing or payment enforcement is included in v0.4.1.

## Runtime Entry Path

- `apps/api/src/server.ts` is the active HTTP runtime entrypoint.
- `apps/api/src/app.ts` remains as a compatibility shim for earlier tests and references.

## Runtime Test Coverage

`scripts/test-stacklane-v041-runtime.mjs` exercises the active HTTP server for:

- health and config status
- customers create/list/get/update
- API key create/list/verify/revoke
- usage event create/list/summary
- asset create/list/get/delete
- file upload path if implemented
