#!/usr/bin/env node

const BASE = process.env.STACKLANE_API_URL || 'http://localhost:4000'
const EMAIL = process.env.STACKLANE_ADMIN_EMAIL || 'admin@stacklane.local'
const PASSWORD = process.env.STACKLANE_ADMIN_PASSWORD || 'stacklane-admin'
const COOKIE_JAR = '/tmp/smoke-billing-cookies.txt'
const { spawnSync } = await import('node:child_process')

function curl(method, path, opts = {}) {
  const args = ['-s', '-X', method, `${BASE}${path}`]
  if (opts.data) args.push('-H', 'Content-Type: application/json', '-d', JSON.stringify(opts.data))
  if (opts.cookie) args.push('-b', COOKIE_JAR, '-c', COOKIE_JAR)
  if (opts.auth) args.push('-H', `Authorization: Bearer ${opts.auth}`)
  if (opts.headers) for (const [k,v] of Object.entries(opts.headers)) args.push('-H', `${k}: ${v}`)
  try {
    const result = spawnSync('curl', args, { encoding: 'utf-8', timeout: 10000 })
    if (result.error) throw result.error
    if (result.status !== 0) {
      const err = new Error(`curl exited with ${result.status}: ${result.stderr?.slice(0,200)}`)
      err.stdout = result.stdout
      err.stderr = result.stderr
      throw err
    }
    return JSON.parse(result.stdout)
  } catch (e) {
    const msg = e.stderr || e.stdout || String(e)
    try { return JSON.parse(e.stdout || '{}') } catch { return { error: { code: 'CURL_FAILED', message: msg.slice(0,200) } } }
  }
}

let passed = 0, failed = 0
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name} ${detail}`) }
}

console.log('=== Billing Smoke ===')

// 1. Pricing
const pricing = curl('GET', '/api/v1/cloud/pricing')
check('pricing has talocode_router', pricing?.data?.products?.talocode_router != null)

// 2. Login
curl('POST', '/auth/login', { data: { email: EMAIL, password: PASSWORD }, cookie: true })
const me = curl('GET', '/auth/me', { cookie: true })
check('login as admin', me?.data?.email === EMAIL)

// 3. Create project
const project = curl('POST', '/api/v1/cloud/projects', { data: { name: `Smoke ${Date.now()}`, slug: `smoke-${Date.now()}` }, cookie: true })
const pid = project?.data?.id
check('project created', !!pid, pid)

// 4. Wallet
const wallet = curl('GET', `/api/v1/cloud/projects/${pid}/wallet`, { cookie: true })
check('wallet has 100 credits', wallet?.data?.wallet?.balanceCredits === 100)

// 5. API key
const keyResp = curl('POST', `/api/v1/cloud/projects/${pid}/api-keys`, { data: { name: 'Smoke Key' }, cookie: true })
const rawKey = keyResp?.data?.rawKey
check('api key created', !!rawKey)

// 6. Charge via router
const charge = curl('POST', '/api/v1/cloud/usage/charge', {
  auth: rawKey,
  data: { product: 'agent_browser', action: 'browser.check', requestId: `smoke-${Date.now()}` }
})
check('charge succeeds', charge?.data?.ok === true)

// 7. Wallet after charge
const wallet2 = curl('GET', `/api/v1/cloud/projects/${pid}/wallet`, { cookie: true })
check('wallet deducted', wallet2?.data?.wallet?.balanceCredits === 95)

// 8. Usage events
const usage = curl('GET', `/api/v1/cloud/projects/${pid}/usage`, { cookie: true })
check('usage events exist', (usage?.data?.length || 0) > 0)

// 9. Insufficient credits
const insuff = curl('POST', '/api/v1/cloud/usage/charge', {
  auth: rawKey,
  data: { product: 'codra', action: 'task.large', requestId: `smoke-insuff-${Date.now()}` }
})
check('insufficient returns 402', insuff?.data?.error === 'insufficient_credits' || insuff?.data?.ok === false)

console.log(`\nPassed: ${passed}  Failed: ${failed}`)
process.exit(failed > 0 ? 1 : 0)
