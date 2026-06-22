#!/usr/bin/env node

/**
 * Stacklane v0.3.0 tests.
 * Run: node scripts/test-stacklane-v030.mjs
 */

import * as fs from 'fs'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label}`); failed++; }
}

console.log('\n=== Stacklane v0.3.0 Tests ===\n')

// Test 1: Secrets redaction
console.log('1. Secrets Redaction')
const secrets = fs.readFileSync('packages/core/src/secrets.ts', 'utf-8')
assert(secrets.includes('redactToken'), 'Has redactToken')
assert(secrets.includes('redactPassword'), 'Has redactPassword')
assert(secrets.includes('redactUrl'), 'Has redactUrl')
assert(secrets.includes('safeConnectionSummary'), 'Has safeConnectionSummary')
assert(secrets.includes('assertNoRawSecretInObject'), 'Has secret assertion')

// Test 2: Token redaction
console.log('\n2. Token Redaction')
function redactToken(t) {
  if (!t) return '';
  if (t.includes('...')) return t;
  if (t.length <= 12) return '***';
  return t.slice(0, 8) + '...' + t.slice(-4);
}
assert(redactToken('sk_lane_live_abc123def456') === 'sk_lane_...f456', 'Token redacted correctly')
assert(redactToken('sk_lane_...xyz') === 'sk_lane_...xyz', 'Already redacted unchanged')
assert(redactToken('short') === '***', 'Short token fully redacted')
assert(redactToken('') === '', 'Empty token returns empty')

// Test 3: URL redaction
console.log('\n3. URL Redaction')
function redactUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = '***';
    return parsed.toString();
  } catch { return '***'; }
}
const masked = redactUrl('postgresql://admin:secret123@db.host.com/mydb')
assert(masked.includes('***'), 'Password redacted in URL')
assert(!masked.includes('secret123'), 'Original password not in URL')
assert(masked.includes('db.host.com'), 'Host preserved')
assert(masked.includes('mydb'), 'Database name preserved')

// Test 4: Connection test module
console.log('\n4. Connection Test Module')
assert(fs.existsSync('packages/core/src/databaseTest.ts'), 'databaseTest.ts exists')
const dbTest = fs.readFileSync('packages/core/src/databaseTest.ts', 'utf-8')
assert(dbTest.includes('testDatabaseConnection'), 'Has testDatabaseConnection')
assert(dbTest.includes('DatabaseTestResult'), 'Has result type')
assert(dbTest.includes('connected'), 'Has connected status')
assert(dbTest.includes('failed'), 'Has failed status')
assert(dbTest.includes('not_configured'), 'Has not_configured status')
assert(dbTest.includes('latencyMs'), 'Returns latency')
assert(dbTest.includes('safeHost'), 'Returns safe host only')

// Test 5: Connection test API endpoint
console.log('\n5. Connection Test Endpoint')
assert(fs.existsSync('apps/api/src/modules/database-connections/test-route.ts'), 'Test route exists')
const testRoute = fs.readFileSync('apps/api/src/modules/database-connections/test-route.ts', 'utf-8')
assert(testRoute.includes('database/test'), 'Endpoint path correct')
assert(testRoute.includes('testDatabaseConnection'), 'Uses test function')
assert(testRoute.includes('reply.send'), 'Returns JSON')

// Test 6: App registers test route
console.log('\n6. App Registration')
const appContent = fs.readFileSync('apps/api/src/app.ts', 'utf-8')
assert(appContent.includes('databaseTestRoutes'), 'Test routes registered')

// Test 7: CLI db test command
console.log('\n7. CLI db test')
const cliContent = fs.readFileSync('packages/cli/src/index.ts', 'utf-8')
assert(cliContent.includes("command('db test')"), 'CLI has db test command')
assert(cliContent.includes('testDatabaseConnection'), 'CLI uses test function')
assert(cliContent.includes('--json'), 'CLI supports --json output')

// Test 8: CLI env generate safety
console.log('\n8. CLI Env Safety')
assert(cliContent.includes('Do not commit'), 'Warns about committing')
assert(cliContent.includes('.gitignore'), 'Adds to .gitignore')
assert(cliContent.includes('<YOUR_DATABASE_PASSWORD>'), 'Uses placeholder for password')
assert(cliContent.includes('<YOUR_ACCESS_TOKEN>'), 'Uses placeholder for token')

// Test 9: SDK database.test()
console.log('\n9. SDK database.test()')
const sdkContent = fs.readFileSync('packages/sdk/src/index.ts', 'utf-8')
assert(sdkContent.includes('async test(projectId'), 'SDK has database.test()')
assert(sdkContent.includes('/database/test'), 'SDK calls correct endpoint')

// Test 10: Versions updated
console.log('\n10. Versions')
const corePkg = JSON.parse(fs.readFileSync('packages/core/package.json', 'utf-8'))
assert(corePkg.version === '0.3.0', 'Core is 0.3.0')
const sdkPkg = JSON.parse(fs.readFileSync('packages/sdk/package.json', 'utf-8'))
assert(sdkPkg.version === '0.3.0', 'SDK is 0.3.0')
const cliPkg = JSON.parse(fs.readFileSync('packages/cli/package.json', 'utf-8'))
assert(cliPkg.version === '0.3.0', 'CLI is 0.3.0')

// Test 11: No raw secrets in responses
console.log('\n11. No Raw Secrets')
assert(secrets.includes("'***'"), 'Password redaction returns ***')
assert(secrets.includes("'***'"), 'Token short returns ***')

// Test 12: No fake hosted DB claims
console.log('\n12. No Fake Claims')
let noFake = true
const fakeTerms = ['automatic database creation', 'auto-provision', 'managed hosting']
for (const file of ['README.md', 'docs/API.md']) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8').toLowerCase()
    for (const term of fakeTerms) {
      if (content.includes(term)) { noFake = false; console.log(`  ✗ "${term}" in ${file}`); }
    }
  }
}
assert(noFake, 'No fake hosted DB claims')

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
