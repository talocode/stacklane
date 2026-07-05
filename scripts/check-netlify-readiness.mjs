#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const REQUIRED_FILES = [
  'netlify/functions/api.mjs',
  'netlify.toml',
  'apps/api/package.json',
  'apps/api/src/server.ts',
  'apps/api/.env.netlify.example',
  '.env.example',
  'scripts/smoke-api-stability.mjs',
  'scripts/smoke-netlify-api.mjs',
  'docs/NETLIFY_API_DEPLOY.md',
]

const REQUIRED_SCRIPTS = {
  'apps/api/package.json': ['start', 'build'],
}

const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'TALOCODE_BASE_URL',
  'TALOCODE_WEB_URL',
  'TALOCODE_MCP_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
]

const FORBIDDEN_PRIMARY_URLS = [
  'https://api.talocode.xyz',
  'https://talocode.xyz',
]

const MANDATORY_PRODUCTION_URL = 'https://api.talocode.site'

let passCount = 0
let failCount = 0
let warnCount = 0

function pass(msg) {
  console.log(`  ✅ ${msg}`)
  passCount++
}

function fail(msg) {
  console.log(`  ❌ ${msg}`)
  failCount++
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`)
  warnCount++
}

function readdirRecursive(dir) {
  const entries = []
  try {
    const files = readdirSync(dir)
    for (const file of files) {
      const fullPath = join(dir, file)
      if (statSync(fullPath).isDirectory()) {
        entries.push(...readdirRecursive(fullPath))
      } else {
        entries.push(fullPath)
      }
    }
  } catch {}
  return entries
}

async function run() {
  console.log('=== Netlify Deployment Readiness Check ===\n')

  // 1. Required files
  console.log('1. Required files exist')
  for (const file of REQUIRED_FILES) {
    const fullPath = resolve(root, file)
    if (existsSync(fullPath)) {
      pass(`${file} exists`)
    } else {
      fail(`${file} is missing`)
    }
  }

  // 2. Package scripts
  console.log('\n2. Package scripts')
  for (const [pkg, scripts] of Object.entries(REQUIRED_SCRIPTS)) {
    const fullPath = resolve(root, pkg)
    if (!existsSync(fullPath)) {
      fail(`${pkg} not found`)
      continue
    }
    const content = JSON.parse(readFileSync(fullPath, 'utf-8'))
    for (const script of scripts) {
      if (content.scripts?.[script]) {
        pass(`${pkg}: "${script}" script exists`)
      } else {
        fail(`${pkg}: "${script}" script is missing`)
      }
    }
  }

  // 3. Health endpoints exist in source
  console.log('\n3. Health endpoints in server.ts')
  const serverPath = resolve(root, 'apps/api/src/server.ts')
  if (existsSync(serverPath)) {
    const serverContent = readFileSync(serverPath, 'utf-8')
    const healthEndpoints = ['/health', '/api/v1/cloud/health', '/v1/skills/health', '/v1/agent-browser/health']
    for (const ep of healthEndpoints) {
      if (serverContent.includes(`path === '${ep}'`) || serverContent.includes(`path === \"${ep}\"`)) {
        pass(`Health endpoint ${ep} exists`)
      } else {
        fail(`Health endpoint ${ep} not found in server.ts`)
      }
    }

    if (serverContent.includes('/v1/router/models')) {
      pass('Router models endpoint exists')
    } else {
      fail('Router models endpoint not found')
    }

    if (serverContent.includes('/api/v1/cloud/mcp/tools') || serverContent.includes('mcp/tools')) {
      pass('MCP tools endpoint exists')
    } else {
      fail('MCP tools endpoint not found')
    }
  } else {
    fail('server.ts not found')
  }

  // 4. Smoke scripts
  console.log('\n4. Smoke scripts')
  const smokeScripts = ['smoke-api-stability.mjs', 'smoke-netlify-api.mjs']
  for (const s of smokeScripts) {
    const fullPath = resolve(root, 'scripts', s)
    if (existsSync(fullPath)) {
      pass(`scripts/${s} exists`)
    } else {
      fail(`scripts/${s} is missing`)
    }
  }

  // 5. No talocode.xyz primary URLs
  console.log('\n5. Domain migration (no .xyz as primary)')
  const checkDirs = ['apps/api/src', 'packages/sdk/src', 'packages/talocode-mcp/src', 'docs']
  for (const dir of checkDirs) {
    const dirPath = resolve(root, dir)
    if (!existsSync(dirPath)) continue
    const entries = readdirRecursive(dirPath)
    for (const file of entries) {
      if (!file.endsWith('.ts') && !file.endsWith('.md') && !file.endsWith('.mjs')) continue
      try {
        const content = readFileSync(file, 'utf-8')
        for (const url of FORBIDDEN_PRIMARY_URLS) {
          if (content.includes(url)) {
            const line = content.split('\n').find((l) => l.includes(url))
            if (line && !line.toLowerCase().includes('legacy') && !line.toLowerCase().includes('alias')) {
              fail(`${file} still contains primary URL ${url}`)
              break
            }
          }
        }
      } catch {}
    }
  }
  pass('No talocode.xyz primary URLs in source/docs (only legacy aliases remain)')

  // 6. api.talocode.site in production docs
  console.log('\n6. Production URL in docs')
  const docFiles = [
    'docs/TALOCODE_SDK.md',
    'docs/TALOCODE_MCP.md',
    'docs/TALOCODE_MCP_BRIDGE.md',
    'docs/TALOCODE_CLOUD_BILLING.md',
    'docs/NETLIFY_API_DEPLOY.md',
  ]
  for (const doc of docFiles) {
    const fullPath = resolve(root, doc)
    if (!existsSync(fullPath)) {
      warn(`${doc} not found (optional)`)
      continue
    }
    const content = readFileSync(fullPath, 'utf-8')
    if (content.includes(MANDATORY_PRODUCTION_URL)) {
      pass(`${doc} references ${MANDATORY_PRODUCTION_URL}`)
    } else {
      fail(`${doc} does not reference ${MANDATORY_PRODUCTION_URL}`)
    }
  }

  // 7. Env var names documented
  console.log('\n7. Required env vars documented')
  const envExamplePath = resolve(root, 'apps/api/.env.netlify.example')
  if (existsSync(envExamplePath)) {
    const envContent = readFileSync(envExamplePath, 'utf-8')
    for (const key of REQUIRED_ENV_KEYS) {
      if (envContent.includes(key)) {
        pass(`Env var ${key} documented`)
      } else {
        warn(`Env var ${key} not found in .env.netlify.example (may not be required)`)
      }
    }
  } else {
    fail('apps/api/.env.netlify.example not found')
  }

  // Summary
  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed, ${warnCount} warnings ===`)
  if (failCount > 0) {
    console.error('\n❌ Readiness check FAILED — fix issues before deploying.')
    process.exit(1)
  }
  if (warnCount > 0) {
    console.log('\n⚠️  Warnings present — review before deploying.')
  }
  console.log('\n✅ Ready for Netlify deployment.')
}

run().catch((err) => {
  console.error('Readiness check crashed:', err)
  process.exit(1)
})
