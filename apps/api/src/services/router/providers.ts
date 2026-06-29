import type { ProviderName, ProviderResult, RouterRequest, RouterResponse } from './config'
import { makeRequestId, estimateTokens } from './config'

interface ProviderConfig {
  name: ProviderName
  label: string
  baseUrl: string
  apiKeyEnv: string
  defaultModel: string
  status: 'configured' | 'unconfigured'
}

export const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  openai: {
    name: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    status: process.env.OPENAI_API_KEY ? 'configured' : 'unconfigured'
  },
  openrouter: {
    name: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'openai/gpt-4o-mini',
    status: process.env.OPENROUTER_API_KEY ? 'configured' : 'unconfigured'
  },
  gemini: {
    name: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
    status: process.env.GEMINI_API_KEY ? 'configured' : 'unconfigured'
  },
  mock: {
    name: 'mock',
    label: 'Mock (development only)',
    baseUrl: '',
    apiKeyEnv: '',
    defaultModel: 'mock-model',
    status: 'configured'
  }
}

export function listConfiguredProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(p => p.status === 'configured')
}

export function getProvider(providerName: ProviderName): ProviderConfig | null {
  return PROVIDER_CONFIGS[providerName] || null
}

export function isProviderConfigured(providerName: ProviderName): boolean {
  const provider = PROVIDER_CONFIGS[providerName]
  return provider ? provider.status === 'configured' : false
}

function redactApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return key.slice(0, 3) + '...' + key.slice(-3)
  return key.slice(0, 4) + '...' + key.slice(-4)
}

function buildOpenAiRequest(routerReq: RouterRequest, providerConfig: ProviderConfig): Record<string, unknown> {
  return {
    model: routerReq.model || providerConfig.defaultModel,
    messages: routerReq.messages,
    max_tokens: routerReq.max_tokens ?? 4096,
    temperature: routerReq.temperature ?? 0.7,
    stream: routerReq.stream ?? false
  }
}

function parseOpenAiResponse(raw: string, provider: string): RouterResponse {
  const parsed = JSON.parse(raw)
  const inputTokens = parsed.usage?.prompt_tokens ?? 0
  const outputTokens = parsed.usage?.completion_tokens ?? 0

  return {
    id: parsed.id || makeRequestId(),
    object: parsed.object || 'chat.completion',
    created: parsed.created || Math.floor(Date.now() / 1000),
    model: parsed.model || '',
    provider,
    choices: (parsed.choices || []).map((c: Record<string, unknown>, i: number) => ({
      index: c.index != null ? (c.index as number) : i,
      message: {
        role: (c.message as Record<string, string>)?.role || 'assistant',
        content: (c.message as Record<string, string>)?.content || ''
      },
      finish_reason: (c.finish_reason as string) || 'stop'
    })),
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    }
  }
}

function buildGeminiRequest(routerReq: RouterRequest, providerConfig: ProviderConfig): Record<string, unknown> {
  const contents = routerReq.messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }]
  }))
  return {
    contents,
    generationConfig: {
      maxOutputTokens: routerReq.max_tokens ?? 4096,
      temperature: routerReq.temperature ?? 0.7
    }
  }
}

function parseGeminiResponse(raw: string, provider: string): RouterResponse {
  const parsed = JSON.parse(raw)
  const candidates = parsed.candidates || []
  const content = candidates[0]?.content || {}
  const parts = content.parts || []
  const text = parts.map((p: Record<string, unknown>) => p.text || '').join('')
  const usageMetadata = parsed.usageMetadata || {}

  const inputTokens = usageMetadata.promptTokenCount || estimateTokens(text)
  const outputTokens = usageMetadata.candidatesTokenCount || 0

  return {
    id: makeRequestId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: parsed.modelVersion || '',
    provider,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: candidates[0]?.finishReason?.toLowerCase() || 'stop'
    }],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    }
  }
}

