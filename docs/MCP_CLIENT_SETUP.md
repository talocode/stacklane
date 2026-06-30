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

## Bridge Package (Stdio)

For MCP clients that do not support custom HTTP headers (Claude Desktop, Cursor, OpenCode), use the local bridge:

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

The bridge reads `TALOCODE_API_KEY` from the environment and forwards requests to `https://api.talocode.xyz/mcp` with the proper `Authorization` header.

For local development:

```json
{
  "mcpServers": {
    "talocode": {
      "command": "npx",
      "args": ["@talocode/mcp"],
      "env": {
        "TALOCODE_API_KEY": "tk_dev_xxxxxxxxxxxx",
        "TALOCODE_MCP_URL": "http://localhost:4000/mcp"
      }
    }
  }
}
```

## Security Notes

- Never commit API keys to `.cursor/mcp.json`, `claude_desktop_config.json`, or any other config file
- Use environment variable substitution (`${TALOCODE_API_KEY}`) where supported
- If your client does not support env var substitution, use a `.env` file that is `.gitignore`d
- Rotate keys if accidentally exposed
