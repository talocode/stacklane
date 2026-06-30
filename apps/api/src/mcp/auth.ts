export interface McpAuthResult {
  valid: boolean
  apiKey: string | null
  reason?: string
}

export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const xApiKey = request.headers.get('x-api-key')
  if (xApiKey) {
    return xApiKey
  }
  return null
}

export function validateMcpAuth(request: Request): McpAuthResult {
  const apiKey = extractApiKey(request)
  if (!apiKey) {
    return { valid: false, apiKey: null, reason: 'MISSING_API_KEY' }
  }
  return { valid: true, apiKey }
}

export function redactAuthHeader(value: string): string {
  if (value.length <= 8) return '***'
  return value.slice(0, 4) + '****' + value.slice(-4)
}
