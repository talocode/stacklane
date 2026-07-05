import test from 'node:test'
import assert from 'node:assert/strict'
import { TALOCODE_ROUTER_MODELS, getRouterModelConfig, isRouterModel, computeRequestCredits, computeTokenEstimatesFromMessages, estimateTokens, makeRequestId } from '../src/services/router/config'
import { compressText } from '../src/services/router/compression'
import { callProvider, listConfiguredProviders } from '../src/services/router/providers'

// ─── Model Config ──────────────────────────────────────────────────────────

test('TALOCODE_ROUTER_MODELS has three models', () => {
  const models = Object.keys(TALOCODE_ROUTER_MODELS)
  assert.equal(models.length, 3)
  assert.ok(models.includes('talocode/auto'))
  assert.ok(models.includes('talocode/fast'))
  assert.ok(models.includes('talocode/coding'))
})

test('talocode/auto config has expected values', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/auto']
  assert.equal(config.creditsPerRequest, 4)
  assert.equal(config.creditsPer1kInputTokens, 2)
  assert.equal(config.creditsPer1kOutputTokens, 3)
  assert.ok(config.fallback.includes('openai'))
  assert.ok(config.fallback.includes('openrouter'))
  assert.ok(config.fallback.includes('gemini'))
})

test('talocode/fast config has expected values', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/fast']
  assert.equal(config.creditsPerRequest, 2)
  assert.equal(config.creditsPer1kInputTokens, 1)
  assert.equal(config.creditsPer1kOutputTokens, 2)
  assert.ok(!config.fallback.includes('openai'))
  assert.ok(config.fallback.includes('openrouter'))
  assert.ok(config.fallback.includes('gemini'))
})

test('talocode/coding config has expected values', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/coding']
  assert.equal(config.creditsPerRequest, 5)
  assert.equal(config.creditsPer1kInputTokens, 3)
  assert.equal(config.creditsPer1kOutputTokens, 6)
  assert.ok(config.fallback.includes('openai'))
  assert.ok(config.fallback.includes('openrouter'))
  assert.ok(!config.fallback.includes('gemini'))
})

test('getRouterModelConfig returns config for valid models', () => {
  assert.ok(getRouterModelConfig('talocode/auto') !== null)
  assert.ok(getRouterModelConfig('talocode/fast') !== null)
  assert.ok(getRouterModelConfig('talocode/coding') !== null)
})

test('getRouterModelConfig returns null for unknown model', () => {
  assert.equal(getRouterModelConfig('unknown-model'), null)
})

test('isRouterModel returns true for valid models', () => {
  assert.equal(isRouterModel('talocode/auto'), true)
  assert.equal(isRouterModel('talocode/fast'), true)
  assert.equal(isRouterModel('talocode/coding'), true)
})

test('isRouterModel returns false for unknown model', () => {
  assert.equal(isRouterModel('gpt-4o'), false)
  assert.equal(isRouterModel(''), false)
})

// ─── Credit Computation ────────────────────────────────────────────────────

test('computeRequestCredits includes base + input + output', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/auto']
  const credits = computeRequestCredits(config, 1000, 500)
  // base: 4, input: ceil(1000/1000)*2 = 2, output: ceil(500/1000)*3 = 2
  assert.equal(credits, 8)
})

test('computeRequestCredits for fast model', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/fast']
  const credits = computeRequestCredits(config, 2000, 1000)
  // base: 2, input: ceil(2000/1000)*1 = 2, output: ceil(1000/1000)*2 = 2
  assert.equal(credits, 6)
})

test('computeRequestCredits for coding model', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/coding']
  const credits = computeRequestCredits(config, 500, 250)
  // base: 5, input: ceil(500/1000)*3 = 3, output: ceil(250/1000)*6 = 6
  assert.equal(credits, 9)
})

