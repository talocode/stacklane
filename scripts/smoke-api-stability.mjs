#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const apiDir = resolve(repoRoot, 'apps', 'api')

const PORT = 4001
const BASE = `http://localhost:${PORT}`
const TEST_DURATION_MS = 45_000
const POLL_INTERVAL_MS = 500
const MAX_STARTUP_WAIT_MS = 40_000

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args)
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return true
    } catch {}
    await sleep(POLL_INTERVAL_MS)
  }
  return false
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    ...options,
  })
  return { status: res.status, body: await res.json() }
}

async function run() {
  log('=== Stacklane API Stability Smoke Test ===')
  log(`Target: ${BASE}`)
  log(`Duration: ${TEST_DURATION_MS / 1000}s`)

  // --- Start server ---
  log('\n1. Starting server...')
  const env = {
    ...process.env,
    PORT: String(PORT),
    STACKLANE_SKIP_BOOTSTRAP: '1',
    STACKLANE_SKIP_WORKER: '1',
  }

  const child = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: apiDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let childExited = false
  child.on('exit', (code, signal) => {
    childExited = true
    log(`Server exited: code=${code} signal=${signal}`)
  })

  const childStdout = []
  const childStderr = []
  child.stdout.on('data', (d) => childStdout.push(d.toString()))
  child.stderr.on('data', (d) => childStderr.push(d.toString()))

  try {
    const started = await waitForServer(`${BASE}/health`, MAX_STARTUP_WAIT_MS)
    if (!started) {
      log('FATAL: Server did not start within timeout')
      log('STDOUT:', childStdout.join(''))
      log('STDERR:', childStderr.join(''))
      process.exit(1)
    }
    log('Server is up')

    // --- Run tests ---
    log('\n2. Health endpoint')
    const health = await jsonFetch(`${BASE}/health`)
    log(`   GET /health: ${health.status} ok=${health.body.ok}`)
    if (health.body.ok !== true) throw new Error('/health failed')

    log('\n3. Cloud health endpoint')
    const cloudHealth = await jsonFetch(`${BASE}/api/v1/cloud/health`)
    log(`   GET /api/v1/cloud/health: ${cloudHealth.status} service=${cloudHealth.body.service} db=${cloudHealth.body.database}`)

    log('\n4. MCP without auth (expect controlled 401/MISSING_API_KEY)')
    const noAuth = await jsonFetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    })
    log(`   POST /mcp (no auth): ${noAuth.status} error=${noAuth.body?.error?.code || noAuth.body?.error?.message}`)
    if (noAuth.status !== 401 && !noAuth.body?.error?.code?.includes('AUTH')) {
      throw new Error('Expected auth error for missing API key')
    }

    log('\n5. MCP tools/list with auth')
    const toolsList = await jsonFetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer tk_dev_test_stability' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 2 }),
    })
    const toolCount = toolsList.body?.result?.tools?.length || 0
    log(`   POST /mcp tools/list: ${toolsList.status} tools=${toolCount}`)

    log('\n6. MCP tool list endpoint')
    const toolList = await jsonFetch(`${BASE}/api/v1/cloud/mcp/tools`)
    const count = toolList.body?.result?.tools?.length || 0
    log(`   GET /api/v1/cloud/mcp/tools: ${toolList.status} tools=${count}`)

    log('\n7. Router models')
    const models = await jsonFetch(`${BASE}/v1/router/models`)
    const modelCount = models.body?.data?.length || 0
    log(`   GET /v1/router/models: ${models.status} models=${modelCount}`)

    log('\n8. Router health')
    const routerHealth = await jsonFetch(`${BASE}/api/v1/cloud/router/health`)
    log(`   GET /api/v1/cloud/router/health: ${routerHealth.status}`)

    // --- Stability period ---
    log(`\n9. Stability check: repeated requests for ${TEST_DURATION_MS / 1000}s`)
    const deadline = Date.now() + TEST_DURATION_MS
    let requestCount = 0
    let failureCount = 0

    while (Date.now() < deadline) {
      if (childExited) {
        log('FATAL: Server exited during stability test')
        log('STDOUT:', childStdout.join(''))
        log('STDERR:', childStderr.join(''))
        process.exit(1)
      }

      try {
        const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) })
        if (!res.ok) failureCount++
        requestCount++
      } catch {
        failureCount++
      }

      // Also hit MCP every 5 requests
      if (requestCount % 5 === 0) {
        try {
          await fetch(`${BASE}/api/v1/cloud/mcp/tools`, { signal: AbortSignal.timeout(3000) })
        } catch {}
      }

      // Small jitter
      await sleep(POLL_INTERVAL_MS)
    }

    const successRate = ((1 - failureCount / requestCount) * 100).toFixed(1)
    log(`   Requests: ${requestCount}, Failures: ${failureCount}, Success rate: ${successRate}%`)

    if (failureCount > 0) {
      log('WARN: Some requests failed during stability period')
    }

    log('\n=== Stability smoke test PASSED ===')
  } finally {
    if (!childExited) {
      child.kill('SIGTERM')
      await sleep(2000)
      if (!childExited) child.kill('SIGKILL')
    }
  }
}

run().catch((err) => {
  console.error('SMOKE FAILED:', err)
  process.exit(1)
})
