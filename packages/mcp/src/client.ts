import { redactSecrets } from './safety'

export interface ClientOptions {
  baseUrl: string
  apiKey?: string
}

export interface ClientResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

export class StacklaneMcpClient {
  private readonly baseUrl: string
  private readonly apiKey: string | undefined

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.apiKey = options.apiKey
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) {
      h['Authorization'] = `Bearer ${this.apiKey}`
    }
    return h
  }

  private async request<T>(path: string, method: string, body?: unknown): Promise<ClientResult<T>> {
    const url = `${this.baseUrl}${path}`
    try {
      const res = await fetch(url, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      let parsed: unknown
      try {
        parsed = text ? JSON.parse(text) : {}
      } catch {
        parsed = { error: { message: redactSecrets(text) } }
      }
      if (!res.ok) {
        const message = extractErrorMessage(parsed) ?? `HTTP ${res.status}`
        return { ok: false, status: res.status, error: redactSecrets(message) }
      }
      return { ok: true, status: res.status, data: parsed as T }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error'
      return { ok: false, status: 0, error: redactSecrets(message) }
    }
  }

  async get<T>(path: string): Promise<ClientResult<T>> {
    return this.request<T>(path, 'GET')
  }
  async post<T>(path: string, body?: unknown): Promise<ClientResult<T>> {
    return this.request<T>(path, 'POST', body)
  }
  async patch<T>(path: string, body: unknown): Promise<ClientResult<T>> {
    return this.request<T>(path, 'PATCH', body)
  }
  async delete<T>(path: string): Promise<ClientResult<T>> {
    return this.request<T>(path, 'DELETE')
  }
}

function extractErrorMessage(parsed: unknown): string | undefined {
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    const err = obj.error
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>
      if (typeof e.message === 'string') return e.message
    }
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error === 'string') return obj.error
  }
  return undefined
}
