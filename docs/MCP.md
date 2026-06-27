# Stacklane MCP

Stacklane MCP is an open-source Model Context Protocol server that lets MCP-compatible agents (Codex, Claude Code, OpenCode, Cursor, and other MCP-compatible tools) use Stacklane as a local-first backend, usage, and storage layer.

It is local-first by default. No cloud account, no Supabase, no Resend, and no external platform dependency is required.

## What It Does

The MCP server exposes Stacklane v0.4.1 primitives as MCP tools:

- **Health/config**: `stacklane_health`, `stacklane_config_status`
- **Customers**: `stacklane_create_customer`, `stacklane_list_customers`, `stacklane_get_customer`, `stacklane_update_customer`
- **API keys**: `stacklane_create_api_key`, `stacklane_list_api_keys`, `stacklane_revoke_api_key`, `stacklane_verify_api_key`
- **Usage**: `stacklane_record_usage_event`, `stacklane_list_usage_events`, `stacklane_summarize_usage`
- **Assets**: `stacklane_create_asset`, `stacklane_list_assets`, `stacklane_get_asset`, `stacklane_delete_asset`

All tool inputs are validated with strict schemas. All outputs are JSON.

## Local-First Setup

### 1. Run the Stacklane API locally

```bash
pnpm install
pnpm --filter @stacklane/api dev
```

The local API listens on `http://localhost:7331` by default.

### 2. Build the MCP server

```bash
pnpm --filter @stacklane/mcp build
```

This produces `packages/mcp/dist/index.js` with a `stacklane-mcp` bin entry.

### 3. Run the MCP server

```bash
node packages/mcp/dist/index.js
```

Or, once installed:

```bash
stacklane-mcp
```

The server uses stdio transport for local agent clients.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STACKLANE_MCP_BASE_URL` | `http://localhost:7331` | Base URL of the local Stacklane API |
| `STACKLANE_MCP_API_KEY` | (none) | Stacklane API key for authenticated tools |
| `STACKLANE_MCP_MODE` | `local` | Operation mode (local only in v0.1) |

Config status reports present/missing only. The MCP server never prints the API key or env values. If the API server is unavailable, tools return safe MCP errors.

## Agent Configuration

Register the MCP server in your agent config. Replace `/absolute/path/to/Stacklane` with your local checkout path and `sk_lane_dev_REPLACE_ME` with a real key only in your local env (never commit it).

### Codex

See `examples/mcp/codex-config.json`:

```json
{
  "mcpServers": {
    "stacklane": {
      "command": "node",
      "args": ["/absolute/path/to/Stacklane/packages/mcp/dist/index.js"],
      "env": {
        "STACKLANE_MCP_BASE_URL": "http://localhost:7331",
        "STACKLANE_MCP_API_KEY": "sk_lane_dev_REPLACE_ME",
        "STACKLANE_MCP_MODE": "local"
      }
    }
  }
}
```

### Claude Code

See `examples/mcp/claude-config.json`. Same shape as above; load it via your Claude Code MCP settings.

### OpenCode

See `examples/mcp/opencode-config.json`.

### Cursor

See `examples/mcp/cursor-config.json`.

Sample prompts are in `examples/mcp/sample-agent-prompts.md`.

## Safety Rules

- The raw API key is returned only from `stacklane_create_api_key`. It is shown once and never echoed again.
- `stacklane_list_api_keys`, `stacklane_revoke_api_key`, and `stacklane_verify_api_key` never return key hashes or raw keys.
- Asset tools reject unsafe filenames, null bytes, path traversal (`..`), absolute paths, and path separators.
- All tool inputs are validated before the API is called.
- Errors are redacted; no stack traces or secrets are exposed in tool output.
- No arbitrary shell execution. No billing actions. No cloud provisioning.
- The only external network call is to the configured `STACKLANE_MCP_BASE_URL`.

## Validation

```bash
pnpm --filter @stacklane/mcp typecheck
pnpm --filter @stacklane/mcp build
node scripts/test-stacklane-mcp-v010.mjs
```

The test suite validates package metadata, tool coverage, input schemas, safety rules, and runs a mock API integration for health, customer creation, usage recording, and asset creation.

## Limitations

- v0.1 is local-first and stdio-only. No cloud storage, no Supabase, no Resend.
- The MCP server connects to a Stacklane API you run locally; it does not provision one.
- This is not an official marketplace listing. Compatibility depends on each agent's MCP support.
- No billing or cloud provisioning is supported or planned in this package.
