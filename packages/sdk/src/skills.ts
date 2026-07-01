import { request } from './request'
import type {
  SkillsGenerateProfileInput,
  SkillsGenerateRepoInput,
  SkillsGenerateDocsInput,
  SkillsGenerateTextInput,
  SkillsExportInput,
  SkillsGenerateResult,
  SkillsExportResult,
  SkillsHealthResponse,
} from './types'

export class SkillsClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

  private async req<T>(path: string, method: string, body?: unknown): Promise<T> {
    return request(this.baseUrl, path, this.apiKey, {
      method,
      body,
      timeoutMs: this.timeoutMs,
    }) as Promise<T>
  }

  async health(): Promise<SkillsHealthResponse> {
    return this.req<SkillsHealthResponse>('/v1/skills/health', 'GET')
  }

  generate = {
    githubProfile: async (input: SkillsGenerateProfileInput): Promise<SkillsGenerateResult> => {
      return this.req<SkillsGenerateResult>('/v1/skills/generate/github-profile', 'POST', input)
    },

    githubRepo: async (input: SkillsGenerateRepoInput): Promise<SkillsGenerateResult> => {
      return this.req<SkillsGenerateResult>('/v1/skills/generate/github-repo', 'POST', input)
    },

    docs: async (input: SkillsGenerateDocsInput): Promise<SkillsGenerateResult> => {
      return this.req<SkillsGenerateResult>('/v1/skills/generate/docs', 'POST', input)
    },

    text: async (input: SkillsGenerateTextInput): Promise<SkillsGenerateResult> => {
      return this.req<SkillsGenerateResult>('/v1/skills/generate/text', 'POST', input)
    },
  }

  export = {
    cursor: async (input: SkillsExportInput): Promise<SkillsExportResult> => {
      return this.req<SkillsExportResult>('/v1/skills/export/cursor', 'POST', input)
    },

    claude: async (input: SkillsExportInput): Promise<SkillsExportResult> => {
      return this.req<SkillsExportResult>('/v1/skills/export/claude', 'POST', input)
    },
  }
}
