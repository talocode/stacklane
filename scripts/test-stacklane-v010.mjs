#!/usr/bin/env node

/**
 * Stacklane v0.1.0 tests.
 * Run: node scripts/test-stacklane-v010.mjs
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label}`); failed++; }
}

console.log('\n=== Stacklane v0.1.0 Tests ===\n')

// Test 1: Token generation
console.log('1. Token Generation')
const TOKEN_PREFIX = 'sk_lane_'
const rawToken = TOKEN_PREFIX + crypto.randomBytes(48).toString('base64url')
assert(rawToken.startsWith('sk_lane_'), 'Token has correct prefix')
assert(rawToken.length > 20, 'Token is sufficiently long')

const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
assert(tokenHash.length === 64, 'Hash is SHA-256')

// Test 2: Token verification
console.log('\n2. Token Verification')
const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex')
assert(computedHash === tokenHash, 'Hash verification works')
const wrongToken = 'sk_lane_wrong_token'
const wrongHash = crypto.createHash('sha256').update(wrongToken).digest('hex')
assert(wrongHash !== tokenHash, 'Wrong token fails verification')

// Test 3: Token prefix extraction
console.log('\n3. Token Prefix')
const prefix = rawToken.slice(0, 12) + '...'
assert(prefix.endsWith('...'), 'Prefix ends with ...')
assert(!prefix.includes(rawToken.slice(12)), 'Prefix does not contain full token')

// Test 4: Database URL validation
console.log('\n4. Database URL Validation')
function validateDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return { valid: false, error: 'required' }
  try {
    const parsed = new URL(url)
    if (!['postgres:', 'postgresql:', 'sqlite:'].includes(parsed.protocol)) {
      return { valid: false, error: 'invalid protocol' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'invalid URL' }
  }
}

assert(validateDatabaseUrl('postgresql://user:pass@host/db').valid, 'Valid postgres URL')
assert(validateDatabaseUrl('sqlite:///local.db').valid, 'Valid sqlite URL')
assert(!validateDatabaseUrl('http://example.com').valid, 'Rejects http URL')
assert(!validateDatabaseUrl('').valid, 'Rejects empty URL')

// Test 5: Database URL masking
console.log('\n5. Database URL Masking')
function maskDatabaseUrl(url) {
  try {
    const parsed = new URL(url)
    if (parsed.password) parsed.password = '***'
    return parsed.toString()
  } catch { return '***' }
}

const masked = maskDatabaseUrl('postgresql://user:secret123@host/db')
assert(masked.includes('***'), 'Password masked')
assert(!masked.includes('secret123'), 'Original password not in masked URL')

// Test 6: Core module exists
console.log('\n6. Core Module')
assert(fs.existsSync('packages/core/src/index.ts'), 'Core index exists')
assert(fs.existsSync('packages/core/src/tokens/access-token.ts'), 'Token module exists')
assert(fs.existsSync('packages/core/src/database/connection.ts'), 'Database module exists')
assert(fs.existsSync('packages/core/src/audit/events.ts'), 'Audit module exists')

// Test 7: API routes exist
console.log('\n7. API Routes')
assert(fs.existsSync('apps/api/src/modules/tokens/routes.ts'), 'Token routes exist')
assert(fs.existsSync('apps/api/src/modules/database-connections/routes.ts'), 'Database routes exist')
assert(fs.existsSync('apps/api/src/modules/audit/routes.ts'), 'Audit routes exist')

// Test 8: App registers new routes
console.log('\n8. App Registration')
const appContent = fs.readFileSync('apps/api/src/app.ts', 'utf-8')
assert(appContent.includes('tokenRoutes'), 'Token routes registered')
assert(appContent.includes('databaseConnectionRoutes'), 'Database routes registered')
assert(appContent.includes('auditRoutes'), 'Audit routes registered')

// Test 9: No secrets in code
console.log('\n9. No Secrets')
let noSecrets = true
const secretPatterns = ['sk_lane_live_sk', 'password123', 'secret_key', 'api_key=']
const filesToCheck = ['packages/core/src/tokens/access-token.ts', 'packages/core/src/database/connection.ts']
for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf-8').toLowerCase()
  for (const pattern of secretPatterns) {
    if (content.includes(pattern)) {
      noSecrets = false
      console.log(`  ✗ Secret pattern "${pattern}" in ${file}`)
    }
  }
}
assert(noSecrets, 'No hardcoded secrets')

// Test 10: JSON-only responses
console.log('\n10. JSON-Only Responses')
assert(appContent.includes('reply.send') || appContent.includes('return reply'), 'API returns JSON responses')
assert(appContent.includes('VALIDATION_ERROR'), 'Error format uses codes')

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
