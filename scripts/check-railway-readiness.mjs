#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0
let fail = 0

function ok(label) { console.log(`  PASS: ${label}`); pass++ }
function nok(label, msg) { console.log(`  FAIL: ${label} — ${msg}`); fail++ }

const checks = [
  // Required files
  ['railway.json exists', () => existsSync(resolve(root, 'railway.json'))],
  ['nixpacks.toml exists', () => existsSync(resolve(root, 'nixpacks.toml'))],
  ['package.json exists', () => existsSync(resolve(root, 'package.json'))],
  ['pnpm-workspace.yaml exists', () => existsSync(resolve(root, 'pnpm-workspace.yaml'))],
  ['pnpm-lock.yaml exists', () => existsSync(resolve(root, 'pnpm-lock.yaml'))],

  // API package
  ['apps/api/package.json exists', () => existsSync(resolve(root, 'apps/api/package.json'))],
  ['apps/api/src/server.ts exists', () => existsSync(resolve(root, 'apps/api/src/server.ts'))],
  ['apps/api/tsconfig.json exists', () => existsSync(resolve(root, 'apps/api/tsconfig.json'))],

  // Railway config content
  () => {
    const rj = JSON.parse(readFileSync(resolve(root, 'railway.json'), 'utf-8'))
    const ok = rj.build?.buildCommand && rj.deploy?.startCommand && rj.deploy?.healthcheckPath
    return ok ? ['railway.json has build, start, healthcheck', true] : ['railway.json missing required fields', false]
  },
  () => {
    const np = readFileSync(resolve(root, 'nixpacks.toml'), 'utf-8')
    return [np.includes('[start]') && np.includes('cmd =') ? 'nixpacks.toml has start command' : 'nixpacks.toml missing start command', np.includes('[start]') && np.includes('cmd =')]
  },

  // Package scripts
  () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'apps/api/package.json'), 'utf-8'))
    return [pkg.scripts?.start ? 'apps/api has "start" script' : 'apps/api missing "start" script', !!pkg.scripts?.start]
  },
  () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
    return [pkg.scripts?.build ? 'root has "build" script' : 'root missing "build" script', !!pkg.scripts?.build]
  },

  // PORT handling
  () => {
    const cfg = readFileSync(resolve(root, 'apps/api/src/config.ts'), 'utf-8')
    return [cfg.includes('PORT') ? 'config.ts reads PORT env' : 'config.ts does not read PORT', cfg.includes('PORT')]
  },

  // Health endpoints
  () => {
    const server = readFileSync(resolve(root, 'apps/api/src/server.ts'), 'utf-8')
    return [server.includes('/api/v1/cloud/health') ? 'Health endpoint /api/v1/cloud/health exists' : 'Missing /api/v1/cloud/health endpoint', server.includes('/api/v1/cloud/health')]
  },
  () => {
    const server = readFileSync(resolve(root, 'apps/api/src/server.ts'), 'utf-8')
    return [server.includes('/mcp') ? 'MCP endpoint /mcp exists' : 'Missing /mcp endpoint', server.includes('/mcp')]
  },
  () => {
    const server = readFileSync(resolve(root, 'apps/api/src/server.ts'), 'utf-8')
    return [server.includes('/v1/router/') ? 'Router endpoints exist' : 'Missing /v1/router/ endpoints', server.includes('/v1/router/')]
  },
  () => {
    const server = readFileSync(resolve(root, 'apps/api/src/server.ts'), 'utf-8')
    return [server.includes('/v1/skills/') ? 'Skills endpoints exist' : 'Missing /v1/skills/ endpoints', server.includes('/v1/skills/')]
  },
  () => {
    const server = readFileSync(resolve(root, 'apps/api/src/server.ts'), 'utf-8')
    return [server.includes('stripe/webhook') ? 'Stripe webhook endpoint exists' : 'Missing stripe/webhook endpoint', server.includes('stripe/webhook')]
  },

  // Database
  () => {
    const cfg = readFileSync(resolve(root, 'apps/api/src/config.ts'), 'utf-8')
    return [cfg.includes('DATABASE_URL') ? 'config.ts reads DATABASE_URL' : 'config.ts does not read DATABASE_URL', cfg.includes('DATABASE_URL')]
  },
  () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'apps/api/package.json'), 'utf-8'))
    return [pkg.dependencies?.pg ? 'pg dependency present' : 'pg dependency missing', !!pkg.dependencies?.pg]
  },
  () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'apps/api/package.json'), 'utf-8'))
    return [pkg.dependencies?.fastify ? 'Fastify dependency present' : 'Fastify dependency missing', !!pkg.dependencies?.fastify]
  },

  // Netlify still valid as fallback
  ['netlify.toml still exists', () => existsSync(resolve(root, 'netlify.toml'))],

  // Docs
  ['docs/RAILWAY_API_DEPLOY.md exists', () => existsSync(resolve(root, 'docs/RAILWAY_API_DEPLOY.md'))],
  ['docs/NETLIFY_API_DEPLOY.md still exists', () => existsSync(resolve(root, 'docs/NETLIFY_API_DEPLOY.md'))],
]

console.log('=== Railway API Deployment Readiness Check ===\n')

for (const check of checks) {
  if (typeof check === 'function') {
    const [label, passed] = check()
    if (passed) ok(label); else nok(label, 'check failed')
  } else {
    const [label, fn] = check
    if (fn()) ok(label); else nok(label, 'not found')
  }
}

const total = pass + fail
console.log(`\n=== Results: ${pass}/${total} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
