import { validateMcpAuth, redactAuthHeader } from './auth'
import { MCP_ERROR_CODES, authError } from './errors'
import { ALL_TOOLS, TOOL_MAP, callTool } from './tools'
import type { JsonRpcRequest, JsonRpcResponse, McpToolDefinition, McpToolResult } from './types'

function jsonRpcError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  }
}

function jsonRpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

function parseJsonRpcBody(body: unknown): { request: JsonRpcRequest | null; error: JsonRpcResponse | null } {
  if (!body || typeof body !== 'object') {
    return { request: null, error: jsonRpcError(null, MCP_ERROR_CODES.PARSE_ERROR, 'Invalid JSON-RPC: body must be an object') }
  }

  const obj = body as Record<string, unknown>

  if (obj.jsonrpc !== '2.0') {
    return { request: null, error: jsonRpcError(null, MCP_ERROR_CODES.PARSE_ERROR, 'Invalid JSON-RPC: jsonrpc must be "2.0"') }
  }

  if (typeof obj.method !== 'string' || !obj.method) {
    return { request: null, error: jsonRpcError(null, MCP_ERROR_CODES.INVALID_REQUEST, 'Invalid JSON-RPC: method is required') }
  }

  const id = obj.id !== undefined ? (typeof obj.id === 'string' || typeof obj.id === 'number' ? obj.id : null) : null

  return {
    request: { jsonrpc: '2.0', method: obj.method, params: obj.params as Record<string, unknown> | undefined, id },
    error: null,
  }
}

async function handleToolsList(): Promise<JsonRpcResponse> {
  const tools = ALL_TOOLS.map((t: McpToolDefinition) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    estimatedCredits: t.estimatedCredits,
    product: t.product,
    action: t.action,
  }))
  return jsonRpcResult(0, { tools })
}

async function handleToolsCall(name: string, args: Record<string, unknown> | undefined, apiKey: string): Promise<JsonRpcResponse> {
  const tool = TOOL_MAP.get(name)
  if (!tool) {
    return jsonRpcError(0, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown tool: ${name}`)
  }

  const result: McpToolResult = await callTool(tool, args ?? {}, { apiKey })

  if (result.isError) {
    const parsed = JSON.parse(result.content[0].text)
    return jsonRpcError(0, MCP_ERROR_CODES.INTERNAL_ERROR, parsed.error ?? 'Tool execution failed', parsed.data ?? null)
  }

  return jsonRpcResult(0, result.content[0])
}

function getToolListJson(): JsonRpcResponse {
  const tools = ALL_TOOLS.map((t: McpToolDefinition) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    estimatedCredits: t.estimatedCredits,
    product: t.product,
    action: t.action,
  }))
  return jsonRpcResult(0, { tools })
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, X-Api-Key, Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const auth = validateMcpAuth(request)
  if (!auth.valid) {
    return new Response(JSON.stringify(jsonRpcError(null, MCP_ERROR_CODES.AUTH_ERROR, auth.reason ?? 'Authentication required')), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // GET /mcp - health/info
  if (request.method === 'GET') {
    const info = {
      ok: true,
      service: 'talocode-mcp',
      version: '0.1.0',
      endpoint: '/mcp',
      transport: 'streamable-http',
      auth: 'TALOCODE_API_KEY',
      tools: ALL_TOOLS.length,
    }
    return new Response(JSON.stringify(info), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // POST /mcp - JSON-RPC handler
  if (request.method === 'POST') {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      const errorResp = jsonRpcError(null, MCP_ERROR_CODES.PARSE_ERROR, 'Failed to parse request body as JSON')
      return new Response(JSON.stringify(errorResp), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { request: rpcRequest, error: parseError } = parseJsonRpcBody(body)
    if (parseError) {
      return new Response(JSON.stringify(parseError), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { method, params, id } = rpcRequest!
    const apiKey = auth.apiKey!

    try {
      let response: JsonRpcResponse

      switch (method) {
        case 'tools/list':
          response = await handleToolsList()
          break
        case 'tools/call':
          response = await handleToolsCall(
            (params?.name as string) ?? '',
            params?.arguments as Record<string, unknown> | undefined,
            apiKey,
          )
          break
        default:
          response = jsonRpcError(id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Method not supported: ${method}`)
      }

      response.id = id ?? response.id

      return new Response(JSON.stringify(response), {
        status: response.error ? 400 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal MCP error'
      const errorResp = jsonRpcError(id, MCP_ERROR_CODES.INTERNAL_ERROR, message)
      return new Response(JSON.stringify(errorResp), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response(JSON.stringify(jsonRpcError(null, MCP_ERROR_CODES.INVALID_REQUEST, 'Method not allowed')), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function handleMcpToolList(): Response {
  const resp = getToolListJson()
  return new Response(JSON.stringify(resp), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
