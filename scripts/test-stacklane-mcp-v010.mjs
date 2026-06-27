#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const repoRoot = process.cwd()
const mcpDist = path.join(repoRoot, 'packages', 'mcp', 'dist')
const require = createRequire(import.meta.url)

const tools = require(path.join(mcpDist, 'tools.js'))
const { StacklaneMcpClient } = require(path.join(mcpDist, 'client.js'))
const safety = require(path.join(mcpDist, 'safety.js'))
const { loadConfig, describeConfig } = require(path.join(mcpDist, 'config.js'))

const EXPECTED_TOOLS = [
  'stacklane_health',
  'stacklane_config_status',
  'stacklane_create_customer',
  'stacklane_list_customers',
  'stacklane_get_customer',
  'stacklane_update_customer',
  'stacklane_create_api_key',
  'stacklane_list_api_keys',
  'stacklane_revoke_api_key',
  'stacklane_verify_api_key',
  'stacklane_record_usage_event',
  'stacklane_list_usage_events',
  'stacklane_summarize_usage',
  'stacklane_create_asset',
  'stacklane_list_assets',
  'stacklane_get_asset',
  'stacklane_delete_asset',
]

const FORBIDDEN_DEPS = ['supabase', 'resend', '@supabase', '@resend']
const CLOUD_CLAIMS = ['requires a cloud account', 'cannot run locally', 'cloud-only']
const OFFICIAL_LISTING_CLAIMS = ['official marketplace listing', 'officially listed', 'official marketplace approval']
const SECRET_PATTERN = /sk_lane_(dev|live)_[A-Za-z0-9_-]{20,}/

function containsAffirmativeClaim(text, phrases) {
  const lines = text.split(/\r?\n/)
  const hits = []
  for (const line of lines) {
    let normalized = line.trim().toLowerCase()
    normalized = normalized.replace(/^([-*+]|\d+\.\s|\d+\)\s)\s*/, '')
    if (/^(no |never |do not |does not |must not |without |are not |is not |this is not |not )/.test(normalized)) {
      continue
    }
    for (const phrase of phrases) {
      if (normalized.includes(phrase)) {
        hits.push(phrase)
      }
    }
  }
  return hits
}

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8')
}

function exists(file) {
  return fs.existsSync(path.join(repoRoot, file))
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Timed out waiting for Stacklane API server')
}

async function runTool(name, args, ctx) {
  const tool = tools.ALL_TOOLS.find((t) => t.name === name)
  if (!tool) throw new Error(`tool not found: ${name}`)
  return tool.handler(args, ctx)
}

function parseToolResult(result) {
  const text = result.content[0].text
  return { isError: Boolean(result.isError), json: JSON.parse(text) }
}

