import { TalocodeApiClient } from './talocode.js'

export interface ReplyLaneScoreOpportunityInput {
  tweetText: string
  authorHandle: string
  authorFollowers: number
  replyCount?: number
  likeCount?: number
  ageMinutes?: number
  yourFollowers?: number
  yourNiche?: string
  topicTags?: string[]
}

export interface ReplyLaneTargetAccount {
  handle: string
  followers: number
  niche?: string
  avgRepliesPerPost?: number
  postsPerWeek?: number
}

export interface ReplyLaneRankTargetsInput {
  yourFollowers: number
  yourNiche?: string
  accounts: ReplyLaneTargetAccount[]
}

export interface ReplyLaneDraftRepliesInput {
  tweetText: string
  authorHandle?: string
  yourNiche?: string
  yourExperience?: string
  replyTypes?: string[]
  count?: number
  maxLength?: number
}

export interface ReplyLaneScoreReplyRiskInput {
  replyText: string
  targetHandle?: string
  repliesLastHour?: number
  repliesToSameAccountToday?: number
  similarRepliesToday?: number
  containsLink?: boolean
}

export interface ReplyLaneGrokCheckInput {
  postText: string
  isReply?: boolean
  goal?: string
}

export interface ReplyLaneActivityEntry {
  type: 'post' | 'reply'
  handle?: string
  timestamp?: string
}

export interface ReplyLaneAuditActivityInput {
  entries: ReplyLaneActivityEntry[]
  periodDays?: number
  targetRepliesPerDay?: number
  targetPostsPerDay?: number
}

export interface ReplyLaneFeedMigrateInput {
  communityName?: string
  niche?: string
  memberCount?: number
  currentTopics?: string[]
  goal?: string
}

export interface ReplyLaneExportInput {
  data?: Record<string, unknown>
  report?: Record<string, unknown>
  title?: string
}

export interface ReplyLaneResponse<T> {
  result?: T
  data?: T
  usage: {
    action: string
    credits: number
    remaining?: number
  }
}

export class ReplyLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; timestamp: string; product: string; status: string }> {
    const res = await this.api.request('/v1/replylane/health')
    return res as { ok: boolean; service: string; version: string; timestamp: string; product: string; status: string }
  }

  opportunity = {
    score: async (input: ReplyLaneScoreOpportunityInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/opportunity/score', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
  }

  targets = {
    rank: async (input: ReplyLaneRankTargetsInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/targets/rank', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
  }

  replies = {
    draft: async (input: ReplyLaneDraftRepliesInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/replies/draft', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
    risk: async (input: ReplyLaneScoreReplyRiskInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/replies/risk', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
  }

  posts = {
    grokCheck: async (input: ReplyLaneGrokCheckInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/posts/grok-check', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
  }

  activity = {
    audit: async (input: ReplyLaneAuditActivityInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/activity/audit', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
  }

  feeds = {
    migrate: async (input: ReplyLaneFeedMigrateInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/feeds/migrate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
  }

  export = {
    markdown: async (input: ReplyLaneExportInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/export/markdown', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
    json: async (input: ReplyLaneExportInput): Promise<ReplyLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/replylane/export/json', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<ReplyLaneResponse<Record<string, unknown>>>
    },
  }
}