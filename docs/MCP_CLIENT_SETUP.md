# Talocode MCP Client Setup

## Cursor

Add to your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "talocode": {
      "url": "https://api.talocode.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ${TALOCODE_API_KEY}"
      }
    }
  }
}
```

Or use a local `.env` file with the key:

```json
{
  "mcpServers": {
    "talocode": {
      "url": "https://api.talocode.xyz/mcp",
      "headers": {
        "X-Api-Key": "${TALOCODE_API_KEY}"
      }
    }
  }
}
```

## Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "talocode": {
      "url": "https://api.talocode.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ${TALOCODE_API_KEY}"
      }
    }
  }
}
```

## VS Code (Copilot Agent Mode)

Add to your `.vscode/mcp.json` or workspace settings:

```json
{
  "mcpServers": {
    "talocode": {
      "url": "https://api.talocode.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ${TALOCODE_API_KEY}"
      }
    }
  }
}
```

## OpenCode

Add to your OpenCode configuration:

```json
{
  "mcpServers": {
    "talocode": {
      "url": "https://api.talocode.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ${TALOCODE_API_KEY}"
      }
    }
  }
}
```

## Local Development

For local testing against a running Stacklane API instance:

```json
{
  "mcpServers": {
    "talocode": {
      "url": "http://localhost:4000/mcp",
      "headers": {
        "Authorization": "Bearer ${TALOCODE_API_KEY}"
      }
    }
  }
}
```

## Bridge Package (Future)

For clients that do not support HTTP MCP with custom headers, a future bridge package will be available:

```bash
npx @talocode/mcp https://api.talocode.xyz/mcp
```

This is planned for a future release.

## Security Notes

- Never commit API keys to `.cursor/mcp.json`, `claude_desktop_config.json`, or any other config file
- Use environment variable substitution (`${TALOCODE_API_KEY}`) where supported
- If your client does not support env var substitution, use a `.env` file that is `.gitignore`d
- Rotate keys if accidentally exposed
