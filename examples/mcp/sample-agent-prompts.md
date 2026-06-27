# Stacklane MCP Sample Agent Prompts

Local-first sample prompts for agents using the Stacklane MCP server. These assume a local Stacklane API is running and `stacklane-mcp` is configured in your agent's MCP config. No cloud account is required.

## Setup

1. Start the local Stacklane API:
   ```bash
   pnpm --filter @stacklane/api dev
   ```
2. Build the MCP server:
   ```bash
   pnpm --filter @stacklane/mcp build
   ```
3. Register the MCP server in your agent config (see `codex-config.json`, `claude-config.json`, `opencode-config.json`, `cursor-config.json`).
4. Set env vars. Use a placeholder key; never commit a real key:
   ```
   STACKLANE_MCP_BASE_URL=http://localhost:7331
   STACKLANE_MCP_API_KEY=sk_lane_dev_REPLACE_ME
   STACKLANE_MCP_MODE=local
   ```

## Sample Prompts

### Check backend health and config

> Use the `stacklane_health` tool to confirm the Stacklane API is running, then use `stacklane_config_status` to report backend config. Report config as present/missing only; do not print any API key or env value.

### Create a customer and an API key

> Use `stacklane_create_customer` to create a customer named "Acme". Then use `stacklane_create_api_key` to create a dev key for that customer. Return the raw key once with a warning that it will not be shown again. Do not store the raw key in any file or log.

### Record and summarize usage

> Use `stacklane_record_usage_event` to record 5 units of `launchpix` `asset.generate` usage. Then use `stacklane_summarize_usage` filtered by product `launchpix` and report the totals.

### Create asset metadata safely

> Use `stacklane_create_asset` to record an asset with product `launchpix`, filename `launch-card.png`, contentType `image/png`, sizeBytes 2048, and storagePath `launchpix/launch-card.png`. If the filename or storagePath contains path traversal or absolute paths, the tool must reject it.

## Safety Rules

- The raw API key is returned only from `stacklane_create_api_key`. Never echo it again.
- `stacklane_list_api_keys`, `stacklane_revoke_api_key`, and `stacklane_verify_api_key` never return key hashes or raw keys.
- Asset tools reject unsafe filenames and path traversal.
- All outputs are JSON. Errors are redacted; no stack traces or secrets are exposed.
- No billing, cloud provisioning, or external network calls except the configured Stacklane API URL.

## Limitations

- v0.1 is local-first and stdio-only. No cloud storage, no Supabase, no Resend.
- This is not an official marketplace listing. Compatibility depends on each agent's MCP support.
- The MCP server does not provision a Stacklane install; it connects to one you run locally.
