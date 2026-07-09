import { TalocodeApiClient } from './talocode.js'

export interface GeoLaneUrlInput {
  url: string
}

export interface GeoLaneCompareInput {
  urlA?: string
  urlB?: string
  a?: string
  b?: string
}

export class GeoLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; endpoints?: string[] }> {
    return this.api.request('/v1/geolane/health') as Promise<{
      ok: boolean
      service: string
      version: string
      endpoints?: string[]
    }>
  }

  async pricing(): Promise<Record<string, unknown>> {
    return this.api.request('/v1/geolane/pricing') as Promise<Record<string, unknown>>
  }

  async capabilities(): Promise<Record<string, unknown>> {
    return this.api.request('/v1/geolane/capabilities') as Promise<Record<string, unknown>>
  }

  async audit(input: GeoLaneUrlInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/geolane/audit', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }

  async crawlers(input: GeoLaneUrlInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/geolane/crawlers', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }

  async llmsTxt(input: GeoLaneUrlInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/geolane/llms-txt', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }

  async citationReadiness(input: GeoLaneUrlInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/geolane/citation-readiness', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }

  async compare(input: GeoLaneCompareInput): Promise<Record<string, unknown>> {
    return this.api.request('/v1/geolane/compare', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<Record<string, unknown>>
  }
}