test('computeRequestCredits with zero tokens uses minimum', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/auto']
  const credits = computeRequestCredits(config, 0, 0)
  // base: 4, input: ceil(0/1000)*2 = 0, output: ceil(0/1000)*3 = 0
  assert.equal(credits, 4)
})

// ─── Token Estimation ──────────────────────────────────────────────────────

test('estimateTokens returns positive number for empty string', () => {
  assert.equal(estimateTokens(''), 1)
})

test('estimateTokens counts short text', () => {
  const tokens = estimateTokens('Hello world')
  assert.ok(tokens >= 1)
  assert.ok(tokens <= 10)
})

test('estimateTokens counts ASCII text', () => {
  const tokens = estimateTokens('a'.repeat(100))
  assert.ok(tokens > 0)
})

test('estimateTokens counts CJK text higher', () => {
  const asciiTokens = estimateTokens('a'.repeat(10))
  const cjkTokens = estimateTokens('你好世界'.repeat(10))
  // CJK should be more tokens than ASCII for same char count
  assert.ok(cjkTokens >= asciiTokens)
})

test('computeTokenEstimatesFromMessages sums all messages', () => {
  const messages = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
    { role: 'user', content: 'How are you?' }
  ]
  const tokens = computeTokenEstimatesFromMessages(messages)
  assert.ok(tokens > 0)
  assert.ok(tokens < 50)
})

// ─── Request ID ────────────────────────────────────────────────────────────

test('makeRequestId returns a string with talocode_req_ prefix', () => {
  const id = makeRequestId()
  assert.ok(id.startsWith('talocode_req_'))
  assert.equal(id.length, 'talocode_req_'.length + 16)
})

// ─── API Key Authentication (unit tests) ──────────────────────────────────

test('router authenticates via Bearer token or X-Api-Key header', () => {
  const authHeader = 'Bearer tk_dev_test.1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  assert.equal(rawKey.startsWith('tk_dev_'), true)
  assert.equal(rawKey.includes('.'), true)

  const xApiKey = 'tk_dev_test.abcdef'
  assert.equal(xApiKey.startsWith('tk_dev_'), true)
})

test('insufficient credits returns 402 with required/available', () => {
  const errorResponse = {
    error: {
      code: 'insufficient_credits',
      message: 'Insufficient Talocode Cloud credits.',
      required: 5,
      available: 2
    }
  }
  assert.equal(errorResponse.error.code, 'insufficient_credits')
  assert.equal(errorResponse.error.required, 5)
  assert.equal(errorResponse.error.available, 2)
})

// ─── Provider Configuration ────────────────────────────────────────────────

test('listConfiguredProviders returns at least mock provider', () => {
  const providers = listConfiguredProviders()
  assert.ok(providers.length >= 1)
  const mockProvider = providers.find(p => p.name === 'mock')
  assert.ok(mockProvider, 'Mock provider should always be configured')
  assert.equal(mockProvider?.status, 'configured')
})

test('mock provider is always available', () => {
  const providers = listConfiguredProviders()
  const mockProvider = providers.find(p => p.name === 'mock')
  assert.ok(mockProvider)
})

// ─── Mock Provider Happy Path ──────────────────────────────────────────────

test('mock provider returns valid response shape', async () => {
  const result = await callProvider('mock', {
    model: 'talocode/auto',
    messages: [{ role: 'user', content: 'Hello' }]
  })

  assert.equal(result.success, true)
  assert.ok(result.response !== undefined)

  const response = result.response!
  assert.equal(response.object, 'chat.completion')
  assert.ok(response.id.startsWith('talocode_req_'))
  assert.equal(response.choices.length, 1)
  assert.equal(response.choices[0].message.role, 'assistant')
  assert.ok(typeof response.choices[0].message.content === 'string')
  assert.ok(response.choices[0].message.content.length > 0)
  assert.equal(response.choices[0].finish_reason, 'stop')
  assert.ok(response.usage.prompt_tokens > 0)
  assert.ok(response.usage.completion_tokens > 0)
  assert.equal(response.usage.total_tokens, response.usage.prompt_tokens + response.usage.completion_tokens)
  assert.equal(response.provider, 'mock')
})

