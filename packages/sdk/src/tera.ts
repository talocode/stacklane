import { request } from './request'
import type {
  TeraRewriteInput,
  TeraRewriteResult,
  TeraDraftInput,
  TeraDraftResult,
  TeraExplainInput,
  TeraExplainResult,
  TeraReviewInput,
  TeraReviewResult,
  TeraSuccessResponse,
  TeraListResponse,
  TeraCapabilityEntry,
  TeraPricingEntry,
  TeraHealthResponse,
} from './types'

export class TeraClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

  private getNamespacePath(path: string): string {
    return `/v1/tera${path}`
  }

  async rewrite(input: TeraRewriteInput): Promise<TeraSuccessResponse<TeraRewriteResult>> {
    return request(this.baseUrl, this.getNamespacePath('/writing/rewrite'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TeraSuccessResponse<TeraRewriteResult>>
  }

  async draft(input: TeraDraftInput): Promise<TeraSuccessResponse<TeraDraftResult>> {
    return request(this.baseUrl, this.getNamespacePath('/writing/draft'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TeraSuccessResponse<TeraDraftResult>>
  }

  async explain(input: TeraExplainInput): Promise<TeraSuccessResponse<TeraExplainResult>> {
    return request(this.baseUrl, this.getNamespacePath('/coding/explain'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TeraSuccessResponse<TeraExplainResult>>
  }

  async review(input: TeraReviewInput): Promise<TeraSuccessResponse<TeraReviewResult>> {
    return request(this.baseUrl, this.getNamespacePath('/coding/review'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TeraSuccessResponse<TeraReviewResult>>
  }

  async health(): Promise<TeraHealthResponse> {
    return request(this.baseUrl, this.getNamespacePath('/health'), this.apiKey, {
      method: 'GET',
      timeoutMs: this.timeoutMs,
    }) as Promise<TeraHealthResponse>
  }

  async capabilities(): Promise<TeraListResponse<TeraCapabilityEntry>> {
    return request(this.baseUrl, this.getNamespacePath('/capabilities'), this.apiKey, {
      method: 'GET',
      timeoutMs: this.timeoutMs,
    }) as Promise<TeraListResponse<TeraCapabilityEntry>>
  }

  async pricing(): Promise<TeraListResponse<TeraPricingEntry>> {
    return request(this.baseUrl, this.getNamespacePath('/pricing'), this.apiKey, {
      method: 'GET',
      timeoutMs: this.timeoutMs,
    }) as Promise<TeraListResponse<TeraPricingEntry>>
  }
}
