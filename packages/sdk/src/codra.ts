import { request } from './request'
import type {
  CodraRepoSummaryInput,
  CodraRepoSummaryResult,
  CodraExplainInput,
  CodraExplainResult,
  CodraReviewInput,
  CodraReviewResult,
  CodraPlanInput,
  CodraPlanResult,
  CodraSuccessResponse,
} from './types'

export class CodraClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

  private getNamespacePath(path: string): string {
    return `/v1/codra${path}`
  }

  async repoSummary(
    input: CodraRepoSummaryInput,
  ): Promise<CodraSuccessResponse<CodraRepoSummaryResult>> {
    return request(
      this.baseUrl,
      this.getNamespacePath('/repo-summary'),
      this.apiKey,
      {
        method: 'POST',
        body: input,
        timeoutMs: this.timeoutMs,
      },
    ) as Promise<CodraSuccessResponse<CodraRepoSummaryResult>>
  }

  async explain(
    input: CodraExplainInput,
  ): Promise<CodraSuccessResponse<CodraExplainResult>> {
    return request(
      this.baseUrl,
      this.getNamespacePath('/explain'),
      this.apiKey,
      {
        method: 'POST',
        body: input,
        timeoutMs: this.timeoutMs,
      },
    ) as Promise<CodraSuccessResponse<CodraExplainResult>>
  }

  async review(
    input: CodraReviewInput,
  ): Promise<CodraSuccessResponse<CodraReviewResult>> {
    return request(
      this.baseUrl,
      this.getNamespacePath('/review'),
      this.apiKey,
      {
        method: 'POST',
        body: input,
        timeoutMs: this.timeoutMs,
      },
    ) as Promise<CodraSuccessResponse<CodraReviewResult>>
  }

  async plan(
    input: CodraPlanInput,
  ): Promise<CodraSuccessResponse<CodraPlanResult>> {
    return request(
      this.baseUrl,
      this.getNamespacePath('/plan'),
      this.apiKey,
      {
        method: 'POST',
        body: input,
        timeoutMs: this.timeoutMs,
      },
    ) as Promise<CodraSuccessResponse<CodraPlanResult>>
  }
}
