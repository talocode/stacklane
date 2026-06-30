import { request } from './request'
import type {
  ClipLoopBriefInput,
  ClipLoopBriefResult,
  ClipLoopScriptInput,
  ClipLoopScriptResult,
  ClipLoopVideoRenderInput,
  ClipLoopVideoRenderResult,
  ClipLoopCampaignCreateInput,
  ClipLoopCampaignResult,
} from './types'

export class ClipLoopClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

  private getNamespacePath(path: string): string {
    return `/v1/cliploop${path}`
  }

  async brief(input: ClipLoopBriefInput): Promise<ClipLoopBriefResult> {
    return request(this.baseUrl, this.getNamespacePath('/brief/generate'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<ClipLoopBriefResult>
  }

  async script(input: ClipLoopScriptInput): Promise<ClipLoopScriptResult> {
    return request(this.baseUrl, this.getNamespacePath('/script/generate'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<ClipLoopScriptResult>
  }

  async render(input: ClipLoopVideoRenderInput): Promise<ClipLoopVideoRenderResult> {
    return request(this.baseUrl, this.getNamespacePath('/video/render'), this.apiKey, {
      method: 'POST',
      body: input,
      timeoutMs: this.timeoutMs,
    }) as Promise<ClipLoopVideoRenderResult>
  }

  campaign = {
    create: async (input: ClipLoopCampaignCreateInput): Promise<ClipLoopCampaignResult> => {
      return request(this.baseUrl, this.getNamespacePath('/campaign/create'), this.apiKey, {
        method: 'POST',
        body: input,
        timeoutMs: this.timeoutMs,
      }) as Promise<ClipLoopCampaignResult>
    },

    package: async (input: { campaignId: string }): Promise<ClipLoopCampaignResult> => {
      return request(this.baseUrl, this.getNamespacePath('/campaign/package'), this.apiKey, {
        method: 'POST',
        body: input,
        timeoutMs: this.timeoutMs,
      }) as Promise<ClipLoopCampaignResult>
    },
  }
}
