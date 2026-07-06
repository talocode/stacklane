# Talocode MCP Bridge

The Talocode MCP bridge is a local stdio-based proxy that forwards MCP requests to the remote Talocode MCP HTTP endpoint. Use it when your MCP client does not support custom HTTP headers (needed for `Authorization: Bearer $TALOCODE_API_KEY`).

## How It Works

```
MCP Client (stdio) → talocode-mcp (local) → https://api.talocode.site/mcp (remote)
```

1. Your MCP client spawns `npx @talocode/mcp` as a local subprocess
2. The bridge reads `TALOCODE_API_KEY` from the environment
3. The bridge opens a stdio MCP server
4. On `tools/list` and `tools/call`, it forwards the request to the remote Talocode MCP endpoint with `Authorization: Bearer $TALOCODE_API_KEY`
5. The response is returned to the local MCP client

## Usage

```bash
# Set your API key
export TALOCODE_API_KEY=tk_dev_xxxxxxxxxxxx

# Run the bridge
npx @talocode/mcp
```

## Configuration

| Env Var | Required | Default | Description |
|---------|----------|---------|-------------|
| `TALOCODE_API_KEY` | Yes | — | Talocode Cloud API key |
| `TALOCODE_MCP_URL` | No | `https://api.talocode.site/mcp` | Remote MCP endpoint |

For local development:

```bash
export TALOCODE_MCP_URL=http://localhost:4000/mcp
npx @talocode/mcp
```

## Client Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "talocode": {
      "command": "npx",
      "args": ["@talocode/mcp"],
      "env": {
        "TALOCODE_API_KEY": "tk_live_xxxxxxxxxxxx"
      }
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "talocode": {
      "command": "npx",
      "args": ["@talocode/mcp"],
      "env": {
        "TALOCODE_API_KEY": "tk_live_xxxxxxxxxxxx"
      }
    }
  }
}
```

### OpenCode

Configure MCP servers in your OpenCode config:

```json
{
  "mcpServers": {
    "talocode": {
      "command": "npx",
      "args": ["@talocode/mcp"],
      "env": {
        "TALOCODE_API_KEY": "tk_live_xxxxxxxxxxxx"
      }
    }
  }
}
```

## Security

- The bridge never logs the raw `TALOCODE_API_KEY`
- API keys are redacted in error messages (only first 4 + last 4 characters visible)
- The key is only used to set the `Authorization` header on forwarded requests
- Never commit the API key to config files — use env vars or secret management

## Limitations

- Install from npm: `npx @talocode/mcp`
- Requires network access to the remote MCP endpoint
- No SSE streaming (all responses are synchronous JSON)