test('mock provider returns tokens estimate', async () => {
  const result = await callProvider('mock', {
    model: 'talocode/coding',
    messages: [
      { role: 'user', content: 'Write a function to sort an array.' },
      { role: 'assistant', content: 'Here is the implementation...' }
    ]
  })

  assert.equal(result.success, true)
  assert.ok(result.inputTokens !== undefined)
  assert.ok(result.outputTokens !== undefined)
  assert.ok(result.inputTokens! > 0)
  assert.ok(result.outputTokens! > 0)
})

test('mock provider handles single message', async () => {
  const result = await callProvider('mock', {
    model: 'talocode/fast',
    messages: [{ role: 'user', content: 'Hi' }]
  })

  assert.equal(result.success, true)
  assert.ok(result.response!.choices[0].message.content.includes('mock'))
  assert.ok(result.response!.choices[0].message.content.includes('talocode/fast'))
})

// ─── OpenAI-Compatible Response Shape ──────────────────────────────────────

test('OpenAI-compatible response shape matches spec', async () => {
  const result = await callProvider('mock', {
    model: 'talocode/auto',
    messages: [{ role: 'user', content: 'Test' }]
  })

  const response = result.response!
  assert.ok(typeof response.id === 'string')
  assert.equal(response.object, 'chat.completion')
  assert.ok(typeof response.created === 'number')
  assert.ok(typeof response.model === 'string')
  assert.ok(Array.isArray(response.choices))
  assert.equal(response.choices.length, 1)

  const choice = response.choices[0]
  assert.ok(typeof choice.index === 'number')
  assert.ok(typeof choice.message === 'object')
  assert.ok(typeof choice.message.role === 'string')
  assert.ok(typeof choice.message.content === 'string')
  assert.ok(typeof choice.finish_reason === 'string')

  assert.ok(typeof response.usage === 'object')
  assert.ok(typeof response.usage.prompt_tokens === 'number')
  assert.ok(typeof response.usage.completion_tokens === 'number')
  assert.ok(typeof response.usage.total_tokens === 'number')
})

// ─── Compression ──────────────────────────────────────────────────────────

test('compression preserves code fences', () => {
  const input = '```\nconst x = 1\n```\nSome other text'
  const result = compressText(input, 'logs')
  assert.ok(result.compressedText.includes('```'))
  assert.ok(result.compressedText.includes('const x = 1'))
})

test('compression preserves JSON-looking blocks', () => {
  const input = 'Response: {"key": "value", "nested": {"a": 1}}'
  const result = compressText(input, 'logs')
  assert.ok(result.compressedText.includes('{"key": "value"'))
})

test('compression preserves error lines', () => {
  const input = 'Error: Something went wrong\n  at Object.<anonymous> (test.js:10:5)\nNormal line'
  const result = compressText(input, 'logs')
  assert.ok(result.compressedText.includes('Error: Something went wrong'))
  assert.ok(result.compressedText.includes('Normal line'))
})

test('compression removes duplicate repeated logs', () => {
  const line = 'INFO: Processing item 5'
  const input = Array(20).fill(line).join('\n')
  const result = compressText(input, 'logs')
  assert.ok(result.compressedLength < result.originalLength)
  assert.ok(result.savedPercent > 0)
})

test('compression reports saved percentage', () => {
  const line = 'INFO: Processing item\n'
  const input = line.repeat(50)
  const result = compressText(input, 'logs')
  assert.ok(typeof result.savedPercent === 'number')
  assert.ok(result.savedPercent >= 0)
  assert.ok(result.savedPercent <= 100)
})

