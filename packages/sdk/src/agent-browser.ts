import { request } from './request'
import type {
  AgentBrowserCheckInput,
  AgentBrowserCheckResult,
  AgentBrowserScreenshotInput,
  AgentBrowserScreenshotResult,
  AgentBrowserTraceReportInput,
  AgentBrowserTraceReportResult,
  AgentBrowserExtractInput,
  AgentBrowserExtractResult,
  AgentBrowserAnalyzeInput,
  AgentBrowserAnalyzeResult,
} from './types'

export class AgentBrowserClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

  private getNamespacePath(path: string): string {
    return `/v1/agent-browser${path}`
  }

  async check(input: AgentBrowserCheckInput): Promise<AgentBrowserCheckResult> {
    return request(this.baseUrl, this.getNamespacePath('/check'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<AgentBrowserCheckResult>
  }

  async screenshot(input: AgentBrowserScreenshotInput): Promise<AgentBrowserScreenshotResult> {
    return request(this.baseUrl, this.getNamespacePath('/screenshot'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<AgentBrowserScreenshotResult>
  }

  async traceReport(input: AgentBrowserTraceReportInput): Promise<AgentBrowserTraceReportResult> {
    return request(this.baseUrl, this.getNamespacePath('/trace-report'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<AgentBrowserTraceReportResult>
  }

  async extract(input: AgentBrowserExtractInput): Promise<AgentBrowserExtractResult> {
    return request(this.baseUrl, this.getNamespacePath('/extract'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<AgentBrowserExtractResult>
  }

  async analyze(input: AgentBrowserAnalyzeInput): Promise<AgentBrowserAnalyzeResult> {
    return request(this.baseUrl, this.getNamespacePath('/analyze'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<AgentBrowserAnalyzeResult>
  }
}
