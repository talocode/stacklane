#!/usr/bin/env node

const BASE = process.env.STACKLANE_API_URL || 'http://localhost:4000'
const EMAIL = process.env.STACKLANE_ADMIN_EMAIL || 'admin@stacklane.local'
const PASSWORD = process.env.STACKLANE_ADMIN_PASSWORD || 'stacklane-admin'
const COOKIE_JAR = '/tmp/smoke-router-cookies.txt'
const { spawnSync } = await import('node:child_process')

function curl(method, path, opts = {}) {
  const args = ['-s', '-X', method, `${BASE}${path}`]
  if (opts.data) args.push('-H', 'Content-Type: application/json', '-d', JSON.stringify(opts.data))
  if (opts.cookie) args.push('-b', COOKIE_JAR, '-c', COOKIE_JAR)
  if (opts.auth) args.push('-H', `Authorization: Bearer ${opts.auth}`)
  if (opts.headers) for (const [k,v] of Object.entries(opts.headers)) args.push('-H', `${k}: ${v}`)
  try {
    const result = spawnSync('curl', args, { encoding: 'utf-8', timeout: 15000 })
    if (result.error) throw result.error
    if (result.status !== 0) {
      const err = new Error(`curl exited with ${result.status}: ${result.stderr?.slice(0,200)}`)
      err.stdout = result.stdout
      err.stderr = result.stderr
      throw err
    }
    return JSON.parse(result.stdout)
  } catch (e) {
    try { return JSON.parse(e.stdout || '{}') } catch { return { error: { code: 'CURL_FAILED', message: String(e).slice(0,200) } } }
  }
}

let passed = 0, failed = 0
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name} ${detail}`) }
}

console.log('=== Router Smoke ===')

// 1. /v1/models
const models = curl('GET', '/v1/models')
const modelIds = (models?.data || models || []).map(m => m.id)
check('/v1/models has talocode/auto', modelIds.includes('talocode/auto'))
check('/v1/models has talocode/fast', modelIds.includes('talocode/fast'))
check('/v1/models has talocode/coding', modelIds.includes('talocode/coding'))

// 2. Router health
const health = curl('GET', '/api/v1/cloud/router/health')
check('router health', health?.data?.status === 'operational')

// 3. Router providers
const providers = curl('GET', '/api/v1/cloud/router/providers')
check('router providers has mock', (providers?.data || []).some(p => p.name === 'mock'))

// 4. Login + project + key
curl('POST', '/auth/login', { data: { email: EMAIL, password: PASSWORD }, cookie: true })
const project = curl('POST', '/api/v1/cloud/projects', { data: { name: `RouterSmoke ${Date.now()}`, slug: `router-smoke-${Date.now()}` }, cookie: true })
const pid = project?.data?.id
check('project created', !!pid)
const keyResp = curl('POST', `/api/v1/cloud/projects/${pid}/api-keys`, { data: { name: 'Smoke Key' }, cookie: true })
const rawKey = keyResp?.data?.rawKey
check('api key created', !!rawKey)

// 5. Chat completions
const chat = curl('POST', '/v1/chat/completions', {
  auth: rawKey,
  data: { model: 'talocode/auto', messages: [{ role: 'user', content: 'Hello' }] }
})
check('chat returns choices', (chat?.choices?.length || 0) > 0)
check('chat returns usage', chat?.usage?.total_tokens > 0)
check('chat uses mock provider', chat?.provider === 'mock')

// 6. Wallet after
const wallet = curl('GET', `/api/v1/cloud/projects/${pid}/wallet`, { cookie: true })
check('credits deducted', (wallet?.data?.wallet?.balanceCredits || 100) < 100)

// 7. Usage events
const usage = curl('GET', `/api/v1/cloud/projects/${pid}/usage`, { cookie: true })
const routerEvents = (usage?.data || []).filter(e => e.product === 'talocode_router')
check('router usage events exist', routerEvents.length > 0)
check('router event status success', routerEvents[0]?.status === 'success')
check('raw prompt not stored', !JSON.stringify(routerEvents).includes('Hello'))

// 8. Insufficient credits
const walletBalance = wallet?.data?.wallet?.balanceCredits || 0
for (let i = 0; i < 33; i++) {
  curl('POST', '/v1/chat/completions', { auth: rawKey, data: { model: 'talocode/fast', messages: [{ role: 'user', content: 'x' }] } })
}
const insuff = curl('POST', '/v1/chat/completions', {
  auth: rawKey,
  data: { model: 'talocode/auto', messages: [{ role: 'user', content: 'Test 402' }] }
})
check('insufficient credits returns error', insuff?.error?.code === 'insufficient_credits')

console.log(`\nPassed: ${passed}  Failed: ${failed}`)
process.exit(failed > 0 ? 1 : 0)