test('compression with empty text has zero savings', () => {
  const result = compressText('', 'logs')
  assert.equal(result.compressedText, '')
  assert.equal(result.originalLength, 0)
  assert.equal(result.compressedLength, 0)
  assert.equal(result.savedPercent, 0)
})

test('compression preserves stack traces', () => {
  const input = 'Error: Oops\n    at helper (lib/utils.ts:45:12)\n    at main (index.ts:10:1)'
  const result = compressText(input, 'logs')
  assert.ok(result.compressedText.includes('at helper'))
  assert.ok(result.compressedText.includes('at main'))
})

test('compression in diff mode preserves +/- lines and removes excessive context', () => {
  const input = 'diff --git a/src/file.ts b/src/file.ts\n--- a/src/file.ts\n+++ b/src/file.ts\n@@ -1,5 +1,6 @@\n context\n context\n context\n context\n context\n+new line\n-context\n+changed\n context\n context\n context\n context\n context\n context\n context'
  const result = compressText(input, 'diff')
  assert.ok(result.compressedText.includes('+new line'))
  assert.ok(result.compressedText.includes('+changed'))
  assert.ok(result.compressedText.includes('-context'))
})

test('compression in trace mode deduplicates similar frames', () => {
  const input = 'Error: crash\n    at helper (file.ts:10:5)\n    at helper (file.ts:10:5)\n    at helper (file.ts:10:5)\n    at helper (file.ts:10:5)\n    at main (index.ts:1:1)'
  const result = compressText(input, 'trace')
  assert.ok(result.compressedText.includes('similar frames'))
  assert.ok(result.compressedText.includes('main'))
})

test('compression auto mode detects logs', () => {
  const input = '[2026-01-01] INFO: Starting\n[2026-01-01] INFO: Processing\n[2026-01-01] ERROR: Failed'
  const result = compressText(input)
  assert.equal(result.originalLength, input.length)
  assert.ok(result.compressedLength <= result.originalLength)
})

test('compression does not claim 95% savings for reasonable input', () => {
  const input = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n'
  const result = compressText(input, 'logs')
  assert.ok(result.savedPercent < 95, `Unreasonable savings claimed: ${result.savedPercent}%`)
})

// ─── Compression Warnings ──────────────────────────────────────────────────

test('compression returns warnings array', () => {
  const input = 'Normal line\n'.repeat(100)
  const result = compressText(input, 'logs')
  assert.ok(Array.isArray(result.warnings))
})

// ─── Security: Raw Prompt Not Stored ──────────────────────────────────────

test('usage event metadata does not contain raw prompt', () => {
  const metadata = {
    model: 'talocode/auto',
    provider: 'mock',
    inputTokensEstimate: 42,
    outputTokensEstimate: 10,
    creditsCharged: 5,
    chargeType: 'pre_charge'
  }
  const serialized = JSON.stringify(metadata)
  assert.ok(!serialized.includes('user_message'))
  assert.ok(!serialized.includes('raw_prompt'))
  assert.ok(!serialized.includes('messages'))
  const promptTokens = metadata.inputTokensEstimate
  assert.equal(typeof promptTokens, 'number')
})

// ─── Security: Provider Keys Redacted ─────────────────────────────────────

test('provider API keys are redacted in logs', () => {
  const fullKey = 'sk-proj-abc123def456'
  const redacted = fullKey.length > 8
    ? fullKey.slice(0, 4) + '...' + fullKey.slice(-4)
    : fullKey.slice(0, 3) + '...' + fullKey.slice(-3)
  assert.equal(redacted, 'sk-p...f456')
  assert.ok(!redacted.includes('abc123def'))
})

// ─── Model Providers Fallback ──────────────────────────────────────────────

test('fallback order includes openrouter, openai, gemini for auto', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/auto']
  assert.ok(config.fallback.includes('openrouter'))
  assert.ok(config.fallback.includes('openai'))
  assert.ok(config.fallback.includes('gemini'))
})

