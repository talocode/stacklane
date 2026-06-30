import {
  TalocodeError,
  TalocodeAuthError,
  TalocodeInsufficientCreditsError,
  TalocodeRateLimitError,
  TalocodeValidationError,
} from './errors'

export interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
}

export async function request(
  baseUrl: string,
  path: string,
  apiKey: string | undefined,
  options: RequestOptions = {}
): Promise<unknown> {
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`
  const method = options.method ?? 'POST'
  const timeoutMs = options.timeoutMs ?? 30000

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timer)

    const contentType = res.headers.get('content-type') ?? ''
    let body: unknown = undefined
    if (contentType.includes('json')) {
      body = await res.json()
    } else {
      const text = await res.text()
      body = { message: text }
    }

    const requestId =
      (res.headers.get('x-talocode-request-id') ??
        res.headers.get('x-tera-request-id') ??
        res.headers.get('x-request-id')) ??
      undefined

    if (!res.ok) {
      const errBody = body as Record<string, unknown> | undefined
      const errData = errBody?.error as Record<string, unknown> | undefined
      const message =
        (errData?.message as string) ??
        (errBody?.message as string) ??
        `HTTP ${res.status}`
      const code = (errData?.code as string) ?? 'unknown'

      switch (res.status) {
        case 400:
          throw new TalocodeValidationError(
            message,
            (errData?.details ?? errBody?.details) as Record<string, unknown> | undefined,
            requestId
          )
        case 401:
          throw new TalocodeAuthError(message, requestId)
        case 402: {
          const required = errData?.required ?? errBody?.required
          const available = errData?.available ?? errBody?.available
          throw new TalocodeInsufficientCreditsError(
            message,
            required as number | undefined,
            available as number | undefined,
            requestId
          )
        }
        case 429:
          throw new TalocodeRateLimitError(message, requestId)
        default:
          throw new TalocodeError(message, res.status, code, requestId)
      }
    }

    if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
      return (body as Record<string, unknown>).data
    }

    return body
  } catch (err) {
    clearTimeout(timer)

    if (err instanceof TalocodeError) throw err

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TalocodeError('Request timed out', 0, 'timeout')
    }

    throw new TalocodeError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'network_error'
    )
  }
}
