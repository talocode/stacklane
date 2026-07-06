#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { loadConfig, redactApiKey } from './config.js'
import { TalocodeMcpBridgeClient } from './client.js'

async function main(): Promise<void> {
  const config = loadConfig()
  const client = new TalocodeMcpBridgeClient(config.mcpUrl, config.apiKey)

  const server = new Server(
    {
      name: 'talocode-mcp-bridge',
      version: '0.1.0',
    },
    {
      capabilities: { tools: {} },
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const body = { jsonrpc: '2.0', method: 'tools/list', id: 1 }
    const result = await client.forward(body)

    if (!result.ok) {
      throw new Error(
        `Failed to list tools from Talocode MCP: ${(result.body?.error as Record<string, unknown>)?.message ?? 'Unknown error'}`,
      )
    }

    const remoteResult = result.body.result as { tools: unknown[] } | undefined
    return { tools: remoteResult?.tools ?? [] }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    const body = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name, arguments: args },
      id: Date.now(),
    }

    const result = await client.forward(body)

    if (!result.ok) {
      const errorData = result.body.error as Record<string, unknown> | undefined
      const message = errorData?.message as string ?? `Remote returned status ${result.status}`
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: message }) }],
        isError: true,
      }
    }

    const remoteResult = result.body.result as { content?: Array<{ type: string; text: string }> } | undefined
    return {
      content: remoteResult?.content ?? [{ type: 'text' as const, text: JSON.stringify(result.body) }],
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  const safe = message.includes(process.env.TALOCODE_API_KEY ?? '') ? redactApiKey(message) : message
  process.stderr.write(`talocode-mcp-bridge failed: ${safe}\n`)
  process.exit(1)
})
