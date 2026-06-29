#!/usr/bin/env node

const BASE = process.env.STACKLANE_API_URL || 'http://localhost:4000'
const EMAIL = process.env.STACKLANE_ADMIN_EMAIL || 'admin@stacklane.local'
const PASSWORD = process.env.STACKLANE_ADMIN_PASSWORD || 'stacklane-admin'
const COOKIE_JAR = '/tmp/smoke-billing-cookies.txt'
const { execSync } = await import('node:child_process')
const { writeFileSync, unlinkSync } = await import('node:fs')

function curl(method, path, opts = {}) {
  const args = ['curl', '-sf', '-X', method, `${BASE}${path}`]
  if (opts.data) args.push('-H', 'Content-Type: application/json', '-d', JSON.stringify(opts.data))
  if (opts.cookie) args.push('-b', COOKIE_JAR, '-c', COOKIE_JAR)
  if (opts.auth) args.push('-H', `Authorization: Bearer ${opts.auth}`)
  if (opts.headers) for (const [k,v] of Object.entries(opts.headers)) args.push('-H', `${k}: ${v}`)
  try {
    const out = execSync(args.join(' '), { encoding: 'utf-8', timeout: 10000 })
    return JSON.parse(out)
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
check('wallet deducted', wallet2?.data?.wallet?.balanceCredits === 98)

// 8. Usage events
const usage = curl('GET', `/api/v1/cloud/projects/${pid}/usage`, { cookie: true })
check('usage events exist', (usage?.data?.length || 0) > 0)

// 9. Insufficient credits
const insuff = curl('POST', '/api/v1/cloud/usage/charge', {
  auth: rawKey,
  data: { product: 'codra', action: 'task.large', requestId: `smoke-insuff-${Date.now()}` }
})
check('insufficient returns 402', insuff?.error?.code === 'insufficient_credits' || insuff?.data?.ok === false)

console.log(`\nPassed: ${passed}  Failed: ${failed}`)
process.exit(failed > 0 ? 1 : 0)
