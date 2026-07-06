# @talocode/mcp

**Talocode MCP bridge** — connect AI agents to Talocode Cloud APIs via stdio MCP.

Many MCP clients cannot send custom HTTP headers. This bridge runs locally over stdio and forwards `tools/list` and `tools/call` to the hosted Talocode MCP endpoint with your API key.

```bash
export TALOCODE_API_KEY=tk_live_xxxxxxxxxxxx
npx @talocode/mcp
```

## How it works

```
MCP Client (stdio) → talocode-mcp (local) → https://api.talocode.site/mcp (remote)
```

## Configuration

| Env var | Required | Default |
|---------|----------|---------|
| `TALOCODE_API_KEY` | Yes | — |
| `TALOCODE_MCP_URL` | No | `https://api.talocode.site/mcp` |

## Client setup

### Cursor / Claude Desktop

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

- API keys are never logged in full (redacted in errors)
- Use environment variables — never commit keys to config files

## Docs

Full guide: [TALOCODE_MCP_BRIDGE.md](https://github.com/talocode/stacklane/blob/main/docs/TALOCODE_MCP_BRIDGE.md)

## License

MIT