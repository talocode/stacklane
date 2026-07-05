import { TalocodeApiClient } from './talocode.js'

export interface WebDataLaneFetchInput {
  url: string
  timeoutMs?: number
  userAgent?: string
  maxBytes?: number
}

export interface WebDataLaneExtractInput {
  url?: string
  html?: string
  include?: string[]
  timeoutMs?: number
}

export interface WebDataLaneMarkdownInput {
  url?: string
  html?: string
  stripNavigation?: boolean
  includeLinks?: boolean
}

export interface WebDataLaneMetadataInput {
  url?: string
  html?: string
}

export interface WebDataLaneLinksInput {
  url?: string
  html?: string
  internalOnly?: boolean
}

export interface WebDataLaneStructuredInput {
  url?: string
  html?: string
  schema: Record<string, string>
  hints?: Record<string, string[]>
}

export interface WebDataLaneCrawlPlanInput {
  url?: string
  html?: string
  maxPages?: number
  sameDomainOnly?: boolean
  includePatterns?: string[]
  excludePatterns?: string[]
}

export interface WebDataLaneScreenshotInput {
  url: string
  width?: number
  height?: number
  fullPage?: boolean
}

export interface WebDataLaneResponse<T> {
  data: T
  usage: {
    action: string
    credits: number
    remaining: number
  }
}

export class WebDataLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; timestamp: string }> {
    const res = await this.api.request('/v1/webdatalane/health')
    return res as { ok: boolean; service: string; version: string; timestamp: string }
  }

  async fetch(input: WebDataLaneFetchInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/fetch', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }

  async extract(input: WebDataLaneExtractInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/extract', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }

  async markdown(input: WebDataLaneMarkdownInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/markdown', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }

  async metadata(input: WebDataLaneMetadataInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/metadata', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }

  async links(input: WebDataLaneLinksInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/links', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }

  async structured(input: WebDataLaneStructuredInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/structured', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }

  async crawlPlan(input: WebDataLaneCrawlPlanInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/crawl/plan', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }

  async screenshot(input: WebDataLaneScreenshotInput): Promise<WebDataLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/webdatalane/screenshot', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<WebDataLaneResponse<Record<string, unknown>>>
  }
}
