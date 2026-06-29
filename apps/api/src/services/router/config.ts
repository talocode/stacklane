import { randomUUID } from 'node:crypto'

export const TALOCODE_ROUTER_MODELS = {
  'talocode/auto': {
    fallback: ['openrouter', 'openai', 'gemini'],
    creditsPerRequest: 2,
    creditsPer1kInputTokens: 1,
    creditsPer1kOutputTokens: 2
  },
  'talocode/fast': {
    fallback: ['openrouter', 'gemini'],
    creditsPerRequest: 1,
    creditsPer1kInputTokens: 1,
    creditsPer1kOutputTokens: 1
  },
  'talocode/coding': {
    fallback: ['openrouter', 'openai'],
    creditsPerRequest: 3,
    creditsPer1kInputTokens: 2,
    creditsPer1kOutputTokens: 4
  }
} as const

export type TalocodeRouterModel = keyof typeof TALOCODE_ROUTER_MODELS
export type ProviderName = 'openai' | 'openrouter' | 'gemini' | 'mock'

export interface RouterModelConfig {
  fallback: ProviderName[]
  creditsPerRequest: number
  creditsPer1kInputTokens: number
  creditsPer1kOutputTokens: number
}

export interface RouterRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
  stream?: boolean
  [key: string]: unknown
}

export interface RouterResponse {
  id: string
  object: string
  created: number
  model: string
  provider: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ProviderResult {
  success: boolean
  response?: RouterResponse
  error?: { code: string; message: string; statusCode: number }
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
}

export interface CompressionResult {
  compressedText: string
  originalLength: number
  compressedLength: number
  savedPercent: number
  warnings: string[]
}

export interface RouterChargeResult {
  requestId: string
  projectId?: string
  creditsCharged: number
  provider: string
  model: string
  inputTokensEstimate: number
  outputTokensEstimate: number
  status: string
}

export function getRouterModelConfig(modelName: string): RouterModelConfig | null {
  if (modelName in TALOCODE_ROUTER_MODELS) {
    return TALOCODE_ROUTER_MODELS[modelName as TalocodeRouterModel] as RouterModelConfig
  }
  return null
}

export function isRouterModel(modelName: string): boolean {
  return modelName in TALOCODE_ROUTER_MODELS
}

export function availableProviders(): ProviderName[] {
  const providers: ProviderName[] = []
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter')
  if (process.env.GEMINI_API_KEY) providers.push('gemini')
  providers.push('mock')
  return providers
}

export function defaultProvider(): string {
  return process.env.TALOCODE_ROUTER_DEFAULT_PROVIDER || 'openrouter'
}

export function fallbackOrder(): string[] {
  const env = process.env.TALOCODE_ROUTER_FALLBACK_ORDER
  if (env) return env.split(',').map(s => s.trim()).filter(Boolean)
  return ['openrouter', 'openai', 'gemini']
}

export function isCompressionEnabled(): boolean {
  return process.env.TALOCODE_ROUTER_ENABLE_COMPRESSION === 'true'
}

export function makeRequestId(): string {
  return `talocode_req_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

export function estimateTokens(text: string): number {
  let tokens = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) {
      tokens += 2
    } else if (code >= 0x0600 && code <= 0x06ff) {
      tokens += 2
    } else {
      tokens += text[i].match(/[a-zA-Z0-9]/) ? 0.25 : 0.5
    }
  }
  return Math.max(1, Math.ceil(tokens))
}

export function computeRequestCredits(config: RouterModelConfig, inputTokens: number, outputTokens: number): number {
  const inputCredits = Math.ceil((inputTokens / 1000) * config.creditsPer1kInputTokens)
  const outputCredits = Math.ceil((outputTokens / 1000) * config.creditsPer1kOutputTokens)
  return config.creditsPerRequest + inputCredits + outputCredits
}

export function computeTokenEstimatesFromMessages(messages: Array<{ role: string; content: string }>): number {
  let total = 0
  for (const msg of messages) {
    total += estimateTokens(msg.content)
    total += estimateTokens(msg.role)
  }
  return total
}
