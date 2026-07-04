import { TalocodeApiClient } from './talocode.js'

export interface XMetrics {
  followers?: number
  verifiedFollowers?: number
  activeFollowers?: number
  impressions?: number
  engagementRate?: number
  engagements?: number
  profileVisits?: number
  replies?: number
  likes?: number
  reposts?: number
  bookmarks?: number
  shares?: number
}

export interface XTopPost {
  text: string
  impressions?: number
  likes?: number
  replies?: number
  bookmarks?: number
}

export interface AnalyzeInput {
  handle: string
  goal: string
  metrics: XMetrics
  topPosts?: XTopPost[]
}

export interface ContentPlanInput {
  handle: string
  goal: string
  analysis: Record<string, unknown>
  week: string
  cadence: string
}

export interface PostDraftsInput {
  goal: string
  voice: string
  topics: string[]
  count?: number
  maxLength?: number
}

export interface ExperimentsInput {
  goal: string
  hypotheses?: string[]
  durationDays?: number
}

export interface ReportInput {
  handle: string
  goal: string
  metrics: Record<string, unknown>
  topPosts?: Record<string, unknown>[]
  period?: string
}

export interface SignalLaneResponse<T> {
  data: T
  usage: {
    action: string
    credits: number
    remaining: number
  }
}

export class SignalLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string }> {
    const res = await this.api.request('/v1/signallane/health')
    return res as { ok: boolean; service: string; version: string }
  }

  async analyze(input: AnalyzeInput): Promise<SignalLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/signallane/x/analyze', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<SignalLaneResponse<Record<string, unknown>>>
  }

  async contentPlan(input: ContentPlanInput): Promise<SignalLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/signallane/x/content-plan', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<SignalLaneResponse<Record<string, unknown>>>
  }

  async postDrafts(input: PostDraftsInput): Promise<SignalLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/signallane/x/post-drafts', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<SignalLaneResponse<Record<string, unknown>>>
  }

  async experiments(input: ExperimentsInput): Promise<SignalLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/signallane/x/experiments', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<SignalLaneResponse<Record<string, unknown>>>
  }

  async report(input: ReportInput): Promise<SignalLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/signallane/x/report', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<SignalLaneResponse<Record<string, unknown>>>
  }
}
