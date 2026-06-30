import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { Talocode, TalocodeInsufficientCreditsError, TalocodeAuthError, TalocodeRateLimitError, TalocodeValidationError, TalocodeError, TalocodeNotImplementedError, createStacklaneClient } from '../index'

describe('Talocode SDK', () => {
  const originalEnv = { ...process.env }

  after(() => {
    process.env = { ...originalEnv }
  })

  describe('default config', () => {
    it('uses default base URL when no env or option set', () => {
      delete process.env.TALOCODE_BASE_URL
      delete process.env.TALOCODE_API_KEY
      const c = new Talocode()
      assert.strictEqual(c.baseUrl, 'https://api.talocode.xyz')
      assert.strictEqual(c.apiKey, undefined)
      assert.strictEqual(c.timeoutMs, 30000)
    })

    it('loads base URL from env', () => {
      process.env.TALOCODE_BASE_URL = 'https://env.test'
      const c = new Talocode()
      assert.strictEqual(c.baseUrl, 'https://env.test')
    })

    it('loads API key from env', () => {
      process.env.TALOCODE_API_KEY = 'tk_env_key_xxx'
      const c = new Talocode()
      assert.strictEqual(c.apiKey, 'tk_env_key_xxx')
    })

    it('options override env', () => {
      process.env.TALOCODE_BASE_URL = 'https://env.test'
      process.env.TALOCODE_API_KEY = 'tk_env_key'
      const c = new Talocode({ baseUrl: 'https://custom.test', apiKey: 'tk_custom_key' })
      assert.strictEqual(c.baseUrl, 'https://custom.test')
      assert.strictEqual(c.apiKey, 'tk_custom_key')
    })

    it('accepts custom timeout', () => {
      const c = new Talocode({ timeoutMs: 10000 })
      assert.strictEqual(c.timeoutMs, 10000)
    })
  })

  describe('namespaces', () => {
    it('has tera namespace', () => {
      const c = new Talocode()
      assert.ok(c.tera)
      assert.strictEqual(typeof c.tera.rewrite, 'function')
      assert.strictEqual(typeof c.tera.draft, 'function')
      assert.strictEqual(typeof c.tera.explain, 'function')
      assert.strictEqual(typeof c.tera.review, 'function')
      assert.strictEqual(typeof c.tera.health, 'function')
      assert.strictEqual(typeof c.tera.capabilities, 'function')
      assert.strictEqual(typeof c.tera.pricing, 'function')
    })

    it('has router namespace', () => {
      const c = new Talocode()
      assert.ok(c.router)
      assert.strictEqual(typeof c.router.chat, 'function')
      assert.strictEqual(typeof c.router.models, 'function')
      assert.strictEqual(typeof c.router.providers, 'function')
      assert.strictEqual(typeof c.router.health, 'function')
    })

    it('has agentBrowser namespace', () => {
      const c = new Talocode()
      assert.ok(c.agentBrowser)
      assert.strictEqual(typeof c.agentBrowser.check, 'function')
      assert.strictEqual(typeof c.agentBrowser.screenshot, 'function')
      assert.strictEqual(typeof c.agentBrowser.traceReport, 'function')
    })

    it('has cliploop namespace', () => {
      const c = new Talocode()
      assert.ok(c.cliploop)
      assert.strictEqual(typeof c.cliploop.brief, 'function')
      assert.strictEqual(typeof c.cliploop.script, 'function')
      assert.strictEqual(typeof c.cliploop.render, 'function')
      assert.strictEqual(typeof c.cliploop.campaign.create, 'function')
      assert.strictEqual(typeof c.cliploop.campaign.package, 'function')
    })

    it('has codra namespace', () => {
      const c = new Talocode()
      assert.ok(c.codra)
      assert.strictEqual(typeof c.codra.repoSummary, 'function')
      assert.strictEqual(typeof c.codra.explain, 'function')
      assert.strictEqual(typeof c.codra.review, 'function')
      assert.strictEqual(typeof c.codra.plan, 'function')
    })

    it('has placeholder namespaces (tradia, signallane, worklane)', () => {
      const c = new Talocode()
      assert.ok(c.tradia)
      assert.ok(c.signallane)
      assert.ok(c.worklane)
      assert.strictEqual(typeof c.tradia.analyze, 'function')
      assert.strictEqual(typeof c.signallane.detect, 'function')
      assert.strictEqual(typeof c.worklane.run, 'function')
    })

    it('placeholder namespaces throw TalocodeNotImplementedError', async () => {
      const c = new Talocode()
      await assert.rejects(() => c.tradia.analyze(), TalocodeNotImplementedError)
      await assert.rejects(() => c.signallane.detect(), TalocodeNotImplementedError)
      await assert.rejects(() => c.worklane.run(), TalocodeNotImplementedError)
    })
  })

  describe('route paths', () => {
    const c = new Talocode({ apiKey: 'test-key' })

    it('tera.rewrite uses /v1/tera/writing/rewrite', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', object: 'ok', result: { text: 'test', notes: [] }, usage: { credits: 5, action: 'writing.rewrite' } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        await c.tera.rewrite({ text: 'Hello', style: 'clear', maxLength: 100 })
        assert.ok(capturedUrl.includes('/v1/tera/writing/rewrite'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('tera.review uses /v1/tera/coding/review', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', object: 'ok', result: { issues: [], summary: '', score: 0 }, usage: { credits: 20, action: 'coding.review' } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        await c.tera.review({ language: 'ts', code: 'const a=1', focus: ['bugs'] })
        assert.ok(capturedUrl.includes('/v1/tera/coding/review'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('router.chat uses /v1/router/chat/completions', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'chat', object: 'chat.completion', created: 1, model: 'test', provider: 'mock', choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        await c.router.chat({ model: 'test', messages: [{ role: 'user', content: 'hi' }] })
        assert.ok(capturedUrl.includes('/v1/router/chat/completions'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('cliploop.brief uses /v1/cliploop/brief/generate', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', brief: 'test', channel: 'twitter', estimatedDuration: 15 }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.cliploop.brief({ prompt: 'Test video', channel: 'twitter' })
        assert.ok(capturedUrl.includes('/v1/cliploop/brief/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('cliploop.render uses /v1/cliploop/video/render', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', status: 'rendering', duration: 30, creditsCharged: 200 }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.cliploop.render({ scriptId: 's1', format: 'portrait' })
        assert.ok(capturedUrl.includes('/v1/cliploop/video/render'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('cliploop.campaign.create uses /v1/cliploop/campaign/create', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'camp1', name: 'test', status: 'draft', videos: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.cliploop.campaign.create({ name: 'test', platform: 'twitter' })
        assert.ok(capturedUrl.includes('/v1/cliploop/campaign/create'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('codra.repoSummary uses /v1/codra/repo-summary', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', object: 'codra.repo_summary', result: { summary: '', architecture: [], risks: [], nextSteps: [] }, usage: { credits: 50, action: 'codra.repo.summary' } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.codra.repoSummary({ files: [{ path: 't.ts', content: 'x' }] })
        assert.ok(capturedUrl.includes('/v1/codra/repo-summary'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('codra.explain uses /v1/codra/explain', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', object: 'codra.explain', result: { explanation: '', keyConcepts: [] }, usage: { credits: 20, action: 'codra.explain' } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.codra.explain({ language: 'ts', code: 'x' })
        assert.ok(capturedUrl.includes('/v1/codra/explain'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('codra.review uses /v1/codra/review', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', object: 'codra.review', result: { issues: [], summary: '', score: 0 }, usage: { credits: 40, action: 'codra.review' } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.codra.review({ language: 'ts', code: 'x' })
        assert.ok(capturedUrl.includes('/v1/codra/review'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('codra.plan uses /v1/codra/plan', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', object: 'codra.plan', result: { plan: '', steps: [], risks: [], estimatedEffort: '' }, usage: { credits: 40, action: 'codra.plan' } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.codra.plan({ task: 'test task' })
        assert.ok(capturedUrl.includes('/v1/codra/plan'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('agentBrowser.check uses /v1/agent-browser/check', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ status: 'up', statusCode: 200, checks: [], durationMs: 100, url: 'https://example.com' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        await c.agentBrowser.check({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/agent-browser/check'))
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })

  describe('Authorization header', () => {
    it('sends Bearer token', async () => {
      let capturedAuth = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
        capturedAuth = (opts?.headers as Record<string, string>)['Authorization'] ?? ''
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'tk_my_key' })
        await c.tera.health()
        assert.strictEqual(capturedAuth, 'Bearer tk_my_key')
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })

  describe('legacy compatibility', () => {
  it('createStacklaneClient still works', () => {
    const client = createStacklaneClient({ baseUrl: 'http://localhost:4000' })
    assert.ok(client)
    assert.strictEqual(typeof client.health, 'function')
    assert.strictEqual(typeof client.projects.list, 'function')
    assert.strictEqual(typeof client.tokens.verify, 'function')
  })
})

describe('error handling', () => {
    it('401 maps to TalocodeAuthError', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ error: { code: 'missing_api_key', message: 'Missing API key.' } }), { status: 401, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'bad' })
        await c.tera.health()
        assert.fail('Should have thrown')
      } catch (err) {
        assert.ok(err instanceof TalocodeAuthError)
        assert.strictEqual((err as TalocodeAuthError).status, 401)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('402 maps to TalocodeInsufficientCreditsError', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ data: { ok: false, error: 'insufficient_credits', required: 5, available: 2 } }), { status: 402, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'low-balance' })
        await c.tera.rewrite({ text: 'test', style: 'clear' })
        assert.fail('Should have thrown')
      } catch (err) {
        assert.ok(err instanceof TalocodeInsufficientCreditsError)
        assert.strictEqual((err as TalocodeInsufficientCreditsError).status, 402)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('429 maps to TalocodeRateLimitError', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ error: { code: 'rate_limit', message: 'Too many requests.' } }), { status: 429, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test' })
        await c.router.models()
        assert.fail('Should have thrown')
      } catch (err) {
        assert.ok(err instanceof TalocodeRateLimitError)
        assert.strictEqual((err as TalocodeRateLimitError).status, 429)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('400 maps to TalocodeValidationError', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ error: { code: 'invalid_request', message: 'Invalid input.', details: { text: 'required' } } }), { status: 400, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test' })
        await c.tera.rewrite({ text: '', style: 'clear' })
        assert.fail('Should have thrown')
      } catch (err) {
        assert.ok(err instanceof TalocodeValidationError)
        assert.strictEqual((err as TalocodeValidationError).status, 400)
        assert.ok((err as TalocodeValidationError).details)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('timeout throws TalocodeError', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
        return new Promise((_, reject) => {
          const signal = (opts as RequestInit & { signal?: AbortSignal })?.signal
          if (signal) {
            signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted', 'AbortError')))
          }
        })
      }
      try {
        const c = new Talocode({ apiKey: 'test', timeoutMs: 1 })
        await c.tera.health()
        assert.fail('Should have thrown')
      } catch (err) {
        assert.ok(err instanceof TalocodeError)
        assert.strictEqual((err as TalocodeError).code, 'timeout')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('API key is not leaked in error messages', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ error: { code: 'internal_error', message: 'Server error' } }), { status: 500, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'sk-my-secret-key-12345' })
        await c.tera.health()
        assert.fail('Should have thrown')
      } catch (err) {
        const msg = (err as Error).message
        assert.ok(!msg.includes('sk-my-secret-key-12345'), 'Error message leaked API key')
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })
})
