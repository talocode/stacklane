import { TalocodeApiClient } from './talocode.js'

export interface CrawlerLaneLogEvent {
  timestamp: string
  method: string
  path: string
  status: number
  userAgent: string
  referer?: string
  ip?: string
  host?: string
}

export interface CrawlerLanePrivacyOptions {
  redactIps?: boolean
}

export interface CrawlerLaneIngestInput {
  domain: string
  logs: CrawlerLaneLogEvent[] | string
  privacy?: CrawlerLanePrivacyOptions
}

export interface CrawlerLaneClassifyInput {
  userAgent: string
  ip?: string
  path?: string
  status?: number
}

export interface CrawlerLaneAnalyzePagesInput {
  domain: string
  logs: CrawlerLaneLogEvent[] | string
  importantPages?: string[]
  privacy?: CrawlerLanePrivacyOptions
}

export interface CrawlerLaneAnalyze404Input {
  domain: string
  logs: CrawlerLaneLogEvent[] | string
  privacy?: CrawlerLanePrivacyOptions
}

export interface CrawlerLaneAiVisibilityInput {
  domain: string
  logs: CrawlerLaneLogEvent[] | string
  importantPages?: string[]
  hasLlmsTxt?: boolean
  hasSitemap?: boolean
  hasRobotsTxt?: boolean
  privacy?: CrawlerLanePrivacyOptions
}

export interface CrawlerLaneReportInput {
  domain: string
  logs: CrawlerLaneLogEvent[] | string
  period?: string
  importantPages?: string[]
  privacy?: CrawlerLanePrivacyOptions
}

export interface CrawlerLaneSitemapInput {
  domain: string
  existingPages?: string[]
  requested404s?: string[]
  importantPages?: string[]
}

export interface CrawlerLaneRobotsInput {
  domain: string
  robotsTxt: string
  sitemapUrl?: string
}

export interface CrawlerLaneExportInput {
  report: Record<string, unknown>
}

export interface CrawlerLaneResponse<T> {
  result?: T
  data?: T
  usage: {
    action: string
    credits: number
    remaining?: number
  }
}

export class CrawlerLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; timestamp: string; product: string; status: string }> {
    const res = await this.api.request('/v1/crawlerlane/health')
    return res as { ok: boolean; service: string; version: string; timestamp: string; product: string; status: string }
  }

  logs = {
    ingest: async (input: CrawlerLaneIngestInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/logs/ingest', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  bots = {
    classify: async (input: CrawlerLaneClassifyInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/bots/classify', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  pages = {
    analyze: async (input: CrawlerLaneAnalyzePagesInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/pages/analyze', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  notFound = {
    analyze: async (input: CrawlerLaneAnalyze404Input): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/404/analyze', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  aiVisibility = {
    score: async (input: CrawlerLaneAiVisibilityInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/ai-visibility/score', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  report = {
    generate: async (input: CrawlerLaneReportInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/report/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  sitemap = {
    suggest: async (input: CrawlerLaneSitemapInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/sitemap/suggest', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  robots = {
    audit: async (input: CrawlerLaneRobotsInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/robots/audit', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }

  export = {
    markdown: async (input: CrawlerLaneExportInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/export/markdown', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
    json: async (input: CrawlerLaneExportInput): Promise<CrawlerLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/crawlerlane/export/json', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<CrawlerLaneResponse<Record<string, unknown>>>
    },
  }
}