function mockProviderResponse(routerReq: RouterRequest): RouterResponse {
  const inputText = routerReq.messages.map(m => m.content).join(' ')
  const inputTokens = estimateTokens(inputText)
  const outputTokens = Math.max(10, Math.round(inputTokens * 0.3))
  const mockContent = `This is a mock response for model "${routerReq.model}". In production, this request would be routed to a real AI provider. The request contained ${routerReq.messages.length} message(s) with approximately ${inputTokens} input tokens.`

  return {
    id: makeRequestId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: routerReq.model || 'mock-model',
    provider: 'mock',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: mockContent },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    }
  }
}

export async function callProvider(
  providerName: ProviderName,
  routerReq: RouterRequest
): Promise<ProviderResult> {
  const providerConfig = getProvider(providerName)
  if (!providerConfig) {
    return {
      success: false,
      error: { code: 'UNKNOWN_PROVIDER', message: `Provider '${providerName}' is not defined.`, statusCode: 500 },
      provider: providerName,
      model: routerReq.model
    }
  }

  if (providerConfig.status === 'unconfigured') {
    return {
      success: false,
      error: { code: 'PROVIDER_NOT_CONFIGURED', message: `Provider '${providerConfig.label}' is not configured. Set ${providerConfig.apiKeyEnv} environment variable.`, statusCode: 501 },
      provider: providerName,
      model: routerReq.model
    }
  }

  if (providerName === 'mock') {
    const response = mockProviderResponse(routerReq)
    return {
      success: true,
      response,
      provider: 'mock',
      model: routerReq.model,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens
    }
  }

  const apiKey = process.env[providerConfig.apiKeyEnv]
  if (!apiKey) {
    return {
      success: false,
      error: { code: 'MISSING_API_KEY', message: `${providerConfig.label} API key not found.`, statusCode: 500 },
      provider: providerName,
      model: routerReq.model
    }
  }

  try {
    const body = providerName === 'gemini' ? buildGeminiRequest(routerReq, providerConfig) : buildOpenAiRequest(routerReq, providerConfig)
    const url = providerName === 'gemini'
      ? `${providerConfig.baseUrl}/models/${providerConfig.defaultModel}:generateContent?key=${apiKey}`
      : `${providerConfig.baseUrl}/chat/completions`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (providerName !== 'gemini') {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    if (providerName === 'openrouter') {
      headers['HTTP-Referer'] = 'https://talocode.xyz'
      headers['X-Title'] = 'Talocode Cloud Router'
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })

    clearTimeout(timeout)
    const raw = await fetchResponse.text()

    if (!fetchResponse.ok) {
      const statusCode = fetchResponse.status
      if (statusCode === 429 || statusCode >= 500) {
        return {
          success: false,
          error: {
            code: statusCode === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR',
            message: `${providerConfig.label} returned ${statusCode}: ${raw.slice(0, 200)}`,
            statusCode
          },
          provider: providerName,
          model: routerReq.model
        }
      }

      return {
        success: false,
        error: {
          code: 'PROVIDER_REJECTED',
          message: `${providerConfig.label} rejected request: ${raw.slice(0, 200)}`,
          statusCode
        },
        provider: providerName,
        model: routerReq.model
      }
    }

    const response = providerName === 'gemini'
      ? parseGeminiResponse(raw, providerName)
      : parseOpenAiResponse(raw, providerName)

    return {
      success: true,
      response,
      provider: providerName,
      model: response.model,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: { code: 'TIMEOUT', message: `${providerConfig.label} request timed out after 30s.`, statusCode: 504 },
        provider: providerName,
        model: routerReq.model
      }
    }
    return {
      success: false,
      error: { code: 'PROVIDER_UNAVAILABLE', message: `${providerConfig.label} unavailable: ${message}`, statusCode: 503 },
      provider: providerName,
      model: routerReq.model
    }
  }
}

export function logProviderCall(providerName: ProviderName, apiKey: string | undefined): void {
  if (process.env.NODE_ENV === 'development' || process.env.TALOCODE_ROUTER_DEBUG === 'true') {
    console.log(`[Router] Calling provider: ${providerName} (key: ${apiKey ? redactApiKey(apiKey) : 'none'})`)
  }
}
