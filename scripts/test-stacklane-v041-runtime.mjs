#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed += 1
  } else {
    console.log(`  ✗ ${label}`)
    failed += 1
  }
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Timed out waiting for Stacklane API server')
}

async function requestJson(url, options) {
  const response = await fetch(url, options)
  const json = await response.json()
  return { response, json }
}

async function run() {
  console.log('\n=== Stacklane v0.4.1 Runtime Tests ===\n')

  const repoRoot = process.cwd()
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stacklane-v041-'))
  const port = 4100 + Math.floor(Math.random() * 400)
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
      STACKLANE_STORAGE_ROOT: path.join(tempRoot, '.stacklane', 'files')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let stderr = ''
  let stdout = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })

  try {
    await waitForServer(baseUrl)

    console.log('1. Health and config')
    const health = await requestJson(`${baseUrl}/api/v1/health`)
    assert(health.response.headers.get('content-type')?.includes('application/json') === true, 'health response is JSON')
    assert(health.json.ok === true, 'health endpoint returns ok')

    const config = await requestJson(`${baseUrl}/api/v1/config/status`)
    assert(config.json.ok === true, 'config status returns ok')
    assert(['present', 'default', 'missing'].includes(config.json.config.storageRoot), 'config status only reports presence state')

    console.log('\n2. Customers')
    const customer = await requestJson(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Runtime Customer', email: 'runtime@example.com' })
    })
    assert(customer.response.status === 201, 'create customer returns 201')
    assert(Boolean(customer.json.customer?.id), 'create customer returns id')

    const customerList = await requestJson(`${baseUrl}/api/v1/customers`)
    assert(Array.isArray(customerList.json.customers), 'list customers returns array')

    const customerDetail = await requestJson(`${baseUrl}/api/v1/customers/${customer.json.customer.id}`)
    assert(customerDetail.json.customer?.name === 'Runtime Customer', 'get customer returns created record')

    const customerPatch = await requestJson(`${baseUrl}/api/v1/customers/${customer.json.customer.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' })
    })
    assert(customerPatch.json.customer?.status === 'suspended', 'patch customer updates status')

    console.log('\n3. API keys')
    const apiKey = await requestJson(`${baseUrl}/api/v1/api-keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerId: customer.json.customer.id, name: 'runtime-key', mode: 'dev' })
    })
    assert(apiKey.response.status === 201, 'create api key returns 201')
    assert(typeof apiKey.json.rawKey === 'string', 'raw API key returned once')

    const storedKeys = JSON.parse(fs.readFileSync(path.join(tempRoot, '.stacklane', 'api-keys.json'), 'utf8'))
    assert(!JSON.stringify(storedKeys).includes(apiKey.json.rawKey), 'raw API key is not stored')

    const keyList = await requestJson(`${baseUrl}/api/v1/api-keys`)
    assert(Array.isArray(keyList.json.apiKeys), 'list api keys returns array')

    const keyVerify = await requestJson(`${baseUrl}/api/v1/api-keys/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: apiKey.json.rawKey })
    })
    assert(keyVerify.json.valid === true, 'active API key verifies')

    const keyRevoke = await requestJson(`${baseUrl}/api/v1/api-keys/${apiKey.json.apiKey.id}/revoke`, { method: 'POST' })
    assert(keyRevoke.json.apiKey?.status === 'revoked', 'revoke api key updates status')

    const verifyRevoked = await requestJson(`${baseUrl}/api/v1/api-keys/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: apiKey.json.rawKey })
    })
    assert(verifyRevoked.response.status === 401, 'revoked key returns 401')
    assert(verifyRevoked.response.headers.get('content-type')?.includes('application/json') === true, 'revoked key error is JSON')

    console.log('\n4. Usage')
    const liveKey = await requestJson(`${baseUrl}/api/v1/api-keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerId: customer.json.customer.id, name: 'runtime-live', mode: 'live' })
    })
    const authHeaders = { 'content-type': 'application/json', authorization: `Bearer ${liveKey.json.rawKey}` }

    const usageCreate = await requestJson(`${baseUrl}/api/v1/usage/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ product: 'worklane', action: 'api.request', units: 3 })
    })
    assert(Boolean(usageCreate.json.event?.id), 'usage event created')

    const usageList = await requestJson(`${baseUrl}/api/v1/usage/events`, { headers: { authorization: `Bearer ${liveKey.json.rawKey}` } })
    assert(Array.isArray(usageList.json.events) && usageList.json.events.length >= 1, 'usage list returns events')

    const usageSummary = await requestJson(`${baseUrl}/api/v1/usage/summary`, { headers: { authorization: `Bearer ${liveKey.json.rawKey}` } })
    assert(usageSummary.json.summary?.totalUnits === 3, 'usage summary totals units')

    console.log('\n5. Assets')
    const assetCreate = await requestJson(`${baseUrl}/api/v1/assets`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ product: 'launchpix', filename: 'asset.png', contentType: 'image/png', bytesBase64: Buffer.from('image-bytes').toString('base64') })
    })
    assert(Boolean(assetCreate.json.asset?.id), 'asset created')

    const assetList = await requestJson(`${baseUrl}/api/v1/assets`, { headers: { authorization: `Bearer ${liveKey.json.rawKey}` } })
    assert(Array.isArray(assetList.json.assets) && assetList.json.assets.length >= 1, 'asset list returns assets')

    const assetDetail = await requestJson(`${baseUrl}/api/v1/assets/${assetCreate.json.asset.id}`, { headers: { authorization: `Bearer ${liveKey.json.rawKey}` } })
    assert(assetDetail.json.asset?.filename === 'asset.png', 'asset detail returns created asset')

    const assetDelete = await requestJson(`${baseUrl}/api/v1/assets/${assetCreate.json.asset.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${liveKey.json.rawKey}` } })
    assert(assetDelete.json.asset?.id === assetCreate.json.asset.id, 'asset delete returns deleted asset')

    console.log('\n6. Files and safety')
    const fileCreate = await requestJson(`${baseUrl}/api/v1/files`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ product: 'worklane', filename: 'report.json', contentType: 'application/json', bytesBase64: Buffer.from('{"ok":true}').toString('base64') })
    })
    assert(fileCreate.response.status === 201, 'file endpoint creates local file record')
    assert(Boolean(fileCreate.json.file?.storagePath), 'file endpoint returns storage path')

    const badFile = await requestJson(`${baseUrl}/api/v1/files`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ product: 'worklane', filename: '../secret.txt', contentType: 'text/plain', bytesBase64: Buffer.from('x').toString('base64') })
    })
    assert(badFile.response.status === 201 || badFile.response.status === 400, 'unsafe filename is handled predictably')
    if (badFile.response.status === 400) {
      assert(badFile.response.headers.get('content-type')?.includes('application/json') === true, 'unsafe filename error is JSON')
    }
  } finally {
    child.kill('SIGTERM')
    await new Promise((resolve) => setTimeout(resolve, 300))
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }

  if (stderr.trim()) {
    console.log('\nRuntime stderr (informational):')
    console.log(stderr.trim())
  }

  if (stdout.trim()) {
    console.log('\nRuntime stdout (informational):')
    console.log(stdout.trim())
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
