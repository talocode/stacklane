import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { TalocodeMcpBridgeClient } from '../client'
import { loadConfig, redactApiKey } from '../config'

const ORIGINAL_ENV = { ...process.env }

describe('Talocode MCP Bridge', () => {
  before(() => {
    process.env.TALOCODE_API_KEY = 'tk-test-bridge-key'
    process.env.TALOCODE_MCP_URL = 'http://localhost:4000/mcp'
  })

  after(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  describe('config', () => {
    it('loads TALOCODE_API_KEY from env', () => {
      const config = loadConfig()
      assert.strictEqual(config.apiKey, 'tk-test-bridge-key')
    })

    it('uses default MCP URL when TALOCODE_MCP_URL not set', () => {
      delete process.env.TALOCODE_MCP_URL
      const config = loadConfig()
      assert.strictEqual(config.mcpUrl, 'https://api.talocode.xyz/mcp')
    })

    it('uses custom TALOCODE_MCP_URL when set', () => {
      process.env.TALOCODE_MCP_URL = 'https://custom.test/mcp'
      const config = loadConfig()
      assert.strictEqual(config.mcpUrl, 'https://custom.test/mcp')
    })

    it('exits with error when TALOCODE_API_KEY is missing', () => {
      delete process.env.TALOCODE_API_KEY
      let exitCode: number | null = null
      const origExit = process.exit
      const origError = console.error
      process.exit = ((code?: number) => { exitCode = code ?? 0 }) as typeof process.exit
      console.error = () => {}

      try {
        loadConfig()
        assert.strictEqual(exitCode, 1, 'Should have exited with code 1')
      } finally {
        process.exit = origExit
        console.error = origError
        process.env.TALOCODE_API_KEY = 'tk-test-bridge-key'
      }
    })
  })

  describe('redactApiKey', () => {
    it('redacts long API keys', () => {
      const result = redactApiKey('tk-live-my-secret-key-99999')
      assert.ok(result.includes('****'))
      assert.ok(!result.includes('my-secret-key'))
    })

    it('handles short values', () => {
      assert.strictEqual(redactApiKey('abc'), '***')
    })
  })

  describe('client', () => {
    it('sends Authorization Bearer header', async () => {
      let capturedAuth = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
        capturedAuth = (opts?.headers as Record<string, string>)['Authorization'] ?? ''
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const client = new TalocodeMcpBridgeClient('http://localhost:4000/mcp', 'tk-forwarded-key')
        await client.forward({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
        assert.strictEqual(capturedAuth, 'Bearer tk-forwarded-key')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('forwards tools/list request', async () => {
      let capturedBody = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
        capturedBody = (opts?.body as string) ?? ''
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const client = new TalocodeMcpBridgeClient('http://localhost:4000/mcp', 'tk-key')
        await client.forward({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
        const parsed = JSON.parse(capturedBody) as Record<string, unknown>
        assert.strictEqual(parsed.jsonrpc, '2.0')
        assert.strictEqual(parsed.method, 'tools/list')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('forwards tools/call request', async () => {
      let capturedBody = ''
      const origFetch = globalThis.fetch
      globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
        capturedBody = (opts?.body as string) ?? ''
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: 'ok' }] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const client = new TalocodeMcpBridgeClient('http://localhost:4000/mcp', 'tk-key')
        await client.forward({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'tera_writing_rewrite', arguments: { text: 'hello' } },
          id: 2,
        })
        const parsed = JSON.parse(capturedBody) as Record<string, unknown>
        assert.strictEqual(parsed.method, 'tools/call')
        assert.deepStrictEqual((parsed.params as Record<string, unknown>).name, 'tera_writing_rewrite')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('passes 401 from remote through safely', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32001, message: 'Authentication failed: Invalid API key.' } }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const client = new TalocodeMcpBridgeClient('http://localhost:4000/mcp', 'bad-key')
        const result = await client.forward({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
        assert.strictEqual(result.ok, false)
        assert.strictEqual(result.status, 401)
        const err = result.body.error as Record<string, unknown>
        assert.ok((err.message as string).includes('Authentication failed'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('passes 402 from remote through safely', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32002, message: 'Insufficient Talocode Cloud credits.' } }), {
          status: 402,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const client = new TalocodeMcpBridgeClient('http://localhost:4000/mcp', 'key')
        const result = await client.forward({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'x' }, id: 1 })
        assert.strictEqual(result.ok, false)
        assert.strictEqual(result.status, 402)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('passes 429 from remote through safely', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32003, message: 'Rate limited.' } }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const client = new TalocodeMcpBridgeClient('http://localhost:4000/mcp', 'key')
        const result = await client.forward({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
        assert.strictEqual(result.ok, false)
        assert.strictEqual(result.status, 429)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('passes 5xx from remote through safely', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32603, message: 'Internal error' } }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const client = new TalocodeMcpBridgeClient('http://localhost:4000/mcp', 'key')
        const result = await client.forward({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
        assert.strictEqual(result.ok, false)
        assert.strictEqual(result.status, 500)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('API key is not leaked in error messages', async () => {
      const client = new TalocodeMcpBridgeClient(
        'http://localhost:4000/mcp',
        'sk-my-secret-key-12345',
      )

      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        const err = new Error('Authorization: Bearer sk-my-secret-key-12345') as Error & { name: string }
        err.name = 'TypeError'
        throw err
      }

      try {
        const result = await client.forward({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
        const msg = JSON.stringify(result.body)
        assert.ok(!msg.includes('sk-my-secret-key-12345'), 'API key leaked in error')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('defaults MCP URL to https://api.talocode.xyz/mcp', () => {
      delete process.env.TALOCODE_MCP_URL
      const c = loadConfig()
      assert.strictEqual(c.mcpUrl, 'https://api.talocode.xyz/mcp')
    })

    it('accepts localhost dev URL', () => {
      process.env.TALOCODE_MCP_URL = 'http://localhost:4000/mcp'
      const c = loadConfig()
      assert.strictEqual(c.mcpUrl, 'http://localhost:4000/mcp')
    })
  })
})
