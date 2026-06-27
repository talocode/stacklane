import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { loadConfig, describeConfig } from './config'
import { StacklaneMcpClient } from './client'
import { ALL_TOOLS, type ToolContext } from './tools'

export function createMcpServer(): Server {
  const config = loadConfig()
  const client = new StacklaneMcpClient({ baseUrl: config.baseUrl, apiKey: config.apiKey })
  const ctx: ToolContext = { client }

  const server = new Server(
    {
      name: 'stacklane-mcp',
      version: '0.4.1',
    },
    {
      capabilities: { tools: {} },
    }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: ALL_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      })),
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const tool = ALL_TOOLS.find((t) => t.name === name)
    if (!tool) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: `Unknown tool: ${name}` }) }],
        isError: true,
      }
    }
    try {
      const result = await tool.handler(args, ctx)
      return result as { content: Array<{ type: 'text'; text: string }>; isError?: boolean }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution error'
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: message }) }],
        isError: true,
      }
    }
  })

  return server
}

export async function runServer(): Promise<void> {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

export { loadConfig, describeConfig, StacklaneMcpClient, ALL_TOOLS }
