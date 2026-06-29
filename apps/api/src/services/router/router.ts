import type { CloudApiKeyRecord } from '@stacklane/types'
import type { RouterRequest, RouterResponse, ProviderName, RouterChargeResult, RouterModelConfig } from './config'
import { getRouterModelConfig, computeRequestCredits, computeTokenEstimatesFromMessages, makeRequestId, isRouterModel, availableProviders, isCompressionEnabled } from './config'
import { callProvider, logProviderCall } from './providers'
import { compressText } from './compression'
import { authenticateTalocodeApiKey, chargeCredits, checkBalance } from '../cloud-billing'

export interface RouterHandlerResult {
  response: RouterResponse
  charge: RouterChargeResult
  compressionApplied: boolean
  compressionSavedEstimate?: number
}

function shouldFallback(providerError: { code: string; statusCode: number }): boolean {
  if (providerError.statusCode === 429) return true
  if (providerError.statusCode >= 500) return true
  if (providerError.code === 'TIMEOUT') return true
  if (providerError.code === 'PROVIDER_UNAVAILABLE') return true
  return false
}

function estimateOutputTokens(modelConfig: RouterModelConfig, inputTokens: number, maxTokens: number): number {
  const estimatedCompletionRatio = 0.3
  return Math.min(maxTokens, Math.max(1, Math.round(inputTokens * estimatedCompletionRatio)))
}

export async function handleRouterRequest(
  rawKey: string,
  routerReq: RouterRequest
): Promise<RouterHandlerResult> {
  const apiKey = await authenticateTalocodeApiKey(rawKey)
  const modelConfig = getRouterModelConfig(routerReq.model)
  if (!modelConfig) {
    throw Object.assign(new Error(`Unknown model: ${routerReq.model}`), { statusCode: 404, code: 'UNKNOWN_MODEL' })
  }

  const requestId = routerReq.requestId as string || makeRequestId()
  const inputTokens = computeTokenEstimatesFromMessages(routerReq.messages)
  const maxOutputTokens = routerReq.max_tokens ?? 4096
  const estimatedOutputTokens = estimateOutputTokens(modelConfig, inputTokens, maxOutputTokens)
  const preChargeCredits = computeRequestCredits(modelConfig, inputTokens, estimatedOutputTokens)

  if (preChargeCredits <= 0) {
    throw Object.assign(new Error('Estimated credit cost must be positive.'), { statusCode: 422, code: 'INVALID_ESTIMATE' })
  }

  const preChargeResult = await chargeCredits({
    projectId: apiKey.project_id,
    apiKeyId: apiKey.id,
    product: 'talocode_router',
    action: 'chat.completions',
    requestId,
    credits: preChargeCredits,
    metadata: {
      model: routerReq.model,
      provider: undefined,
      inputTokensEstimate: inputTokens,
      outputTokensEstimate: estimatedOutputTokens,
      creditsCharged: preChargeCredits,
      chargeType: 'pre_charge'
    }
  })

  if (!preChargeResult.success) {
    throw Object.assign(new Error('Insufficient Talocode Cloud credits.'), {
      statusCode: 402,
      code: 'insufficient_credits',
      required: preChargeCredits,
      available: preChargeResult.remainingCredits
    })
  }

  let compressionApplied = false
  let compressionSavedEstimate = 0
  let compressedRequest: RouterRequest = routerReq

  if (isCompressionEnabled() && routerReq.messages.length > 0) {
    try {
      const lastContent = routerReq.messages[routerReq.messages.length - 1].content
      if (lastContent.length > 500) {
        const compressed = compressText(lastContent)
        if (compressed.compressedLength < compressed.originalLength) {
          compressionApplied = true
          compressionSavedEstimate = compressed.originalLength - compressed.compressedLength
          compressedRequest = {
            ...routerReq,
            messages: [
              ...routerReq.messages.slice(0, -1),
              { ...routerReq.messages[routerReq.messages.length - 1], content: compressed.compressedText }
            ]
          }
        }
      }
    } catch {
      // Compression is best-effort
    }
  }

  const fallbackList = modelConfig.fallback.filter(p => {
    const provider = availableProviders()
    return provider.includes(p)
  })

  if (!fallbackList.includes('mock')) {
    fallbackList.push('mock')
  }

  if (fallbackList.length === 0) {
    throw Object.assign(new Error('No AI providers are configured. Set at least one provider API key (OPENAI_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY).'), {
      statusCode: 501, code: 'NO_PROVIDERS_CONFIGURED'
    })
  }

  let lastError: { code: string; message: string; statusCode: number } | null = null
  let finalResult: {
    response: RouterResponse
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
  } | null = null

  for (const providerName of fallbackList) {
    logProviderCall(providerName as ProviderName, rawKey)
    const result = await callProvider(providerName as ProviderName, compressedRequest)

    if (result.success && result.response) {
      finalResult = {
        response: result.response,
        provider: result.provider,
        model: result.model || routerReq.model,
        inputTokens: result.inputTokens ?? inputTokens,
        outputTokens: result.outputTokens ?? estimatedOutputTokens
      }
      break
    }

    lastError = result.error || null

    const isLastProvider = providerName === fallbackList[fallbackList.length - 1]
    if (lastError && !shouldFallback(lastError) && isLastProvider) {
      throw Object.assign(new Error(lastError.message), {
        statusCode: lastError.statusCode,
        code: lastError.code
      })
    }
  }

  if (!finalResult) {
    throw Object.assign(new Error(lastError ? lastError.message : 'All providers failed.'), {
      statusCode: lastError?.statusCode || 503,
      code: lastError?.code || 'ALL_PROVIDERS_FAILED',
      details: lastError || {}
    })
  }

  const finalCredits = computeRequestCredits(modelConfig, finalResult.inputTokens, finalResult.outputTokens)
  const deltaCharge = Math.max(0, finalCredits - preChargeCredits)

  if (deltaCharge > 0) {
    const deltaResult = await chargeCredits({
      projectId: apiKey.project_id,
      apiKeyId: apiKey.id,
      product: 'talocode_router',
      action: 'chat.completions',
      requestId: `${requestId}-delta`,
      credits: deltaCharge,
      metadata: {
        model: routerReq.model,
        provider: finalResult.provider,
        inputTokensEstimate: finalResult.inputTokens,
        outputTokensEstimate: finalResult.outputTokens,
        creditsCharged: deltaCharge,
        chargeType: 'delta',
        parentRequestId: requestId
      }
    })

    if (!deltaResult.success) {
      throw Object.assign(new Error('Insufficient Talocode Cloud credits for final charge.'), {
        statusCode: 402,
        code: 'insufficient_credits',
        required: deltaCharge,
        available: deltaResult.remainingCredits
      })
    }
  }

  const totalCredits = preChargeCredits + deltaCharge

  finalResult.response.model = routerReq.model

  const charge: RouterChargeResult = {
    requestId,
    projectId: apiKey.project_id,
    creditsCharged: totalCredits,
    provider: finalResult.provider,
    model: routerReq.model,
    inputTokensEstimate: finalResult.inputTokens,
    outputTokensEstimate: finalResult.outputTokens,
    status: 'success'
  }

  return {
    response: finalResult.response,
    charge,
    compressionApplied,
    compressionSavedEstimate: compressionApplied ? compressionSavedEstimate : undefined
  }
}

