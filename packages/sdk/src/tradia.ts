import { request } from './request'
import type {
  TradiaHealthResponse,
  TradiaSuccessResponse,
} from './types'

export class TradiaClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

  private getNamespacePath(path: string): string {
    return `/v1/tradia${path}`
  }

  async health(): Promise<TradiaHealthResponse> {
    return request(this.baseUrl, this.getNamespacePath('/health'), this.apiKey, {
      method: 'GET',
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaHealthResponse>
  }

  async agentPlan(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/agent/plan'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async marketAnalyze(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/market/analyze'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async signalEvaluate(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/signal/evaluate'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async riskCheck(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/risk/check'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async tradePropose(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/trade/propose'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async tradeJournal(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/trade/journal'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async portfolioReport(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/portfolio/report'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async performanceAnalyze(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/performance/analyze'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async publicUpdateGenerate(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/public-update/generate'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async backtestSimulate(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/backtest/simulate'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async accountabilityCard(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/accountability/card'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async exportMarkdown(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/export/markdown'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }

  async exportJson(input: Record<string, unknown>): Promise<TradiaSuccessResponse> {
    return request(this.baseUrl, this.getNamespacePath('/export/json'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<TradiaSuccessResponse>
  }
}
