import type { JsonRpcError } from './types'

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  AUTH_ERROR: -32001,
  INSUFFICIENT_CREDITS: -32002,
  RATE_LIMITED: -32003,
  BACKEND_UNAVAILABLE: -32004,
} as const

export function mapHttpStatusToMcpError(status: number, body: Record<string, unknown>): JsonRpcError {
  const message = (body.error as string) ?? (body.message as string) ?? `HTTP ${status}`

  switch (status) {
    case 400:
      return { code: MCP_ERROR_CODES.INVALID_PARAMS, message, data: body }
    case 401:
      return { code: MCP_ERROR_CODES.AUTH_ERROR, message: 'Authentication failed: ' + message, data: body }
    case 402:
      return { code: MCP_ERROR_CODES.INSUFFICIENT_CREDITS, message: 'Insufficient Talocode Cloud credits.', data: { required: body.required, available: body.available } }
    case 429:
      return { code: MCP_ERROR_CODES.RATE_LIMITED, message: 'Rate limited: ' + message, data: body }
    case 502:
    case 503:
      return { code: MCP_ERROR_CODES.BACKEND_UNAVAILABLE, message: 'Backend unavailable: ' + message, data: body }
    default:
      return { code: MCP_ERROR_CODES.INTERNAL_ERROR, message, data: body }
  }
}

export function authError(reason: string): JsonRpcError {
  return { code: MCP_ERROR_CODES.AUTH_ERROR, message: reason }
}