export async function getModels() {
  const providers = availableProviders()
  const configured = providers.filter(p => p !== 'mock' || process.env.NODE_ENV === 'development' || process.env.TALOCODE_ROUTER_DEBUG === 'true')

  return [
    {
      id: 'talocode/auto',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'talocode',
      permission: [],
      root: 'talocode/auto',
      parent: null,
      providers: configured
    },
    {
      id: 'talocode/fast',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'talocode',
      permission: [],
      root: 'talocode/fast',
      parent: null,
      providers: configured
    },
    {
      id: 'talocode/coding',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'talocode',
      permission: [],
      root: 'talocode/coding',
      parent: null,
      providers: configured
    }
  ]
}

export async function getRouterHealth() {
  const providers = {
    openai: !!process.env.OPENAI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    mock: true
  }

  return {
    status: 'operational',
    service: 'talocode-cloud-router',
    version: '0.1.0',
    providers,
    models: Object.keys(require('./config').TALOCODE_ROUTER_MODELS),
    compression: isCompressionEnabled(),
    timestamp: new Date().toISOString()
  }
}

export async function getRouterProviders() {
  const configured = listConfiguredProviders()
  return configured.map(p => ({
    name: p.name,
    label: p.label,
    configured: true,
    defaultModel: p.defaultModel
  }))
}

function listConfiguredProviders() {
  const providers: Array<{ name: string; label: string; defaultModel: string }> = []
  if (process.env.OPENAI_API_KEY) providers.push({ name: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' })
  if (process.env.OPENROUTER_API_KEY) providers.push({ name: 'openrouter', label: 'OpenRouter', defaultModel: 'openai/gpt-4o-mini' })
  if (process.env.GEMINI_API_KEY) providers.push({ name: 'gemini', label: 'Gemini', defaultModel: 'gemini-2.0-flash' })
  providers.push({ name: 'mock', label: 'Mock (development only)', defaultModel: 'mock-model' })
  return providers
}

export { authenticateTalocodeApiKey }
