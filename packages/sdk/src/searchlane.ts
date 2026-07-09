import { TalocodeApiClient } from './talocode.js'

export interface SearchLaneQueryInput {
  query?: string
  q?: string
  limit?: number
}

export interface SearchLaneResearchInput extends SearchLaneQueryInput {
  fetchPages?: boolean
}

export class SearchLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; endpoints?: string[] }> {
    return this.api.request('/v1/searchlane/health') as Promise<{
      ok: boolean
      service: string
      version: string
      endpoints?: string[]
    }>
  }

  async pricing(): Promise<Record<string, unknown>> {
    return this.api.request('/v1/searchlane/pricing') as Promise<Record<string, unknown>>
  }

  async capabilities(): Promise<Record<string, unknown>> {
    return this.api.request('/v1/searchlane/capabilities') as Promise<Record<string, unknown>>
  }

  async query(input: SearchLaneQueryInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/searchlane/query', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }

  async news(input: SearchLaneQueryInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/searchlane/news', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }

  async research(input: SearchLaneResearchInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/searchlane/research', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }
}
