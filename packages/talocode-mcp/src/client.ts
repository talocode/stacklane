import { redactApiKey } from './config.js'

export interface ForwardResult {
  ok: boolean
  status: number
  body: Record<string, unknown>
}

export class TalocodeMcpBridgeClient {
  private readonly mcpUrl: string
  private readonly apiKey: string

  constructor(mcpUrl: string, apiKey: string) {
    this.mcpUrl = mcpUrl
    this.apiKey = apiKey
  }

  async forward(jsonRpcBody: Record<string, unknown>): Promise<ForwardResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)

    try {
      const res = await fetch(this.mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(jsonRpcBody),
        signal: controller.signal,
      })

      clearTimeout(timer)

      let body: Record<string, unknown> = {}
      try {
        body = (await res.json()) as Record<string, unknown>
      } catch {
        body = { error: { code: -32603, message: 'Failed to parse remote response' } }
      }

      return { ok: res.ok, status: res.status, body }
    } catch (err) {
      clearTimeout(timer)

      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, status: 0, body: { error: { code: -32603, message: 'Request to Talocode MCP timed out' } } }
      }

      const message = err instanceof Error ? err.message : 'Network error'
      const safe = message.includes(this.apiKey) ? redactApiKey(message) : message
      return { ok: false, status: 0, body: { error: { code: -32603, message: safe } } }
    }
  }
}
