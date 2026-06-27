# Changelog

## 0.4.1 (MCP)

- added `@stacklane/mcp` package: open-source MCP server for Stacklane v0.4.1
- stdio transport for local agent clients (Codex, Claude Code, OpenCode, Cursor)
- 17 MCP tools: health, config, customers, API keys, usage, assets
- strict input schemas; raw API key returned only from `stacklane_create_api_key`
- key hashes never returned by list/revoke/verify tools
- asset tools reject unsafe filenames and path traversal
- secrets redacted from errors; no stack traces exposed
- local-first only; no Supabase, no Resend, no cloud provisioning, no billing
- added `docs/MCP.md`, `examples/mcp/*`, `scripts/test-stacklane-mcp-v010.mjs`
- added root `test:mcp` script

## 0.4.1

- add root `pnpm lint` via `scripts/lint-workspace.mjs`
- clarify that `apps/api/src/server.ts` is the active runtime entrypoint
- keep `apps/api/src/app.ts` as a compatibility shim for older checks
- add direct runtime endpoint coverage for customer, key, usage, asset, and file flows

## 0.4.0

- added local-first customers, API keys, usage events, and asset metadata primitives
- added `/api/v1/*` JSON endpoints for health, config, customers, keys, usage, and assets
- added local storage files under `.stacklane/`
- added SDK and CLI coverage for the new primitives
- added Talocode integration examples and storage/security docs

No billing, external platform dependency, or cloud provisioning is included in this release.
