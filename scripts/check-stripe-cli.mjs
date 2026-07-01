#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let passCount = 0
let failCount = 0
let warnCount = 0

function pass(msg) {
  console.log(`  \u2705 ${msg}`)
  passCount++
}

function fail(msg) {
  console.log(`  \u274C ${msg}`)
  failCount++
}

function warn(msg) {
  console.log(`  \u26A0\uFE0F  ${msg}`)
  warnCount++
}

function redact(str) {
  if (!str || str.length < 8) return '(empty or too short)'
  return str.slice(0, 4) + '...' + str.slice(-4)
}

async function run() {
  console.log('=== Stripe CLI Setup Check ===\n')

  // ─── 1. Stripe CLI installed ──────────────────────────────────────────────

  console.log('1. Stripe CLI installation')
  try {
    const version = execSync('stripe version 2>&1', { encoding: 'utf-8' }).trim()
    pass(`Stripe CLI installed: ${version.split('\n')[0]}`)
  } catch {
    fail('Stripe CLI is not installed or not in PATH')
  }

  // ─── 2. Stripe CLI logged in ─────────────────────────────────────────────

  console.log('\n2. Stripe CLI login status')
  try {
    const config = execSync('stripe config --list 2>&1', { encoding: 'utf-8' })
    if (config.includes('device_id')) {
      pass('Stripe CLI is logged in')
    } else if (config.includes('color')) {
      warn('Stripe CLI config found but login status unclear (no device_id)')
    } else {
      warn('Stripe CLI not logged in — run `stripe login`')
    }
  } catch {
    warn('Could not determine Stripe CLI login status')
  }

  // ─── 3. STRIPE_WEBHOOK_SECRET prefix check ────────────────────────────────

  console.log('\n3. Webhook secret checks')
  const envFiles = [
    resolve(root, 'apps/api/.env'),
    resolve(root, 'apps/api/.env.local'),
    resolve(root, 'apps/api/.env.production'),
  ]

  let foundWhsec = false
  for (const file of envFiles) {
    if (!existsSync(file)) continue
    const content = readFileSync(file, 'utf-8')
    const match = content.match(/^STRIPE_WEBHOOK_SECRET=(.+)$/m)
    if (match) {
      foundWhsec = true
      const secret = match[1].trim()
      if (secret.startsWith('whsec_')) {
        if (secret.includes('live') || secret.length > 40) {
          // Live secrets are longer with more entropy; local ones are shorter
          // This is a heuristic, not a guarantee
        }
        pass(`STRIPE_WEBHOOK_SECRET found in ${file} (${redact(secret)})`)
      } else if (secret.startsWith('sk_live_')) {
        fail(`STRIPE_WEBHOOK_SECRET appears to be a secret key (sk_live_) not a webhook secret in ${file}`)
      } else {
        warn(`STRIPE_WEBHOOK_SECRET in ${file} does not start with whsec_ (${redact(secret)})`)
      }
    }
  }

  if (!foundWhsec) {
    warn('No STRIPE_WEBHOOK_SECRET found in local env files')
  }

  // ─── 4. Webhook route exists in server ────────────────────────────────────

  console.log('\n4. Webhook route in server code')
  const serverPath = resolve(root, 'apps/api/src/server.ts')
  if (existsSync(serverPath)) {
    const content = readFileSync(serverPath, 'utf-8')
    const route = '/api/v1/cloud/billing/stripe/webhook'
    if (content.includes(route)) {
      pass(`Webhook route ${route} exists in server.ts`)
    } else {
      fail(`Webhook route ${route} not found in server.ts`)
    }
    if (content.includes('stripe-signature') || content.includes('Stripe-Signature')) {
      pass('Stripe signature verification present')
    } else {
      warn('No Stripe signature verification found in server.ts')
    }
    if (content.includes('checkout.session.completed')) {
      pass('checkout.session.completed handler present')
    } else {
      fail('checkout.session.completed handler not found in server.ts')
    }
  } else {
    fail('server.ts not found')
  }

  // ─── 5. No live keys in local env files ───────────────────────────────────

  console.log('\n5. Live key detection in local files')
  for (const dir of ['apps/api', '.']) {
    const dirPath = resolve(root, dir)
    if (!existsSync(dirPath)) continue
    const files = readdirSync(dirPath)
    for (const file of files) {
      if (!file.startsWith('.env') || file.endsWith('.example')) continue
      const fullPath = resolve(dirPath, file)
      const content = readFileSync(fullPath, 'utf-8')

      const skLiveMatch = content.match(/^(STRIPE_SECRET_KEY|STRIPE_PUBLISHABLE_KEY)=(.+)$/m)
      if (skLiveMatch) {
        const val = skLiveMatch[2].trim()
        if (val.startsWith('sk_live_') || val.startsWith('pk_live_')) {
          fail(`Live key found in ${file}: ${skLiveMatch[1]} starts with live prefix (${redact(val)})`)
        } else if (val && !val.startsWith('sk_test_') && !val.startsWith('pk_test_')) {
          warn(`${file}: ${skLiveMatch[1]} does not start with test or live prefix (${redact(val)})`)
        } else if (val) {
          pass(`${file}: ${skLiveMatch[1]} uses test keys (${redact(val)})`)
        }
      }
    }
  }

  // ─── 6. Required Stripe env vars documented ────────────────────────────────

  console.log('\n6. Stripe env vars in deployment docs')
  const envExamplePath = resolve(root, 'apps/api/.env.netlify.example')
  if (existsSync(envExamplePath)) {
    const content = readFileSync(envExamplePath, 'utf-8')
    const required = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET']
    for (const key of required) {
      if (content.includes(key)) {
        pass(`${key} documented in .env.netlify.example`)
      } else {
        fail(`${key} missing from .env.netlify.example`)
      }
    }
  } else {
    fail('.env.netlify.example not found')
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed, ${warnCount} warnings ===`)

  if (failCount > 0) {
    console.error('\n\u274C Issues found — review and fix.')
    process.exit(1)
  }
  if (warnCount > 0) {
    console.log('\n\u26A0\uFE0F  Warnings present — review before deploying.')
  }
  if (passCount > 0 && failCount === 0 && warnCount === 0) {
    console.log('\n\u2705 All checks passed.')
  }
}

run().catch((err) => {
  console.error('Check crashed:', err)
  process.exit(1)
})
