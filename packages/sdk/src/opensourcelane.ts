import { TalocodeApiClient } from './talocode.js'

export interface OpenSourceLaneRepoMetadata {
  stars?: number
  forks?: number
  issues?: number
  contributors?: number
  lastReleaseDaysAgo?: number
  lastCommitDaysAgo?: number
  hasDocker?: boolean
  hasSecurityPolicy?: boolean
  license?: string
}

export interface OpenSourceLaneAnalyzeInput {
  repo?: string
  repoUrl?: string
  category?: string
  metadata?: OpenSourceLaneRepoMetadata
  readme?: string
  requirements?: string[]
}

export interface OpenSourceLaneFindAlternativesInput {
  replace: string
  teamSize?: number
  budget?: string
  deployment?: string
  requiredFeatures?: string[]
  riskTolerance?: string
}

export interface OpenSourceLanePlanMigrationInput {
  from: string
  to: string
  teamSize?: number
  currentWorkflow?: string[]
  constraints?: { downtime?: string; hosting?: string }
}

export interface OpenSourceLaneCostEstimateInput {
  currentTool: string
  teamSize?: number
  currentMonthlyCost: number
  hostingCost?: number
  maintenanceHoursPerMonth?: number
  hourlyRate?: number
}

export interface OpenSourceLaneScoreRiskInput {
  repo: string
  metadata?: OpenSourceLaneRepoMetadata
  requirements?: string[]
  readme?: string
}

export interface OpenSourceLaneBriefInput {
  tool: string
  repo: string
  replace: string
  teamSize?: number
  analysis?: Record<string, unknown>
}

export interface OpenSourceLaneCompareInput {
  tools: Array<{ name: string; repo: string; metadata?: OpenSourceLaneRepoMetadata }>
  criteria?: string[]
}

export interface OpenSourceLaneDeploymentInput {
  tool: string
  deployment?: string
  teamSize?: number
  environment?: string
}

export interface OpenSourceLaneLicenseInput {
  repo: string
  license?: string
  intendedUse?: string
}

export interface OpenSourceLaneExportInput {
  data?: Record<string, unknown>
  report?: Record<string, unknown>
  title?: string
}

export interface OpenSourceLaneResponse<T> {
  result?: T
  data?: T
  usage: {
    action: string
    credits: number
    remaining?: number
  }
}

export class OpenSourceLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; timestamp: string; product: string; status: string }> {
    const res = await this.api.request('/v1/opensourcelane/health')
    return res as { ok: boolean; service: string; version: string; timestamp: string; product: string; status: string }
  }

  repo = {
    analyze: async (input: OpenSourceLaneAnalyzeInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/repo/analyze', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  alternatives = {
    find: async (input: OpenSourceLaneFindAlternativesInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/alternatives/find', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  migration = {
    plan: async (input: OpenSourceLanePlanMigrationInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/migration/plan', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  cost = {
    estimate: async (input: OpenSourceLaneCostEstimateInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/cost/estimate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  risk = {
    score: async (input: OpenSourceLaneScoreRiskInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/risk/score', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  brief = {
    generate: async (input: OpenSourceLaneBriefInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/brief/generate', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  tools = {
    compare: async (input: OpenSourceLaneCompareInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/tools/compare', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  deployment = {
    plan: async (input: OpenSourceLaneDeploymentInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/deployment/plan', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  license = {
    audit: async (input: OpenSourceLaneLicenseInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/license/audit', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }

  export = {
    markdown: async (input: OpenSourceLaneExportInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/export/markdown', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
    json: async (input: OpenSourceLaneExportInput): Promise<OpenSourceLaneResponse<Record<string, unknown>>> => {
      return this.api.request('/v1/opensourcelane/export/json', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }) as Promise<OpenSourceLaneResponse<Record<string, unknown>>>
    },
  }
}