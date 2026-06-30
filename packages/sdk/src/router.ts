import { request } from './request'
import type {
  RouterChatInput,
  RouterChatResponse,
  RouterModelsResponse,
  RouterHealthResponse,
  RouterProvidersResponse,
} from './types'

export class RouterClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

  private getNamespacePath(path: string): string {
    return `/v1/router${path}`
  }

  async chat(input: RouterChatInput): Promise<RouterChatResponse> {
    return request(this.baseUrl, this.getNamespacePath('/chat/completions'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<RouterChatResponse>
  }

  async models(): Promise<RouterModelsResponse> {
    return request(this.baseUrl, this.getNamespacePath('/models'), this.apiKey, {
      method: 'GET',
      timeoutMs: this.timeoutMs,
    }) as Promise<RouterModelsResponse>
  }

  async providers(): Promise<RouterProvidersResponse> {
    return request(this.baseUrl, this.getNamespacePath('/providers'), this.apiKey, {
      method: 'GET',
      timeoutMs: this.timeoutMs,
    }) as Promise<RouterProvidersResponse>
  }

  async health(): Promise<RouterHealthResponse> {
    return request(this.baseUrl, this.getNamespacePath('/health'), this.apiKey, {
      method: 'GET',
      timeoutMs: this.timeoutMs,
    }) as Promise<RouterHealthResponse>
  }
}
