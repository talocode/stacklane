export interface BridgeConfig {
  apiKey: string
  mcpUrl: string
}

export function loadConfig(): BridgeConfig {
  const apiKey = process.env.TALOCODE_API_KEY
  if (!apiKey) {
    console.error('TALOCODE_API_KEY is required. Set it in your environment or MCP client config.')
    process.exit(1)
  }

  const mcpUrl = process.env.TALOCODE_MCP_URL ?? 'https://api.talocode.xyz/mcp'

  return { apiKey, mcpUrl }
}

export function redactApiKey(value: string): string {
  if (value.length <= 8) return '***'
  return value.slice(0, 4) + '****' + value.slice(-4)
}
