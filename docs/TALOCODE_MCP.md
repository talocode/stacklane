# Talocode MCP Server

Talocode MCP exposes Talocode Cloud product APIs through the [Model Context Protocol](https://modelcontextprotocol.io), allowing AI coding agents to call Talocode capabilities as MCP tools.

## Endpoint

```
https://api.talocode.xyz/mcp
```

## Status

**v0.1 — Local/demo.** The MCP server is implemented and tested but requires the Talocode Cloud API to be live at `api.talocode.xyz` for production use. For local testing, point your MCP client at a running Stacklane API instance.

## Authentication

Include your `TALOCODE_API_KEY` in every MCP request:

```
Authorization: Bearer tk_dev_xxxxxxxxxxxx
```

Or use the `X-Api-Key` header:

```
X-Api-Key: tk_dev_xxxxxxxxxxxx
```

Never commit your API key to version control.

## Transport

Talocode MCP uses **Streamable HTTP** transport (JSON-RPC over HTTP POST). This is the standard MCP transport for remote servers. MCP clients connect by sending JSON-RPC messages to `POST /mcp`.

Supported methods:
- `tools/list` — List all available tools
- `tools/call` — Call a specific tool with arguments

Also available:
- `GET /mcp` — Server health and metadata
- `GET /api/v1/cloud/mcp/tools` — List tool metadata as plain JSON

## Billing

MCP tool calls are billed as standard Talocode Cloud API requests. Each tool call triggers the same credit charge as calling the underlying REST endpoint directly. Credits are deducted from your Talocode Cloud wallet.

See [PRICING.md](./PRICING.md) for the full credit catalog.

## Tools

Talocode MCP v0.1 exposes **14 tools** across 5 product categories and 1 cloud utility:

### Tera (Writing & Coding)

| Tool | Description | Route | Est. Credits |
|------|-------------|-------|-------------|
| `tera_writing_rewrite` | Rewrite text with style/tone | `POST /v1/tera/writing/rewrite` | 5 |
| `tera_writing_draft` | Draft content (email, post, article, doc) | `POST /v1/tera/writing/draft` | 10 |
| `tera_coding_explain` | Explain code at any level | `POST /v1/tera/coding/explain` | 10 |
| `tera_coding_review` | Review code for bugs/security/performance | `POST /v1/tera/coding/review` | 20 |

### Router (AI Chat)

| Tool | Description | Route | Est. Credits |
|------|-------------|-------|-------------|
| `router_chat` | Chat completion via Talocode router | `POST /v1/router/chat/completions` | Variable |

### Agent Browser

| Tool | Description | Route | Est. Credits |
|------|-------------|-------|-------------|
| `agent_browser_check` | Check website status/screenshot/vision | `POST /v1/agent-browser/check` | 5 |
| `agent_browser_screenshot` | Capture website screenshot | `POST /v1/agent-browser/screenshot` | 8 |
| `agent_browser_trace_report` | Execute browser trace steps | `POST /v1/agent-browser/trace-report` | 15 |

### ClipLoop (Video)

| Tool | Description | Route | Est. Credits |
|------|-------------|-------|-------------|
| `cliploop_brief_generate` | Generate video brief | `POST /v1/cliploop/brief/generate` | 15 |
| `cliploop_script_generate` | Generate video script from brief | `POST /v1/cliploop/script/generate` | 15 |
| `cliploop_video_render` | Render video from script | `POST /v1/cliploop/video/render` | 200 |
| `cliploop_campaign_create` | Create video campaign | `POST /v1/cliploop/campaign/create` | 50 |
| `cliploop_campaign_package` | Package campaign for delivery | `POST /v1/cliploop/campaign/package` | 400 |

### Cloud

| Tool | Description | Route | Est. Credits |
|------|-------------|-------|-------------|
| `cloud_pricing` | Get full pricing catalog | `GET /api/v1/cloud/pricing` | 0 |

For detailed tool schemas, see [MCP_TOOLS.md](./MCP_TOOLS.md).

## Client Setup

See [MCP_CLIENT_SETUP.md](./MCP_CLIENT_SETUP.md) for configuration examples for Cursor, Claude Desktop, VS Code, and other MCP-compatible clients.

## Security

- Talocode MCP never logs raw API keys
- Authorization headers are redacted in logs and error messages
- API keys are forwarded securely to Talocode Cloud endpoints
- Never commit API key values to configuration files
- Use environment variables or secret management for API keys
