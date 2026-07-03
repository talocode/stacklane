export interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
  id: string | number | null
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: JsonRpcError
}

export interface McpToolInputSchema {
  type: 'object'
  properties?: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
}

export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: McpToolInputSchema
  route: string
  method: string
  product: string
  action: string
  estimatedCredits: number | null
}

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}
