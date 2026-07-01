import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { handleMcpRequest, handleMcpToolList } from '../server'
import { ALL_TOOLS, TOOL_MAP } from '../tools'
import { extractApiKey, validateMcpAuth, redactAuthHeader } from '../auth'
import { mapHttpStatusToMcpError, extractBodyMessage, MCP_ERROR_CODES } from '../errors'

const ORIGINAL_ENV = { ...process.env }

describe('Talocode MCP v0.1', () => {
  before(() => {
    process.env.TALOCODE_API_KEY = 'test-mcp-api-key'
    process.env.TALOCODE_BASE_URL = 'http://localhost:4000'
  })

  after(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  describe('tool registry', () => {
    it('contains all v0.1 tools', () => {
      const names = ALL_TOOLS.map((t) => t.name).sort()
      assert.deepStrictEqual(names, [
        'agent_browser_check',
        'agent_browser_screenshot',
        'agent_browser_trace_report',
        'cliploop_brief_generate',
        'cliploop_campaign_create',
        'cliploop_campaign_package',
        'cliploop_script_generate',
        'cliploop_video_render',
        'cloud_pricing',
        'router_chat',
        'skills_export_claude',
        'skills_export_cursor',
        'skills_generate_docs',
        'skills_generate_github_profile',
        'skills_generate_github_repo',
        'skills_generate_text',
        'tera_coding_explain',
        'tera_coding_review',
        'tera_writing_draft',
        'tera_writing_rewrite',
      ])
    })

    it('each tool has required fields', () => {
      for (const tool of ALL_TOOLS) {
        assert.ok(tool.name, 'tool name is required')
        assert.ok(tool.description, 'tool description is required')
        assert.ok(tool.inputSchema, 'tool inputSchema is required')
        assert.strictEqual(tool.inputSchema.type, 'object')
        assert.ok(tool.route, 'tool route is required')
        assert.ok(tool.method, 'tool method is required')
        assert.ok(tool.product, 'tool product is required')
        assert.ok(tool.action, 'tool action is required')
      }
    })

    it('each tool can be looked up by name', () => {
      for (const tool of ALL_TOOLS) {
        assert.ok(TOOL_MAP.has(tool.name), `tool ${tool.name} should be in TOOL_MAP`)
      }
    })

    it('TOOL_MAP has no extra entries', () => {
      assert.strictEqual(TOOL_MAP.size, ALL_TOOLS.length)
    })
  })

  describe('tool schemas', () => {
    it('tera_writing_rewrite requires text', () => {
      const tool = TOOL_MAP.get('tera_writing_rewrite')!
      assert.ok(tool.inputSchema.required?.includes('text'))
    })

    it('router_chat requires model and messages', () => {
      const tool = TOOL_MAP.get('router_chat')!
      assert.ok(tool.inputSchema.required?.includes('model'))
      assert.ok(tool.inputSchema.required?.includes('messages'))
    })

    it('agent_browser_check requires url', () => {
      const tool = TOOL_MAP.get('agent_browser_check')!
      assert.ok(tool.inputSchema.required?.includes('url'))
    })
  })

  describe('MCP server - tools/list', () => {
    it('returns tool list on tools/list request', async () => {
      const request = new Request('http://localhost:4000/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-mcp-api-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        }),
      })
      const response = await handleMcpRequest(request)
      assert.strictEqual(response.status, 200)
      const body = (await response.json()) as Record<string, unknown>
      assert.strictEqual(body.jsonrpc, '2.0')
      assert.strictEqual(body.id, 1)
      assert.ok(body.result)
      const result = body.result as Record<string, unknown>
      const tools = result.tools as Array<Record<string, unknown>>
      assert.strictEqual(tools.length, ALL_TOOLS.length)
    })

    it('tool list includes name and description', async () => {
      const request = new Request('http://localhost:4000/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-mcp-api-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2,
        }),
      })
      const response = await handleMcpRequest(request)
      const body = (await response.json()) as Record<string, unknown>
      const result = body.result as Record<string, unknown>
      const tools = result.tools as Array<Record<string, unknown>>
      const rewriteTool = tools.find((t) => t.name === 'tera_writing_rewrite')
      assert.ok(rewriteTool)
      assert.strictEqual(typeof rewriteTool.description, 'string')
      assert.ok(rewriteTool.inputSchema)
    })
  })

  describe('MCP server - tools/call', () => {
    it('rejects unknown tool names', async () => {
      const request = new Request('http://localhost:4000/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-mcp-api-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'nonexistent_tool', arguments: {} },
          id: 1,
        }),
      })
      const response = await handleMcpRequest(request)
      assert.strictEqual(response.status, 400)
      const body = (await response.json()) as Record<string, unknown>
      assert.ok(body.error)
      assert.strictEqual((body.error as Record<string, unknown>).code, MCP_ERROR_CODES.METHOD_NOT_FOUND)
    })
  })

  describe('auth', () => {
    it('rejects missing API key', async () => {
      const request = new Request('http://localhost:4000/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })
      const response = await handleMcpRequest(request)
      assert.strictEqual(response.status, 401)
      const body = (await response.json()) as Record<string, unknown>
      assert.ok(body.error)
    })

    it('accepts any API key at MCP layer (validated downstream)', async () => {
      const request = new Request('http://localhost:4000/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer any-forwarded-key',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })
      const response = await handleMcpRequest(request)
      assert.strictEqual(response.status, 200, 'MCP proxy accepts any key, downstream validates')
    })

    it('extracts key from X-Api-Key header', () => {
      const r = new Request('http://test', { headers: { 'x-api-key': 'test-key' } })
      assert.strictEqual(extractApiKey(r), 'test-key')
    })

    it('extracts key from Authorization Bearer', () => {
      const r = new Request('http://test', { headers: { authorization: 'Bearer tk-key-123' } })
      assert.strictEqual(extractApiKey(r), 'tk-key-123')
    })

    it('returns null when no auth header', () => {
      const r = new Request('http://test')
      assert.strictEqual(extractApiKey(r), null)
    })

    it('validates presence of API key', () => {
      const r = new Request('http://test', { headers: { authorization: 'Bearer valid-key' } })
      const result = validateMcpAuth(r)
      assert.strictEqual(result.valid, true)
      assert.strictEqual(result.apiKey, 'valid-key')
    })

    it('fails validation when no key present', () => {
      const r = new Request('http://test')
      const result = validateMcpAuth(r)
      assert.strictEqual(result.valid, false)
      assert.strictEqual(result.apiKey, null)
    })
  })

  describe('Authorization header redacted', () => {
    it('redacts long auth tokens', () => {
      const result = redactAuthHeader('tk-dev-my-secret-key-12345')
      assert.ok(result.includes('****'))
      assert.ok(!result.includes('my-secret-key'))
    })

    it('handles short values', () => {
      const result = redactAuthHeader('abc')
      assert.strictEqual(result, '***')
    })
  })

  describe('error mapping', () => {
    it('401 maps to auth error', () => {
      const err = mapHttpStatusToMcpError(401, { error: 'invalid_key' })
      assert.strictEqual(err.code, MCP_ERROR_CODES.AUTH_ERROR)
      assert.ok(err.message.includes('Authentication failed'))
    })

    it('402 maps to insufficient credits', () => {
      const err = mapHttpStatusToMcpError(402, { required: 50, available: 10 })
      assert.strictEqual(err.code, MCP_ERROR_CODES.INSUFFICIENT_CREDITS)
      assert.ok(err.message.includes('Insufficient'))
      assert.deepStrictEqual(err.data, { required: 50, available: 10 })
    })

    it('429 maps to rate limit', () => {
      const err = mapHttpStatusToMcpError(429, { error: 'Too fast' })
      assert.strictEqual(err.code, MCP_ERROR_CODES.RATE_LIMITED)
    })

    it('502 maps to backend unavailable', () => {
      const err = mapHttpStatusToMcpError(502, { error: 'Upstream down' })
      assert.strictEqual(err.code, MCP_ERROR_CODES.BACKEND_UNAVAILABLE)
    })
  })

  describe('MCP server - structure', () => {
    it('GET /mcp returns health info', async () => {
      const request = new Request('http://localhost:4000/mcp', {
        method: 'GET',
        headers: { authorization: 'Bearer test-mcp-api-key' },
      })
      const response = await handleMcpRequest(request)
      assert.strictEqual(response.status, 200)
      const body = (await response.json()) as Record<string, unknown>
      assert.strictEqual(body.service, 'talocode-mcp')
      assert.strictEqual(body.version, '0.1.0')
      assert.strictEqual(body.tools, ALL_TOOLS.length)
    })

    it('GET /api/v1/cloud/mcp/tools returns tool list', () => {
      const response = handleMcpToolList()
      assert.strictEqual(response.status, 200)
    })
  })

  describe('MCP server - route mapping', () => {
    it('tera_writing_rewrite maps to /v1/tera/writing/rewrite', () => {
      const tool = TOOL_MAP.get('tera_writing_rewrite')!
      assert.strictEqual(tool.route, '/v1/tera/writing/rewrite')
      assert.strictEqual(tool.method, 'POST')
    })

    it('router_chat maps to /v1/router/chat/completions', () => {
      const tool = TOOL_MAP.get('router_chat')!
      assert.strictEqual(tool.route, '/v1/router/chat/completions')
    })

    it('agent_browser_check maps to /v1/agent-browser/check', () => {
      const tool = TOOL_MAP.get('agent_browser_check')!
      assert.strictEqual(tool.route, '/v1/agent-browser/check')
    })

    it('cliploop_brief_generate maps to /v1/cliploop/brief/generate', () => {
      const tool = TOOL_MAP.get('cliploop_brief_generate')!
      assert.strictEqual(tool.route, '/v1/cliploop/brief/generate')
    })

    it('cloud_pricing maps to /api/v1/cloud/pricing', () => {
      const tool = TOOL_MAP.get('cloud_pricing')!
      assert.strictEqual(tool.route, '/api/v1/cloud/pricing')
      assert.strictEqual(tool.method, 'GET')
    })
  })

  describe('error message extraction', () => {
    it('extracts string error directly', () => {
      assert.strictEqual(extractBodyMessage({ error: 'something went wrong' }), 'something went wrong')
    })

    it('extracts message from nested error object', () => {
      const body = { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }
      assert.strictEqual(extractBodyMessage(body), 'Authentication required.')
    })

    it('extracts top-level message when error is absent', () => {
      assert.strictEqual(extractBodyMessage({ message: 'top-level msg' }), 'top-level msg')
    })

    it('returns fallback when no message found', () => {
      assert.strictEqual(extractBodyMessage({}), 'Unknown error')
    })

    it('handles nested error with empty message', () => {
      const body = { error: { code: 'FOO', message: '' } }
      assert.strictEqual(extractBodyMessage(body), '')
    })
  })

  describe('MCP GET tool does not pass body', () => {
    it('cloud_pricing tool is GET method', () => {
      const tool = TOOL_MAP.get('cloud_pricing')!
      assert.strictEqual(tool.method, 'GET')
    })

    it('GET tools have no body in callTool', () => {
      const tool = TOOL_MAP.get('cloud_pricing')!
      const body = tool.method === 'POST' ? { args: true } : undefined
      assert.strictEqual(body, undefined)
    })

    it('POST tools have body in callTool', () => {
      const tool = TOOL_MAP.get('router_chat')!
      const body = tool.method === 'POST' ? { model: 'test' } : undefined
      assert.deepStrictEqual(body, { model: 'test' })
    })

    it('skills tools reference correct routes', () => {
      const profile = TOOL_MAP.get('skills_generate_github_profile')!
      assert.strictEqual(profile.route, '/v1/skills/generate/github-profile')
      assert.strictEqual(profile.product, 'skills')
      assert.strictEqual(profile.estimatedCredits, 80)

      const repo = TOOL_MAP.get('skills_generate_github_repo')!
      assert.strictEqual(repo.route, '/v1/skills/generate/github-repo')
      assert.strictEqual(repo.estimatedCredits, 100)

      const docs = TOOL_MAP.get('skills_generate_docs')!
      assert.strictEqual(docs.route, '/v1/skills/generate/docs')
      assert.strictEqual(docs.estimatedCredits, 100)

      const text = TOOL_MAP.get('skills_generate_text')!
      assert.strictEqual(text.route, '/v1/skills/generate/text')
      assert.strictEqual(text.estimatedCredits, 40)

      const cursor = TOOL_MAP.get('skills_export_cursor')!
      assert.strictEqual(cursor.route, '/v1/skills/export/cursor')
      assert.strictEqual(cursor.estimatedCredits, 10)

      const claude = TOOL_MAP.get('skills_export_claude')!
      assert.strictEqual(claude.route, '/v1/skills/export/claude')
      assert.strictEqual(claude.estimatedCredits, 10)
    })

    it('skills_generate_github_profile requires username', () => {
      const tool = TOOL_MAP.get('skills_generate_github_profile')!
      assert.ok(tool.inputSchema.required?.includes('username'))
    })

    it('skills_generate_text requires name and content', () => {
      const tool = TOOL_MAP.get('skills_generate_text')!
      assert.ok(tool.inputSchema.required?.includes('name'))
      assert.ok(tool.inputSchema.required?.includes('content'))
    })
  })
})
