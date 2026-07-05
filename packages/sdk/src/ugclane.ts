import { TalocodeApiClient } from './talocode.js'

export interface UGCLaneStrategyInput {
  goal: string
  niche?: string
  platform?: string
  constraints?: string[]
}

export interface UGCLaneCompetitorInput {
  competitors: string[]
  niche?: string
  depth?: 'basic' | 'detailed' | 'deep'
}

export interface UGCLaneHooksInput {
  topic: string
  platform?: string
  count?: number
  tone?: string
}

export interface UGCLaneScriptsInput {
  topic: string
  format?: 'short' | 'long' | 'series'
  platform?: string
  tone?: string
  cta?: string
}

export interface UGCLaneAccountsPlanInput {
  platform: string
  goal: string
  metrics?: Record<string, unknown>
  timeline?: string
}

export interface UGCLaneCalendarInput {
  platform: string
  month?: string
  goals?: string[]
  themes?: string[]
  postFrequency?: string
}

export interface UGCLaneExperimentsInput {
  platform: string
  goal: string
  variables?: string[]
  durationDays?: number
}

export interface UGCLaneReportInput {
  platform: string
  period: string
  metrics: Record<string, unknown>
  goal?: string
}

export interface UGCLaneExportMarkdownInput {
  content: Record<string, unknown>
  title?: string
  sections?: string[]
}

export interface UGCLaneExportJsonInput {
  content: Record<string, unknown>
  format?: 'pretty' | 'compact'
}

export interface UGCLaneResponse<T> {
  data: T
  usage: {
    action: string
    credits: number
    remaining: number
  }
}

export class UGCLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; timestamp: string }> {
    const res = await this.api.request('/v1/ugclane/health')
    return res as { ok: boolean; service: string; version: string; timestamp: string }
  }

  strategy = {
    generate: async (input: UGCLaneStrategyInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/strategy/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  competitor = {
    analyze: async (input: UGCLaneCompetitorInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/competitor/analyze', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  hooks = {
    generate: async (input: UGCLaneHooksInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/hooks/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  scripts = {
    generate: async (input: UGCLaneScriptsInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/scripts/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  accounts = {
    plan: async (input: UGCLaneAccountsPlanInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/accounts/plan', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  calendar = {
    generate: async (input: UGCLaneCalendarInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/calendar/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  experiments = {
    generate: async (input: UGCLaneExperimentsInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/experiments/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  report = {
    generate: async (input: UGCLaneReportInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/report/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }

  export = {
    markdown: async (input: UGCLaneExportMarkdownInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/export/markdown', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },

    json: async (input: UGCLaneExportJsonInput): Promise<UGCLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/ugclane/export/json', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<UGCLaneResponse<Record<string, unknown>>>
    },
  }
}