async function run() {
  console.log('\n=== Stacklane MCP v0.1 Tests ===\n')

  // 1. MCP package exists with correct metadata.
  const pkgPath = 'packages/mcp/package.json'
  assert.ok(exists(pkgPath), 'packages/mcp/package.json exists')
  const pkg = JSON.parse(read(pkgPath))
  assert.equal(pkg.name, '@stacklane/mcp', 'package name is @stacklane/mcp')
  assert.equal(pkg.version, '0.4.1', 'package version is 0.4.1')
  assert.ok(pkg.bin && pkg.bin['stacklane-mcp'], 'bin entry stacklane-mcp exists')
  assert.equal(pkg.bin['stacklane-mcp'], 'dist/index.js', 'bin points to dist/index.js')
  assert.equal(pkg.private, true, 'package is private (not published)')

  // 2. Built dist exists.
  assert.ok(exists('packages/mcp/dist/index.js'), 'dist/index.js is built')
  assert.ok(fs.readFileSync(path.join(repoRoot, 'packages/mcp/dist/index.js'), 'utf8').startsWith('#!'), 'index.js has shebang')

  // 3. Tools list includes expected tools.
  assert.deepEqual(tools.TOOL_NAMES.sort(), EXPECTED_TOOLS.sort(), 'all expected tools exposed')

  // 4. Input schemas exist for every tool.
  for (const tool of tools.ALL_TOOLS) {
    assert.ok(tool.inputSchema && typeof tool.inputSchema === 'object', `${tool.name} has inputSchema`)
    assert.ok(typeof tool.description === 'string' && tool.description.length > 0, `${tool.name} has description`)
  }

  // 5. Unsafe filename/path traversal rejected.
  assert.equal(safety.safeFilename('../etc/passwd').ok, false, 'rejects path traversal filename')
  assert.equal(safety.safeFilename('..').ok, false, 'rejects dotdot filename')
  assert.equal(safety.safeFilename('/etc/passwd').ok, false, 'rejects absolute filename')
  assert.equal(safety.safeFilename('a/b').ok, false, 'rejects path separator in filename')
  assert.equal(safety.safeFilename('ok.txt').ok, true, 'accepts safe filename')
  assert.equal(safety.safeStoragePath('../escape').ok, false, 'rejects path traversal storagePath')
  assert.equal(safety.safeStoragePath('/abs').ok, false, 'rejects absolute storagePath')
  assert.equal(safety.safeStoragePath('product/file.png').ok, true, 'accepts relative storagePath')

  // 6. Secret redaction.
  assert.equal(safety.redactSecrets('key=sk_lane_dev_abcdefghijklmnop1234567890'), 'key=sk_lane_dev_REDACTED', 'redacts raw keys')
  assert.equal(safety.redactSecrets('no secrets here'), 'no secrets here', 'leaves clean text')

  // 7. Missing API key returns safe config result (no crash, no value).
  const cfg = loadConfig({ STACKLANE_MCP_BASE_URL: 'http://localhost:7331', STACKLANE_MCP_MODE: 'local' })
  const status = describeConfig(cfg)
  assert.equal(status.apiKeyPresent, false, 'config reports apiKeyPresent false when missing')
  assert.equal(status.apiKeyValue, undefined, 'config never exposes apiKey value')
  assert.equal(status.mode, 'local', 'config mode is local')

  // 8. No raw secrets in docs/examples.
  const checkFiles = [
    'docs/MCP.md',
    'examples/mcp/codex-config.json',
    'examples/mcp/claude-config.json',
    'examples/mcp/opencode-config.json',
    'examples/mcp/cursor-config.json',
    'examples/mcp/sample-agent-prompts.md',
  ]
  for (const file of checkFiles) {
    assert.ok(exists(file), `${file} exists`)
    const content = read(file)
    assert.ok(!SECRET_PATTERN.test(content), `${file} contains no raw API keys`)
  }

  // 9. Examples exist and JSON examples parse.
  for (const file of ['codex-config.json', 'claude-config.json', 'opencode-config.json', 'cursor-config.json']) {
    const raw = read(path.join('examples', 'mcp', file))
    JSON.parse(raw)
  }

  // 10. Docs exist.
  const docs = read('docs/MCP.md')
  assert.match(docs, /Stacklane MCP/i, 'docs describe Stacklane MCP')
  assert.match(docs, /local-first/i, 'docs mention local-first')
  assert.match(docs, /stdio/i, 'docs mention stdio transport')
  assert.match(docs, /STACKLANE_MCP_BASE_URL/, 'docs mention base url env var')
  assert.match(docs, /stacklane-mcp/, 'docs mention stacklane-mcp command')

  // 11. Root test:mcp script exists.
  const rootPkg = JSON.parse(read('package.json'))
  assert.ok(rootPkg.scripts && rootPkg.scripts['test:mcp'], 'root test:mcp script exists')
  assert.match(rootPkg.scripts['test:mcp'], /test-stacklane-mcp-v010\.mjs/, 'test:mcp runs the mcp test script')

  // 12. pnpm build includes MCP package (workspace + build script).
  const workspace = read('pnpm-workspace.yaml')
  assert.ok(workspace.includes('packages/mcp'), 'MCP package is in pnpm workspace')
  assert.ok(pkg.scripts && pkg.scripts.build, 'MCP package has build script')

  // 13. No forbidden dependencies added.
  const mcpDeps = JSON.stringify(pkg.dependencies || {}).toLowerCase()
  for (const dep of FORBIDDEN_DEPS) {
    assert.ok(!mcpDeps.includes(dep), `MCP does not depend on ${dep}`)
  }
  const rootDeps = read('package.json').toLowerCase()
  for (const dep of FORBIDDEN_DEPS) {
    assert.ok(!rootDeps.includes(dep), `root does not depend on ${dep}`)
  }

  // 14. No cloud dependency or official marketplace listing claimed in docs/examples.
  for (const file of ['docs/MCP.md', 'examples/mcp/sample-agent-prompts.md']) {
    const content = read(file)
    const cloudHits = containsAffirmativeClaim(content, CLOUD_CLAIMS)
    assert.equal(cloudHits.length, 0, `${file} does not affirmatively claim cloud: ${cloudHits.join(', ')}`)
    const listingHits = containsAffirmativeClaim(content, OFFICIAL_LISTING_CLAIMS)
    assert.equal(listingHits.length, 0, `${file} does not claim official listing: ${listingHits.join(', ')}`)
  }

  // 15. Mock Stacklane API integration test.
  console.log('\n--- Mock API integration ---')
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stacklane-mcp-'))
  const port = 5200 + Math.floor(Math.random() * 400)
  const baseUrl = `http://127.0.0.1:${port}`
  const serverUrl = pathToFileURL(path.join(repoRoot, 'apps/api/src/server.ts')).href

  const child = spawn(path.join(repoRoot, 'apps/api/node_modules/.bin/tsx'), ['--eval', `import(${JSON.stringify(serverUrl)}).then(async (m) => {
    const api = m.default || m['module.exports'] || m
    const started = await api.startServer({ skipBootstrap: true, port: ${port}, startWorker: false })
    process.on('SIGTERM', () => started.close().then(() => process.exit(0)))
  }).catch((error) => {
    console.error(error)
    process.exit(1)
  })`], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PORT: String(port),
      STACKLANE_SKIP_BOOTSTRAP: '1',
      STACKLANE_SKIP_WORKER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let childExited = false
  child.on('exit', () => { childExited = true })

  try {
    await waitForServer(baseUrl)

    const client = new StacklaneMcpClient({ baseUrl, apiKey: undefined })
    const ctx = { client }

    // health
    const health = parseToolResult(await runTool('stacklane_health', {}, ctx))
    assert.equal(health.isError, false, 'health tool succeeds')
    assert.equal(health.json.ok, true, 'health returns ok')

    // config_status
    const configStatus = parseToolResult(await runTool('stacklane_config_status', {}, ctx))
    assert.equal(configStatus.isError, false, 'config_status tool succeeds')

    // create customer
    const created = parseToolResult(await runTool('stacklane_create_customer', { name: 'Acme MCP', email: 'ops@acme.example' }, ctx))
    assert.equal(created.isError, false, 'create_customer succeeds')
    assert.equal(created.json.ok, true, 'create_customer returns ok')
    assert.ok(created.json.customer && created.json.customer.id, 'create_customer returns customer id')
    const customerId = created.json.customer.id

    // get customer
    const got = parseToolResult(await runTool('stacklane_get_customer', { customerId }, ctx))
    assert.equal(got.isError, false, 'get_customer succeeds')
    assert.equal(got.json.customer.id, customerId, 'get_customer returns same id')

    // create api key (raw key returned once)
    const keyResult = parseToolResult(await runTool('stacklane_create_api_key', { customerId, name: 'mcp-key', mode: 'dev' }, ctx))
    assert.equal(keyResult.isError, false, 'create_api_key succeeds')
    assert.ok(keyResult.json.rawKey && keyResult.json.rawKey.startsWith('sk_lane_dev_'), 'create_api_key returns raw key once')
    const rawKey = keyResult.json.rawKey

    // list api keys must not include key hashes
    const keysList = parseToolResult(await runTool('stacklane_list_api_keys', { customerId }, ctx))
    assert.equal(keysList.isError, false, 'list_api_keys succeeds')
    const keysJson = JSON.stringify(keysList.json)
    assert.ok(!keysJson.includes('keyHash'), 'list_api_keys never returns keyHash')

    // record usage event (requires api key)
    const usageClient = new StacklaneMcpClient({ baseUrl, apiKey: rawKey })
    const usageCtx = { client: usageClient }
    const usage = parseToolResult(await runTool('stacklane_record_usage_event', { product: 'launchpix', action: 'asset.generate', units: 3 }, usageCtx))
    assert.equal(usage.isError, false, 'record_usage_event succeeds')
    assert.equal(usage.json.ok, true, 'record_usage_event returns ok')
    assert.equal(usage.json.event.units, 3, 'record_usage_event records units')

    // summarize usage
    const summary = parseToolResult(await runTool('stacklane_summarize_usage', { product: 'launchpix' }, usageCtx))
    assert.equal(summary.isError, false, 'summarize_usage succeeds')
    assert.ok(summary.json.summary, 'summarize_usage returns summary')

    // create asset (rejects unsafe filename)
    const unsafeAsset = parseToolResult(await runTool('stacklane_create_asset', {
      product: 'launchpix',
      filename: '../escape.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      storagePath: 'launchpix/card.png',
    }, usageCtx))
    assert.equal(unsafeAsset.isError, true, 'create_asset rejects path traversal filename')

    const safeAsset = parseToolResult(await runTool('stacklane_create_asset', {
      product: 'launchpix',
      filename: 'launch-card.png',
      contentType: 'image/png',
      sizeBytes: 2048,
      storagePath: 'launchpix/launch-card.png',
    }, usageCtx))
    assert.equal(safeAsset.isError, false, 'create_asset succeeds for safe filename')
    assert.equal(safeAsset.json.ok, true, 'create_asset returns ok')
    assert.ok(safeAsset.json.asset && safeAsset.json.asset.id, 'create_asset returns asset id')

    // verify api key never returns raw key or hash
    const verify = parseToolResult(await runTool('stacklane_verify_api_key', { key: rawKey }, ctx))
    assert.equal(verify.isError, false, 'verify_api_key succeeds')
    assert.equal(verify.json.valid, true, 'verify_api_key reports valid')
    const verifyJson = JSON.stringify(verify.json)
    assert.ok(!verifyJson.includes('keyHash'), 'verify_api_key never returns keyHash')

    console.log('  mock API integration passed')
  } finally {
    if (!childExited) {
      child.kill('SIGTERM')
      await new Promise((resolve) => child.on('exit', resolve))
    }
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }

  console.log('\n=== Stacklane MCP v0.1 tests passed ===\n')
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
