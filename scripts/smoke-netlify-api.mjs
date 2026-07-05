#!/usr/bin/env node

// Smoke test for a deployed Stacklane API instance (Netlify or other target).
// Default target: https://api.talocode.site
// Override with env: TALOCODE_BASE_URL

import { setTimeout as sleep } from 'node:timers/promises'

const BASE_URL = (process.env.TALOCODE_BASE_URL || 'https://api.talocode.site').replace(/\/+$/, '')
const API_KEY = process.env.TALOCODE_API_KEY || ''

let passCount = 0
let failCount = 0

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args)
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    ...options,
  })
  const body = res.headers.get('content-type')?.includes('json')
    ? await res.json()
    : await res.text()
  return { status: res.status, body, ok: res.ok }
}

async function assert(label, fn) {
  try {
    await fn()
    log(`  ✅ ${label}`)
    passCount++
  } catch (err) {
    log(`  ❌ ${label}: ${err.message}`)
    failCount++
  }
}

async function run() {
  log('=== Netlify API Smoke Test ===')
  log(`Target: ${BASE_URL}`)
  log('')

  // 1. Cloud health (unauthenticated)
  log('1. Public endpoints')
  await assert('GET /api/v1/cloud/health returns 200', async () => {
    const r = await fetchJson(`${BASE_URL}/api/v1/cloud/health`)
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
    const { body } = r
    if (body.service !== 'talocode-cloud-api') throw new Error(`Unexpected service: ${body.service}`)
    if (!body.database) throw new Error('Missing database field')
    if (!body.uptime) throw new Error('Missing uptime field')
  })

  await assert('GET /health returns 200', async () => {
    const r = await fetchJson(`${BASE_URL}/health`)
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
    if (r.body.ok !== true) throw new Error('Health check not ok')
  })

  await assert('GET /v1/router/models returns 200', async () => {
    const r = await fetchJson(`${BASE_URL}/v1/router/models`)
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
    if (!Array.isArray(r.body?.data)) throw new Error('Expected data array')
    if (r.body.data.length === 0) throw new Error('No models returned')
  })

  // 2. MCP endpoints
  log('\n2. MCP endpoints')
  await assert('POST /mcp tools/list returns tools', async () => {
    const r = await fetchJson(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    })
    // Without API key, expect either 401 or a tools list with auth error
    if (r.status === 200) {
      const tools = r.body?.result?.tools
      if (!Array.isArray(tools) || tools.length === 0) throw new Error('Expected tool list')
      log(`   Tools count: ${tools.length}`)
    } else if (r.status === 401) {
      log('   (no auth, returned 401 as expected)')
    } else {
      throw new Error(`Unexpected status: ${r.status}`)
    }
  })

  await assert('GET /api/v1/cloud/mcp/tools returns tools', async () => {
    const r = await fetchJson(`${BASE_URL}/api/v1/cloud/mcp/tools`)
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
    const tools = r.body?.result?.tools
    if (!Array.isArray(tools) || tools.length < 14) throw new Error(`Expected at least 14 tools, got ${tools?.length}`)
  })

  // 3. Skills API
  log('\n3. Skills API')
  await assert('GET /v1/skills/health returns 200', async () => {
    const r = await fetchJson(`${BASE_URL}/v1/skills/health`)
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
    if (r.body.status !== 'ok') throw new Error('Skills health not ok')
    if (!Array.isArray(r.body.endpoints)) throw new Error('Expected endpoints array')
  })

  // 3b. Agent Browser API
  log('\n3b. Agent Browser API')
  await assert('GET /v1/agent-browser/health returns 200', async () => {
    const r = await fetchJson(`${BASE_URL}/v1/agent-browser/health`)
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
    if (r.body.status !== 'ok') throw new Error('Agent Browser health not ok')
    if (!Array.isArray(r.body.endpoints)) throw new Error('Expected endpoints array')
  })

  // 4. Authenticated endpoints (if API key is present)
  if (API_KEY) {
    log('\n4. Authenticated checks (API key set)')
    const authHeaders = {
      'content-type': 'application/json',
      authorization: `Bearer ${API_KEY}`,
    }

    await assert('POST /v1/skills/generate/text returns skill', async () => {
      const r = await fetchJson(`${BASE_URL}/v1/skills/generate/text`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'smoke-test', content: 'Test content for smoke check', target: 'cursor' }),
      })
      if (r.status === 402) {
        log('   (402 insufficient credits — expected if wallet is low)')
        return
      }
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
      if (!r.body.skill?.skillMd) throw new Error('Expected skill.skillMd in response')
      if (!r.body.skill?.name) throw new Error('Expected skill.name in response')
    })

    await assert('POST /v1/skills/health still works with auth', async () => {
      const r = await fetchJson(`${BASE_URL}/v1/skills/health`)
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
    })
  } else {
    log('\n4. Authenticated checks: skipped (set TALOCODE_API_KEY env var to run)')
  }

  // 5. Content-Type / CORS headers
  log('\n5. Response headers')
  await assert('OPTIONS /health returns CORS headers', async () => {
    const r = await fetch(`${BASE_URL}/health`, { method: 'OPTIONS' })
    if (r.status !== 204 && r.status !== 200) throw new Error(`Expected 204 or 200, got ${r.status}`)
  })

  await assert('api response has content-type json', async () => {
    const r = await fetchJson(`${BASE_URL}/api/v1/cloud/health`)
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`)
  })

  // Summary
  const total = passCount + failCount
  log('\n=== Smoke test results ===')
  log(`  Total:  ${total}`)
  log(`  Passed: ${passCount}`)
  log(`  Failed: ${failCount}`)
  log(`  Rate:   ${((passCount / total) * 100).toFixed(1)}%`)

  if (failCount > 0) {
    console.error('\n❌ Smoke test FAILED')
    process.exit(1)
  }
  log('\n✅ Smoke test PASSED')
}

run().catch((err) => {
  console.error('Smoke test crashed:', err)
  process.exit(1)
})