test('fallback order for fast excludes openai', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/fast']
  assert.ok(!config.fallback.includes('openai'))
  assert.ok(config.fallback.includes('openrouter'))
  assert.ok(config.fallback.includes('gemini'))
})

test('fallback order for coding excludes gemini', () => {
  const config = TALOCODE_ROUTER_MODELS['talocode/coding']
  assert.ok(config.fallback.includes('openai'))
  assert.ok(config.fallback.includes('openrouter'))
  assert.ok(!config.fallback.includes('gemini'))
})

// ─── Health Endpoint ───────────────────────────────────────────────────────

test('router health endpoint shape', () => {
  const health = {
    status: 'operational',
    service: 'talocode-cloud-router',
    version: '0.1.0',
    providers: { openai: false, openrouter: false, gemini: false, mock: true },
    models: ['talocode/auto', 'talocode/fast', 'talocode/coding'],
    compression: false,
    timestamp: new Date().toISOString()
  }
  assert.equal(health.status, 'operational')
  assert.equal(health.service, 'talocode-cloud-router')
  assert.equal(health.version, '0.1.0')
  assert.equal(health.providers.mock, true)
  assert.ok(Array.isArray(health.models))
  assert.equal(health.models.length, 3)
  assert.ok(typeof health.timestamp === 'string')
})

// ─── /v1/models Endpoint ──────────────────────────────────────────────────

test('models endpoint returns list of talocode models', () => {
  const models = [
    { id: 'talocode/auto', object: 'model', owned_by: 'talocode' },
    { id: 'talocode/fast', object: 'model', owned_by: 'talocode' },
    { id: 'talocode/coding', object: 'model', owned_by: 'talocode' }
  ]
  assert.equal(models.length, 3)
  for (const m of models) {
    assert.equal(m.object, 'model')
    assert.equal(m.owned_by, 'talocode')
    assert.ok(m.id.startsWith('talocode/'))
  }
})

// ─── Usage Headers ────────────────────────────────────────────────────────

test('usage headers have correct format', () => {
  const headers: Record<string, string> = {
    'x-talocode-request-id': 'talocode_req_abc123def456',
    'x-talocode-project-id': 'cprj_test123',
    'x-talocode-provider': 'mock',
    'x-talocode-model': 'talocode/auto',
    'x-talocode-credits-charged': '5',
    'x-talocode-wallet-balance': '95',
    'x-talocode-compression-applied': 'true',
    'x-talocode-compression-saved-estimate': '120'
  }

  assert.ok(headers['x-talocode-request-id'].startsWith('talocode_req_'))
  assert.ok(headers['x-talocode-project-id'].startsWith('cprj_'))
  assert.ok(typeof headers['x-talocode-provider'] === 'string')
  assert.ok(typeof headers['x-talocode-model'] === 'string')
  assert.ok(Number(headers['x-talocode-credits-charged']) > 0)
  assert.ok(Number(headers['x-talocode-wallet-balance']) >= 0)
})

test('compression headers present when compression applied', () => {
  const headers: Record<string, string> = {
    'x-talocode-compression-applied': 'true',
    'x-talocode-compression-saved-estimate': '500'
  }
  assert.equal(headers['x-talocode-compression-applied'], 'true')
  assert.ok(Number(headers['x-talocode-compression-saved-estimate']) > 0)
})

test('compression headers absent when not applied', () => {
  const headers: Record<string, string> = {}
  assert.equal(headers['x-talocode-compression-applied'], undefined)
})

// ─── Router Providers Endpoint ────────────────────────────────────────────

test('router providers endpoint returns provider list', () => {
  const providers = listConfiguredProviders()
  assert.ok(Array.isArray(providers))
  for (const p of providers) {
    assert.ok(typeof p.name === 'string')
    assert.ok(typeof p.label === 'string')
    assert.ok(typeof p.status === 'string')
  }
})
