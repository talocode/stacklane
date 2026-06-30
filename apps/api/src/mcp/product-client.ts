export interface ProductClientOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
}

export interface ProductClientResult {
  ok: boolean
  status: number
  body: Record<string, unknown>
  headers: Record<string, string>
}

export class ProductClient {
  private baseUrl: string
  private apiKey: string
  private timeoutMs: number

  constructor(options: ProductClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKey = options.apiKey
    this.timeoutMs = options.timeoutMs ?? 30000
  }

  async request(method: string, path: string, body?: unknown): Promise<ProductClientResult> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      }

      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timer)

      const contentType = res.headers.get('content-type') ?? ''
      let responseBody: Record<string, unknown> = {}

      if (contentType.includes('json')) {
        responseBody = (await res.json()) as Record<string, unknown>
      } else {
        responseBody = { message: await res.text() }
      }

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      return {
        ok: res.ok,
        status: res.status,
        body: responseBody,
        headers: responseHeaders,
      }
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, status: 0, body: { error: 'Request timed out' }, headers: {} }
      }
      return {
        ok: false,
        status: 0,
        body: { error: err instanceof Error ? err.message : 'Network error' },
        headers: {},
      }
    }
  }

  async get(path: string): Promise<ProductClientResult> {
    return this.request('GET', path)
  }

  async post(path: string, body?: unknown): Promise<ProductClientResult> {
    return this.request('POST', path, body)
  }
}

export function createProductClient(apiKey: string): ProductClient {
  const baseUrl = process.env.TALOCODE_BASE_URL ?? process.env.STACKLANE_API_BASE_URL ?? 'http://localhost:4000'
  return new ProductClient({ baseUrl, apiKey })
}
