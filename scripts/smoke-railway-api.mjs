#!/usr/bin/env node

/**
 * Smoke test for Railway-deployed Talocode API.
 *
 * Usage:
 *   node scripts/smoke-railway-api.mjs <base_url>
 *
 * Examples:
 *   node scripts/smoke-railway-api.mjs http://localhost:4000
 *   node scripts/smoke-railway-api.mjs https://api.talocode.site
 */

const BASE_URL = process.argv[2]
if (!BASE_URL) {
  console.error('Usage: node scripts/smoke-railway-api.mjs <base_url>')
  console.error('Example: node scripts/smoke-railway-api.mjs http://localhost:4000')
  process.exit(1)
}

const API_KEY = process.env.TALOCODE_API_KEY || ''

let pass = 0
let fail = 0

async function smoke(label, fn) {
  try {
    const ok = await fn()
    if (ok) {
      console.log(`  PASS: ${label}`)
      pass++
    } else {
      console.log(`  FAIL: ${label} — unexpected response`)
      fail++
    }
  } catch (e) {
    console.log(`  FAIL: ${label} — ${e.message}`)
    fail++
  }
}

async function get(path, opts = {}) {
  const headers = { 'Accept': 'application/json', ...opts.headers }
  if (opts.auth) headers['Authorization'] = `Bearer ${API_KEY}`
  const res = await fetch(`${BASE_URL}${path}`, { headers, signal: AbortSignal.timeout(5000) })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

async function main() {
  console.log(`\n=== Railway API Smoke Tests ===`)
  console.log(`Base URL: ${BASE_URL}\n`)

  // Basic health (no auth, no DB)
  await smoke('GET /health returns 200', async () => {
    const { status, body } = await get('/health')
    return status === 200 && body.ok === true
  })

  // Cloud health (no auth)
  await smoke('GET /api/v1/cloud/health returns 200', async () => {
    const { status, body } = await get('/api/v1/cloud/health')
    return status === 200 && body.service === 'talocode-cloud-api'
  })

  // Pricing (no auth)
  await smoke('GET /api/v1/cloud/pricing returns 200', async () => {
    const { status } = await get('/api/v1/cloud/pricing')
    return status === 200
  })

  // Models (no auth)
  await smoke('GET /v1/models returns 200', async () => {
    const { status } = await get('/v1/models')
    return status === 200
  })

  // MCP (no auth = 401 expected)
  await smoke('POST /mcp without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(5000)
    })
    return res.status === 401
  })

  // Skills health (requires auth)
  if (API_KEY) {
    await smoke('GET /v1/skills/health with auth returns 200', async () => {
      const { status } = await get('/v1/skills/health', { auth: true })
      return status === 200
    })
  } else {
    console.log('  SKIP: /v1/skills/health (no TALOCODE_API_KEY set)')
  }

  // Auth-required endpoint without key → 401
  await smoke('POST /api/v1/cloud/usage/charge without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/cloud/usage/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: 'test', action: 'test' }),
      signal: AbortSignal.timeout(5000)
    })
    return res.status === 401
  })

  const total = pass + fail
  console.log(`\n=== Results: ${pass}/${total} passed, ${fail} failed ===`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => {
  console.error(`\nSmoke tests crashed: ${e.message}`)
  process.exit(1)
})
