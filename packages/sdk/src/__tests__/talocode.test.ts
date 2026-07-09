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
      assert.strictEqual(c.baseUrl, 'https://api.talocode.site')
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

    it('has placeholder namespaces (tradia, worklane)', () => {
      const c = new Talocode()
      assert.ok(c.tradia)
      assert.ok(c.worklane)
      assert.strictEqual(typeof c.tradia.analyze, 'function')
      assert.strictEqual(typeof c.worklane.run, 'function')
    })

    it('placeholder namespaces throw TalocodeNotImplementedError', async () => {
      const c = new Talocode()
      await assert.rejects(() => c.tradia.analyze(), TalocodeNotImplementedError)
      await assert.rejects(() => c.worklane.run(), TalocodeNotImplementedError)
    })

    it('has invoicelane namespace', () => {
      const c = new Talocode()
      assert.ok(c.invoicelane)
      assert.strictEqual(typeof c.invoicelane.health, 'function')
      assert.strictEqual(typeof c.invoicelane.pricing, 'function')
      assert.strictEqual(typeof c.invoicelane.capabilities, 'function')
      assert.strictEqual(typeof c.invoicelane.extract, 'function')
      assert.strictEqual(typeof c.invoicelane.invoiceExtract, 'function')
      assert.strictEqual(typeof c.invoicelane.receiptExtract, 'function')
      assert.strictEqual(typeof c.invoicelane.validate, 'function')
      assert.strictEqual(typeof c.invoicelane.exportCsv, 'function')
    })

    it('has geolane namespace', () => {
      const c = new Talocode()
      assert.ok(c.geolane)
      assert.strictEqual(typeof c.geolane.health, 'function')
      assert.strictEqual(typeof c.geolane.pricing, 'function')
      assert.strictEqual(typeof c.geolane.capabilities, 'function')
      assert.strictEqual(typeof c.geolane.audit, 'function')
      assert.strictEqual(typeof c.geolane.crawlers, 'function')
      assert.strictEqual(typeof c.geolane.llmsTxt, 'function')
      assert.strictEqual(typeof c.geolane.citationReadiness, 'function')
      assert.strictEqual(typeof c.geolane.compare, 'function')
    })

    it('has searchlane namespace', () => {
      const c = new Talocode()
      assert.ok(c.searchlane)
      assert.strictEqual(typeof c.searchlane.health, 'function')
      assert.strictEqual(typeof c.searchlane.query, 'function')
      assert.strictEqual(typeof c.searchlane.news, 'function')
      assert.strictEqual(typeof c.searchlane.research, 'function')
    })

    it('searchlane.query calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.searchlane.query({ query: 'hello' })
        assert.ok(capturedUrl.includes('/v1/searchlane/query'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('geolane.audit calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ score: 80, grade: 'B' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.geolane.audit({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/geolane/audit'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('invoicelane.health returns expected shape', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ ok: true, service: 'invoicelane', version: '0.2.0' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        const res = await c.invoicelane.health()
        assert.ok(capturedUrl.includes('/v1/invoicelane/health'))
        assert.strictEqual(res.ok, true)
        assert.strictEqual(res.service, 'invoicelane')
        assert.strictEqual(res.version, '0.2.0')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('invoicelane.extract calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { extracted: {} }, usage: { action: 'invoicelane.extract', credits: 20, remaining: 980 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.invoicelane.extract({ text: 'Invoice #123' })
        assert.ok(capturedUrl.includes('/v1/invoicelane/extract'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('invoicelane.invoiceExtract calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { invoice: {} }, usage: { action: 'invoicelane.invoice.extract', credits: 30, remaining: 970 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.invoicelane.invoiceExtract({ text: 'Invoice #123', currency: 'USD' })
        assert.ok(capturedUrl.includes('/v1/invoicelane/invoice/extract'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('invoicelane.receiptExtract calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { receipt: {} }, usage: { action: 'invoicelane.receipt.extract', credits: 20, remaining: 980 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.invoicelane.receiptExtract({ text: 'Receipt from store' })
        assert.ok(capturedUrl.includes('/v1/invoicelane/receipt/extract'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('invoicelane.validate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { valid: true }, usage: { action: 'invoicelane.validate', credits: 10, remaining: 990 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.invoicelane.validate({ documentType: 'invoice', fields: { amount: '100' } })
        assert.ok(capturedUrl.includes('/v1/invoicelane/validate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('invoicelane.exportCsv calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { csv: 'col1,col2\nv1,v2' }, usage: { action: 'invoicelane.export.csv', credits: 5, remaining: 995 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.invoicelane.exportCsv({ rows: [{ col1: 'v1', col2: 'v2' }] })
        assert.ok(capturedUrl.includes('/v1/invoicelane/export/csv'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has webdatalane namespace', () => {
      const c = new Talocode()
      assert.ok(c.webdatalane)
      assert.strictEqual(typeof c.webdatalane.health, 'function')
      assert.strictEqual(typeof c.webdatalane.fetch, 'function')
      assert.strictEqual(typeof c.webdatalane.extract, 'function')
      assert.strictEqual(typeof c.webdatalane.markdown, 'function')
      assert.strictEqual(typeof c.webdatalane.metadata, 'function')
      assert.strictEqual(typeof c.webdatalane.links, 'function')
      assert.strictEqual(typeof c.webdatalane.structured, 'function')
      assert.strictEqual(typeof c.webdatalane.crawlPlan, 'function')
      assert.strictEqual(typeof c.webdatalane.screenshot, 'function')
    })

    it('webdatalane.health returns expected shape', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ ok: true, service: 'webdatalane', version: '0.1.0', timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        const res = await c.webdatalane.health()
        assert.ok(capturedUrl.includes('/v1/webdatalane/health'))
        assert.strictEqual(res.ok, true)
        assert.strictEqual(res.service, 'webdatalane')
        assert.strictEqual(res.version, '0.1.0')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('webdatalane.fetch calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { result: {} }, usage: { action: 'webdatalane.fetch', credits: 5, remaining: 995 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.webdatalane.fetch({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/webdatalane/fetch'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('webdatalane.markdown calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { result: { markdown: '# hi' } }, usage: { action: 'webdatalane.markdown', credits: 10, remaining: 990 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.webdatalane.markdown({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/webdatalane/markdown'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('webdatalane.metadata calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { result: { title: 'Test' } }, usage: { action: 'webdatalane.metadata', credits: 5, remaining: 995 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.webdatalane.metadata({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/webdatalane/metadata'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('webdatalane.links calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { result: { links: [] } }, usage: { action: 'webdatalane.links', credits: 5, remaining: 995 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.webdatalane.links({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/webdatalane/links'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('webdatalane.structured calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { result: { data: {} } }, usage: { action: 'webdatalane.structured', credits: 20, remaining: 980 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.webdatalane.structured({ schema: { title: 'string' } })
        assert.ok(capturedUrl.includes('/v1/webdatalane/structured'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('webdatalane.crawlPlan calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { result: { urls: [] } }, usage: { action: 'webdatalane.crawl.plan', credits: 15, remaining: 985 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.webdatalane.crawlPlan({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/webdatalane/crawl/plan'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('webdatalane.screenshot calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: {}, usage: { action: 'webdatalane.screenshot', credits: 50, remaining: 950 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.webdatalane.screenshot({ url: 'https://example.com' })
        assert.ok(capturedUrl.includes('/v1/webdatalane/screenshot'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has ugclane namespace', () => {
      const c = new Talocode()
      assert.ok(c.ugclane)
      assert.strictEqual(typeof c.ugclane.health, 'function')
      assert.strictEqual(typeof c.ugclane.strategy.generate, 'function')
      assert.strictEqual(typeof c.ugclane.competitor.analyze, 'function')
      assert.strictEqual(typeof c.ugclane.hooks.generate, 'function')
      assert.strictEqual(typeof c.ugclane.scripts.generate, 'function')
      assert.strictEqual(typeof c.ugclane.accounts.plan, 'function')
      assert.strictEqual(typeof c.ugclane.calendar.generate, 'function')
      assert.strictEqual(typeof c.ugclane.experiments.generate, 'function')
      assert.strictEqual(typeof c.ugclane.report.generate, 'function')
      assert.strictEqual(typeof c.ugclane.export.markdown, 'function')
      assert.strictEqual(typeof c.ugclane.export.json, 'function')
    })

    it('ugclane.health returns expected shape', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ ok: true, service: 'ugclane', version: '0.1.0', timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        const res = await c.ugclane.health()
        assert.ok(capturedUrl.includes('/v1/ugclane/health'))
        assert.strictEqual(res.ok, true)
        assert.strictEqual(res.service, 'ugclane')
        assert.strictEqual(res.version, '0.1.0')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.strategy.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { strategy: {} }, usage: { action: 'ugclane.strategy.generate', credits: 30, remaining: 970 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.strategy.generate({ goal: 'grow' })
        assert.ok(capturedUrl.includes('/v1/ugclane/strategy/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.competitor.analyze calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { analysis: [] }, usage: { action: 'ugclane.competitor.analyze', credits: 40, remaining: 960 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.competitor.analyze({ competitors: ['@competitor'] })
        assert.ok(capturedUrl.includes('/v1/ugclane/competitor/analyze'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.hooks.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { hooks: [] }, usage: { action: 'ugclane.hooks.generate', credits: 20, remaining: 980 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.hooks.generate({ topic: 'AI trends' })
        assert.ok(capturedUrl.includes('/v1/ugclane/hooks/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.scripts.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { script: '' }, usage: { action: 'ugclane.scripts.generate', credits: 40, remaining: 960 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.scripts.generate({ topic: 'How to code' })
        assert.ok(capturedUrl.includes('/v1/ugclane/scripts/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.accounts.plan calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { plan: {} }, usage: { action: 'ugclane.accounts.plan', credits: 30, remaining: 970 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.accounts.plan({ platform: 'youtube', goal: 'grow' })
        assert.ok(capturedUrl.includes('/v1/ugclane/accounts/plan'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.calendar.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { calendar: [] }, usage: { action: 'ugclane.calendar.generate', credits: 60, remaining: 940 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.calendar.generate({ platform: 'tiktok' })
        assert.ok(capturedUrl.includes('/v1/ugclane/calendar/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.experiments.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { experiments: [] }, usage: { action: 'ugclane.experiments.generate', credits: 30, remaining: 970 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.experiments.generate({ platform: 'instagram', goal: 'increase engagement' })
        assert.ok(capturedUrl.includes('/v1/ugclane/experiments/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.report.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { report: {} }, usage: { action: 'ugclane.report.generate', credits: 40, remaining: 960 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.report.generate({ platform: 'youtube', period: '30d', metrics: { views: 1000 } })
        assert.ok(capturedUrl.includes('/v1/ugclane/report/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.export.markdown calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { markdown: '# Report' }, usage: { action: 'ugclane.export.markdown', credits: 5, remaining: 995 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.export.markdown({ content: { report: 'data' } })
        assert.ok(capturedUrl.includes('/v1/ugclane/export/markdown'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane.export.json calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { json: {} }, usage: { action: 'ugclane.export.json', credits: 5, remaining: 995 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.ugclane.export.json({ content: { data: 'test' } })
        assert.ok(capturedUrl.includes('/v1/ugclane/export/json'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('ugclane 402 maps to insufficient credits', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ error: { code: 'insufficient_credits', message: 'Insufficient credits', required: 30, available: 10 } }), { status: 402, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'low-balance' })
        await c.ugclane.strategy.generate({ goal: 'grow' })
        assert.fail('Should have thrown')
      } catch (err) {
        assert.ok(capturedUrl.includes('/v1/ugclane/strategy/generate'))
        assert.ok(err instanceof TalocodeInsufficientCreditsError)
        assert.strictEqual((err as TalocodeInsufficientCreditsError).status, 402)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has crawlerlane namespace', () => {
      const c = new Talocode()
      assert.ok(c.crawlerlane)
      assert.strictEqual(typeof c.crawlerlane.health, 'function')
      assert.strictEqual(typeof c.crawlerlane.logs.ingest, 'function')
      assert.strictEqual(typeof c.crawlerlane.bots.classify, 'function')
      assert.strictEqual(typeof c.crawlerlane.pages.analyze, 'function')
      assert.strictEqual(typeof c.crawlerlane.notFound.analyze, 'function')
      assert.strictEqual(typeof c.crawlerlane.aiVisibility.score, 'function')
      assert.strictEqual(typeof c.crawlerlane.report.generate, 'function')
      assert.strictEqual(typeof c.crawlerlane.sitemap.suggest, 'function')
      assert.strictEqual(typeof c.crawlerlane.robots.audit, 'function')
      assert.strictEqual(typeof c.crawlerlane.export.markdown, 'function')
      assert.strictEqual(typeof c.crawlerlane.export.json, 'function')
    })

    it('crawlerlane.bots.classify calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ result: { bot: true }, usage: { action: 'crawlerlane.bots.classify', credits: 2 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.crawlerlane.bots.classify({ userAgent: 'ChatGPT-User' })
        assert.ok(capturedUrl.includes('/v1/crawlerlane/bots/classify'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('crawlerlane.report.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ result: { summary: 'ok' }, usage: { action: 'crawlerlane.report.generate', credits: 40 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.crawlerlane.report.generate({ domain: 'talocode.site', logs: [] })
        assert.ok(capturedUrl.includes('/v1/crawlerlane/report/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has opensourcelane namespace', () => {
      const c = new Talocode()
      assert.ok(c.opensourcelane)
      assert.strictEqual(typeof c.opensourcelane.health, 'function')
      assert.strictEqual(typeof c.opensourcelane.repo.analyze, 'function')
      assert.strictEqual(typeof c.opensourcelane.alternatives.find, 'function')
      assert.strictEqual(typeof c.opensourcelane.migration.plan, 'function')
      assert.strictEqual(typeof c.opensourcelane.cost.estimate, 'function')
      assert.strictEqual(typeof c.opensourcelane.risk.score, 'function')
      assert.strictEqual(typeof c.opensourcelane.brief.generate, 'function')
      assert.strictEqual(typeof c.opensourcelane.tools.compare, 'function')
      assert.strictEqual(typeof c.opensourcelane.deployment.plan, 'function')
      assert.strictEqual(typeof c.opensourcelane.license.audit, 'function')
      assert.strictEqual(typeof c.opensourcelane.export.markdown, 'function')
      assert.strictEqual(typeof c.opensourcelane.export.json, 'function')
    })

    it('opensourcelane.alternatives.find calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ result: { alternatives: [] }, usage: { action: 'opensourcelane.alternatives.find', credits: 30 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.opensourcelane.alternatives.find({ replace: 'Jira', teamSize: 6 })
        assert.ok(capturedUrl.includes('/v1/opensourcelane/alternatives/find'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('opensourcelane.migration.plan calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ result: { phases: [] }, usage: { action: 'opensourcelane.migration.plan', credits: 50 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.opensourcelane.migration.plan({ from: 'Jira', to: 'hudy9x/namviek', teamSize: 6 })
        assert.ok(capturedUrl.includes('/v1/opensourcelane/migration/plan'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has forgecad namespace', () => {
      const c = new Talocode()
      assert.ok(c.forgecad)
      assert.strictEqual(typeof c.forgecad.health, 'function')
      assert.strictEqual(typeof c.forgecad.design.generate, 'function')
      assert.strictEqual(typeof c.forgecad.openscad.generate, 'function')
      assert.strictEqual(typeof c.forgecad.bom.generate, 'function')
      assert.strictEqual(typeof c.forgecad.cutList.generate, 'function')
      assert.strictEqual(typeof c.forgecad.assembly.plan, 'function')
      assert.strictEqual(typeof c.forgecad.printability.check, 'function')
      assert.strictEqual(typeof c.forgecad.manufacturability.check, 'function')
      assert.strictEqual(typeof c.forgecad.design.review, 'function')
      assert.strictEqual(typeof c.forgecad.material.estimate, 'function')
      assert.strictEqual(typeof c.forgecad.tools.detect, 'function')
      assert.strictEqual(typeof c.forgecad.render.openscad, 'function')
      assert.strictEqual(typeof c.forgecad.export.markdown, 'function')
      assert.strictEqual(typeof c.forgecad.export.json, 'function')
    })

    it('forgecad.design.generate calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ result: { humanReviewRequired: true }, usage: { action: 'forgecad.design.generate', credits: 60 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.forgecad.design.generate({ projectType: 'enclosure', description: 'test' })
        assert.ok(capturedUrl.includes('/v1/forgecad/design/generate'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has replylane namespace', () => {
      const c = new Talocode()
      assert.ok(c.replylane)
      assert.strictEqual(typeof c.replylane.health, 'function')
      assert.strictEqual(typeof c.replylane.opportunity.score, 'function')
      assert.strictEqual(typeof c.replylane.targets.rank, 'function')
      assert.strictEqual(typeof c.replylane.replies.draft, 'function')
      assert.strictEqual(typeof c.replylane.replies.risk, 'function')
      assert.strictEqual(typeof c.replylane.posts.grokCheck, 'function')
      assert.strictEqual(typeof c.replylane.activity.audit, 'function')
      assert.strictEqual(typeof c.replylane.feeds.migrate, 'function')
      assert.strictEqual(typeof c.replylane.export.markdown, 'function')
      assert.strictEqual(typeof c.replylane.export.json, 'function')
    })

    it('replylane.opportunity.score calls correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ result: { score: 80 }, usage: { action: 'replylane.opportunity.score', credits: 15 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.replylane.opportunity.score({ tweetText: 'test', authorHandle: 'builder', authorFollowers: 8000 })
        assert.ok(capturedUrl.includes('/v1/replylane/opportunity/score'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has signallane namespace', () => {
      const c = new Talocode()
      assert.ok(c.signallane)
      assert.strictEqual(typeof c.signallane.health, 'function')
      assert.strictEqual(typeof c.signallane.analyze, 'function')
      assert.strictEqual(typeof c.signallane.contentPlan, 'function')
      assert.strictEqual(typeof c.signallane.postDrafts, 'function')
      assert.strictEqual(typeof c.signallane.experiments, 'function')
      assert.strictEqual(typeof c.signallane.report, 'function')
    })

    it('signallane.health returns expected shape', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ ok: true, service: 'signallane', version: '0.1.0' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        const res = await c.signallane.health()
        assert.ok(capturedUrl.includes('/v1/signallane/health'))
        assert.strictEqual(res.ok, true)
        assert.strictEqual(res.service, 'signallane')
        assert.strictEqual(res.version, '0.1.0')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('signallane.analyze calls request with correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { analysis: 'test' }, usage: { action: 'signallane.x.analyze', credits: 60, remaining: 940 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.signallane.analyze({ handle: '@test', goal: 'grow', metrics: { followers: 100 } })
        assert.ok(capturedUrl.includes('/v1/signallane/x/analyze'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('signallane.contentPlan calls request with correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { plan: 'test' }, usage: { action: 'signallane.x.content_plan', credits: 80, remaining: 860 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.signallane.contentPlan({ handle: '@test', goal: 'grow', analysis: {}, week: '2026-W27', cadence: '3x week' })
        assert.ok(capturedUrl.includes('/v1/signallane/x/content-plan'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('signallane.postDrafts calls request with correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { drafts: [] }, usage: { action: 'signallane.x.post_drafts', credits: 50, remaining: 810 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.signallane.postDrafts({ goal: 'grow', voice: 'professional', topics: ['AI', 'tech'] })
        assert.ok(capturedUrl.includes('/v1/signallane/x/post-drafts'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('signallane.experiments calls request with correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { experiments: [] }, usage: { action: 'signallane.x.experiments', credits: 70, remaining: 740 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.signallane.experiments({ goal: 'increase engagement' })
        assert.ok(capturedUrl.includes('/v1/signallane/x/experiments'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('signallane.report calls request with correct path', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ data: { report: 'test' }, usage: { action: 'signallane.x.report', credits: 40, remaining: 700 } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.signallane.report({ handle: '@test', goal: 'grow', metrics: {} })
        assert.ok(capturedUrl.includes('/v1/signallane/x/report'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('has skills namespace', () => {
      const c = new Talocode()
      assert.ok(c.skills)
      assert.strictEqual(typeof c.skills.health, 'function')
      assert.strictEqual(typeof c.skills.generate.githubProfile, 'function')
      assert.strictEqual(typeof c.skills.generate.githubRepo, 'function')
      assert.strictEqual(typeof c.skills.generate.docs, 'function')
      assert.strictEqual(typeof c.skills.generate.text, 'function')
      assert.strictEqual(typeof c.skills.export.cursor, 'function')
      assert.strictEqual(typeof c.skills.export.claude, 'function')
    })

    it('skills routes are correct', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ id: 'test', object: 'skills.generated', source: { type: 'text' }, skill: { name: 'test', title: 'test', description: 'test', skillMd: '# Test', metadata: {} }, exports: {}, usage: { credits: 40, action: 'skills.generate.text' } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.skills.generate.text({ name: 'test', content: 'test content', target: 'cursor' })
        assert.ok(capturedUrl.includes('/v1/skills/generate/text'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('skills health uses /v1/skills/health', async () => {
      let capturedUrl = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = typeof url === 'string' ? url : url.toString()
        return new Response(JSON.stringify({ status: 'ok', version: '0.1.0', endpoints: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        const c = new Talocode({ apiKey: 'test-key' })
        await c.skills.health()
        assert.ok(capturedUrl.includes('/v1/skills/health'))
      } finally {
        globalThis.fetch = origFetch
      }
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
        await c.tera.rewrite({ text: 'test', style: 'clear' })
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
