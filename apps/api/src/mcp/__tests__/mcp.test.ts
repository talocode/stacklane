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
      assert.deepStrictEqual(names, ALL_TOOLS.map((t) => t.name).sort())
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
      const tool = TOOL_MAP.get('invoicelane_extract')!
      const body = tool.method === 'POST' ? { text: 'test' } : undefined
      assert.deepStrictEqual(body, { text: 'test' })
    })

    it('invoicelane tools reference correct routes', () => {
      const health = TOOL_MAP.get('invoicelane_health')!
      assert.strictEqual(health.route, '/v1/invoicelane/health')
      assert.strictEqual(health.method, 'GET')
      assert.strictEqual(health.product, 'invoicelane')
      assert.strictEqual(health.estimatedCredits, null)
      assert.ok(health.description.toLowerCase().includes('health'))

      const pricing = TOOL_MAP.get('invoicelane_pricing')!
      assert.strictEqual(pricing.route, '/v1/invoicelane/pricing')
      assert.strictEqual(pricing.method, 'GET')
      assert.strictEqual(pricing.estimatedCredits, null)

      const capabilities = TOOL_MAP.get('invoicelane_capabilities')!
      assert.strictEqual(capabilities.route, '/v1/invoicelane/capabilities')
      assert.strictEqual(capabilities.method, 'GET')
      assert.strictEqual(capabilities.estimatedCredits, null)
      assert.ok(capabilities.description.toLowerCase().includes('schema'))

      const extract = TOOL_MAP.get('invoicelane_extract')!
      assert.strictEqual(extract.route, '/v1/invoicelane/extract')
      assert.strictEqual(extract.product, 'invoicelane')
      assert.strictEqual(extract.estimatedCredits, 20)
      assert.ok(extract.description.includes('missingFields') || extract.description.includes('schema'))

      const receipt = TOOL_MAP.get('invoicelane_extract_receipt')!
      assert.strictEqual(receipt.route, '/v1/invoicelane/receipt/extract')
      assert.strictEqual(receipt.estimatedCredits, 20)

      const invoice = TOOL_MAP.get('invoicelane_extract_invoice')!
      assert.strictEqual(invoice.route, '/v1/invoicelane/invoice/extract')
      assert.strictEqual(invoice.estimatedCredits, 30)
      assert.ok(invoice.description.includes('invoiceNumber'))

      const validate = TOOL_MAP.get('invoicelane_validate')!
      assert.strictEqual(validate.route, '/v1/invoicelane/validate')
      assert.strictEqual(validate.estimatedCredits, 10)
      assert.ok(validate.description.toLowerCase().includes('schema'))

      const csv = TOOL_MAP.get('invoicelane_export_csv')!
      assert.strictEqual(csv.route, '/v1/invoicelane/export/csv')
      assert.strictEqual(csv.estimatedCredits, 5)
    })

    it('invoicelane_validate requires documentType and fields', () => {
      const tool = TOOL_MAP.get('invoicelane_validate')!
      assert.ok(tool.inputSchema.required?.includes('documentType'))
      assert.ok(tool.inputSchema.required?.includes('fields'))
    })

    it('invoicelane_export_csv requires rows', () => {
      const tool = TOOL_MAP.get('invoicelane_export_csv')!
      assert.ok(tool.inputSchema.required?.includes('rows'))
    })

    it('searchlane tools reference correct routes', () => {
      const health = TOOL_MAP.get('searchlane_health')!
      assert.strictEqual(health.route, '/v1/searchlane/health')
      assert.strictEqual(health.method, 'GET')
      assert.strictEqual(health.estimatedCredits, null)

      const query = TOOL_MAP.get('searchlane_query')!
      assert.strictEqual(query.route, '/v1/searchlane/query')
      assert.strictEqual(query.product, 'searchlane')
      assert.strictEqual(query.estimatedCredits, 5)

      const news = TOOL_MAP.get('searchlane_news')!
      assert.strictEqual(news.route, '/v1/searchlane/news')
      assert.strictEqual(news.estimatedCredits, 8)

      const research = TOOL_MAP.get('searchlane_research')!
      assert.strictEqual(research.route, '/v1/searchlane/research')
      assert.strictEqual(research.estimatedCredits, 30)
    })

    it('geolane tools reference correct routes', () => {
      const health = TOOL_MAP.get('geolane_health')!
      assert.strictEqual(health.route, '/v1/geolane/health')
      assert.strictEqual(health.method, 'GET')
      assert.strictEqual(health.estimatedCredits, null)

      const audit = TOOL_MAP.get('geolane_audit')!
      assert.strictEqual(audit.route, '/v1/geolane/audit')
      assert.strictEqual(audit.product, 'geolane')
      assert.strictEqual(audit.estimatedCredits, 40)
      assert.ok(audit.inputSchema.required?.includes('url'))

      const crawlers = TOOL_MAP.get('geolane_crawlers')!
      assert.strictEqual(crawlers.route, '/v1/geolane/crawlers')
      assert.strictEqual(crawlers.estimatedCredits, 15)

      const llms = TOOL_MAP.get('geolane_llms_txt')!
      assert.strictEqual(llms.route, '/v1/geolane/llms-txt')
      assert.strictEqual(llms.estimatedCredits, 20)

      const citation = TOOL_MAP.get('geolane_citation_readiness')!
      assert.strictEqual(citation.route, '/v1/geolane/citation-readiness')
      assert.strictEqual(citation.estimatedCredits, 25)

      const compare = TOOL_MAP.get('geolane_compare')!
      assert.strictEqual(compare.route, '/v1/geolane/compare')
      assert.strictEqual(compare.estimatedCredits, 50)
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

    it('signallane tools reference correct routes', () => {
      const analyze = TOOL_MAP.get('signallane_x_analyze')!
      assert.strictEqual(analyze.route, '/v1/signallane/x/analyze')
      assert.strictEqual(analyze.product, 'signallane')
      assert.strictEqual(analyze.estimatedCredits, 30)

      const plan = TOOL_MAP.get('signallane_x_content_plan')!
      assert.strictEqual(plan.route, '/v1/signallane/x/content-plan')
      assert.strictEqual(plan.estimatedCredits, 40)

      const drafts = TOOL_MAP.get('signallane_x_post_drafts')!
      assert.strictEqual(drafts.route, '/v1/signallane/x/post-drafts')
      assert.strictEqual(drafts.estimatedCredits, 40)

      const experiments = TOOL_MAP.get('signallane_x_experiments')!
      assert.strictEqual(experiments.route, '/v1/signallane/x/experiments')
      assert.strictEqual(experiments.estimatedCredits, 30)

      const report = TOOL_MAP.get('signallane_x_report')!
      assert.strictEqual(report.route, '/v1/signallane/x/report')
      assert.strictEqual(report.estimatedCredits, 60)
    })

    it('webdatalane tools reference correct routes', () => {
      const fetchTool = TOOL_MAP.get('webdatalane_fetch')!
      assert.strictEqual(fetchTool.route, '/v1/webdatalane/fetch')
      assert.strictEqual(fetchTool.product, 'webdatalane')
      assert.strictEqual(fetchTool.estimatedCredits, 5)

      const extract = TOOL_MAP.get('webdatalane_extract')!
      assert.strictEqual(extract.route, '/v1/webdatalane/extract')
      assert.strictEqual(extract.estimatedCredits, 10)

      const markdown = TOOL_MAP.get('webdatalane_markdown')!
      assert.strictEqual(markdown.route, '/v1/webdatalane/markdown')
      assert.strictEqual(markdown.estimatedCredits, 10)

      const metadata = TOOL_MAP.get('webdatalane_metadata')!
      assert.strictEqual(metadata.route, '/v1/webdatalane/metadata')
      assert.strictEqual(metadata.estimatedCredits, 5)

      const links = TOOL_MAP.get('webdatalane_links')!
      assert.strictEqual(links.route, '/v1/webdatalane/links')
      assert.strictEqual(links.estimatedCredits, 5)

      const structured = TOOL_MAP.get('webdatalane_structured')!
      assert.strictEqual(structured.route, '/v1/webdatalane/structured')
      assert.strictEqual(structured.estimatedCredits, 20)

      const plan = TOOL_MAP.get('webdatalane_crawl_plan')!
      assert.strictEqual(plan.route, '/v1/webdatalane/crawl/plan')
      assert.strictEqual(plan.estimatedCredits, 15)

      const screenshot = TOOL_MAP.get('webdatalane_screenshot')!
      assert.strictEqual(screenshot.route, '/v1/webdatalane/screenshot')
      assert.strictEqual(screenshot.estimatedCredits, 50)
    })

    it('webdatalane_fetch requires url', () => {
      const tool = TOOL_MAP.get('webdatalane_fetch')!
      assert.ok(tool.inputSchema.required?.includes('url'))
    })

    it('webdatalane_structured requires schema', () => {
      const tool = TOOL_MAP.get('webdatalane_structured')!
      assert.ok(tool.inputSchema.required?.includes('schema'))
    })

    it('webdatalane_crawl_plan requires url', () => {
      const tool = TOOL_MAP.get('webdatalane_crawl_plan')!
      assert.ok(tool.inputSchema.required?.includes('url'))
    })

    it('crawlerlane tools have correct routes', () => {
      const classify = TOOL_MAP.get('crawlerlane_bots_classify')!
      assert.strictEqual(classify.route, '/v1/crawlerlane/bots/classify')
      assert.strictEqual(classify.estimatedCredits, 2)
      const report = TOOL_MAP.get('crawlerlane_report_generate')!
      assert.strictEqual(report.route, '/v1/crawlerlane/report/generate')
      assert.strictEqual(report.estimatedCredits, 40)
    })

    it('crawlerlane_bots_classify requires userAgent', () => {
      const tool = TOOL_MAP.get('crawlerlane_bots_classify')!
      assert.ok(tool.inputSchema.required?.includes('userAgent'))
    })

    it('crawlerlane_logs_ingest requires domain and logs', () => {
      const tool = TOOL_MAP.get('crawlerlane_logs_ingest')!
      assert.ok(tool.inputSchema.required?.includes('domain'))
      assert.ok(tool.inputSchema.required?.includes('logs'))
    })

    it('opensourcelane tools have correct routes', () => {
      const find = TOOL_MAP.get('opensourcelane_alternatives_find')!
      assert.strictEqual(find.route, '/v1/opensourcelane/alternatives/find')
      assert.strictEqual(find.estimatedCredits, 30)
      const plan = TOOL_MAP.get('opensourcelane_migration_plan')!
      assert.strictEqual(plan.route, '/v1/opensourcelane/migration/plan')
      assert.strictEqual(plan.estimatedCredits, 50)
    })

    it('opensourcelane_alternatives_find requires replace', () => {
      const tool = TOOL_MAP.get('opensourcelane_alternatives_find')!
      assert.ok(tool.inputSchema.required?.includes('replace'))
    })

    it('opensourcelane_migration_plan requires from and to', () => {
      const tool = TOOL_MAP.get('opensourcelane_migration_plan')!
      assert.ok(tool.inputSchema.required?.includes('from'))
      assert.ok(tool.inputSchema.required?.includes('to'))
    })

    it('forgecad tools have correct routes', () => {
      const design = TOOL_MAP.get('forgecad_design_generate')!
      assert.strictEqual(design.route, '/v1/forgecad/design/generate')
      assert.strictEqual(design.estimatedCredits, 60)
      const openscad = TOOL_MAP.get('forgecad_openscad_generate')!
      assert.strictEqual(openscad.route, '/v1/forgecad/openscad/generate')
    })

    it('forgecad_design_generate requires projectType', () => {
      const tool = TOOL_MAP.get('forgecad_design_generate')!
      assert.ok(tool.inputSchema.required?.includes('projectType'))
    })

    it('replylane tools have correct routes', () => {
      const score = TOOL_MAP.get('replylane_opportunity_score')!
      assert.strictEqual(score.route, '/v1/replylane/opportunity/score')
      assert.strictEqual(score.estimatedCredits, 15)
      const draft = TOOL_MAP.get('replylane_replies_draft')!
      assert.strictEqual(draft.route, '/v1/replylane/replies/draft')
    })

    it('replylane_opportunity_score requires tweetText and authorHandle', () => {
      const tool = TOOL_MAP.get('replylane_opportunity_score')!
      assert.ok(tool.inputSchema.required?.includes('tweetText'))
      assert.ok(tool.inputSchema.required?.includes('authorHandle'))
    })

    it('signallane tools require handle', () => {
      for (const name of ['signallane_x_analyze', 'signallane_x_content_plan', 'signallane_x_post_drafts', 'signallane_x_experiments', 'signallane_x_report']) {
        const tool = TOOL_MAP.get(name)!
        assert.ok(tool.inputSchema.required?.includes('handle'), `${name} requires handle`)
      }
    })
  })
})
