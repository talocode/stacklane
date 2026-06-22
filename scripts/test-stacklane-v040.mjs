#!/usr/bin/env node

/**
 * Stacklane v0.4.0 tests.
 * Run: node scripts/test-stacklane-v040.mjs
 */

import * as fs from 'fs'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label}`); failed++; }
}

console.log('\n=== Stacklane v0.4.0 Tests ===\n')

// Test 1: Core modules exist
console.log('1. Core Modules')
assert(fs.existsSync('packages/core/src/customers/apiKeys.ts'), 'Customer API keys module exists')
assert(fs.existsSync('packages/core/src/usage/events.ts'), 'Usage events module exists')
assert(fs.existsSync('packages/storage/src/local.ts'), 'Local storage module exists')

// Test 2: Customer API key behavior
console.log('\n2. Customer API Keys')
const apiKeysContent = fs.readFileSync('packages/core/src/customers/apiKeys.ts', 'utf-8')
assert(apiKeysContent.includes('sk_lane_customer_'), 'Customer key format')
assert(apiKeysContent.includes('crypto.randomBytes'), 'Uses secure random')
assert(apiKeysContent.includes('sha256'), 'Hashes with SHA-256')
assert(apiKeysContent.includes('timingSafeEqual'), 'Uses timing-safe comparison')
assert(apiKeysContent.includes('keyPrefix'), 'Stores prefix only')
assert(apiKeysContent.includes('keyHash'), 'Stores hash only')

// Test 3: Usage events
console.log('\n3. Usage Events')
const usageContent = fs.readFileSync('packages/core/src/usage/events.ts', 'utf-8')
assert(usageContent.includes('asset.generate'), 'Has asset.generate event type')
assert(usageContent.includes('screenshot.upload'), 'Has screenshot.upload event type')
assert(usageContent.includes('storage.write'), 'Has storage.write event type')

// Test 4: Local file storage
console.log('\n4. Local File Storage')
const storageContent = fs.readFileSync('packages/storage/src/local.ts', 'utf-8')
assert(storageContent.includes('.stacklane/files'), 'Default storage root')
assert(storageContent.includes('sanitizeFilename'), 'Sanitizes filenames')
assert(storageContent.includes('generateStorageKey'), 'Generates storage keys')
assert(storageContent.includes('validateMimeType'), 'Validates MIME types')
assert(storageContent.includes('image/png'), 'Allows PNG')
assert(storageContent.includes('image/jpeg'), 'Allows JPEG')
assert(storageContent.includes('image/webp'), 'Allows WEBP')
assert(storageContent.includes('writeLocalFile'), 'Has write function')
assert(storageContent.includes('readLocalFile'), 'Has read function')
assert(storageContent.includes('deleteLocalFile'), 'Has delete function')

// Test 5: File API endpoints
console.log('\n5. File Endpoints')
assert(fs.existsSync('apps/api/src/modules/files/routes.ts'), 'File routes exist')
const fileRoutes = fs.readFileSync('apps/api/src/modules/files/routes.ts', 'utf-8')
assert(fileRoutes.includes('/v1/projects/:projectId/files'), 'Has files list endpoint')
assert(fileRoutes.includes('/v1/projects/:projectId/files/:fileId/download'), 'Has download endpoint')
assert(fileRoutes.includes('validateMimeType'), 'Validates MIME type')

// Test 6: Asset endpoints
console.log('\n6. Asset Endpoints')
assert(fs.existsSync('apps/api/src/modules/assets/routes.ts'), 'Asset routes exist')
const assetRoutes = fs.readFileSync('apps/api/src/modules/assets/routes.ts', 'utf-8')
assert(assetRoutes.includes('/v1/projects/:projectId/assets'), 'Has assets endpoint')

// Test 7: Customer endpoints
console.log('\n7. Customer Endpoints')
assert(fs.existsSync('apps/api/src/modules/customers/routes.ts'), 'Customer routes exist')
const customerRoutes = fs.readFileSync('apps/api/src/modules/customers/routes.ts', 'utf-8')
assert(customerRoutes.includes('/v1/customers'), 'Has customers endpoint')
assert(customerRoutes.includes('/v1/customers/api-keys'), 'Has API keys endpoint')
assert(customerRoutes.includes('/v1/customers/api-keys/verify'), 'Has key verify endpoint')

// Test 8: App registers new routes
console.log('\n8. App Registration')
const appContent = fs.readFileSync('apps/api/src/app.ts', 'utf-8')
assert(appContent.includes('customerRoutes'), 'Customer routes registered')
assert(appContent.includes('fileRoutes'), 'File routes registered')
assert(appContent.includes('assetRoutes'), 'Asset routes registered')

// Test 9: SDK methods
console.log('\n9. SDK Methods')
const sdkContent = fs.readFileSync('packages/sdk/src/index.ts', 'utf-8')
assert(sdkContent.includes('customers:'), 'SDK has customers section')
assert(sdkContent.includes('apiKeys:'), 'SDK has apiKeys section')
assert(sdkContent.includes('usage:'), 'SDK has usage section')
assert(sdkContent.includes('files:'), 'SDK has files section')
assert(sdkContent.includes('assets:'), 'SDK has assets section')
assert(sdkContent.includes('/v1/customers'), 'SDK calls customers endpoint')
assert(sdkContent.includes('/v1/customers/api-keys'), 'SDK calls API keys endpoint')
assert(sdkContent.includes('/v1/usage'), 'SDK calls usage endpoint')
assert(sdkContent.includes('/v1/projects/'), 'SDK calls project-scoped endpoints')

// Test 10: CLI commands
console.log('\n10. CLI Commands')
const cliContent = fs.readFileSync('packages/cli/src/index.ts', 'utf-8')
assert(cliContent.includes("command('customer create')"), 'CLI has customer create')
assert(cliContent.includes("command('customer list')"), 'CLI has customer list')
assert(cliContent.includes("command('customer key create')"), 'CLI has customer key create')
assert(cliContent.includes("command('usage summary')"), 'CLI has usage summary')
assert(cliContent.includes("command('file upload')"), 'CLI has file upload')
assert(cliContent.includes("command('file list')"), 'CLI has file list')
assert(cliContent.includes("command('asset list')"), 'CLI has asset list')

// Test 11: CLI safety
console.log('\n11. CLI Safety')
assert(cliContent.includes('Store this key securely'), 'CLI warns about key storage')
assert(cliContent.includes('sk_lane_customer_'), 'CLI uses correct key prefix')

// Test 12: Versions
console.log('\n12. Versions')
const corePkg = JSON.parse(fs.readFileSync('packages/core/package.json', 'utf-8'))
assert(corePkg.version === '0.4.0', 'Core is 0.4.0')
const sdkPkg = JSON.parse(fs.readFileSync('packages/sdk/package.json', 'utf-8'))
assert(sdkPkg.version === '0.4.0', 'SDK is 0.4.0')
const cliPkg = JSON.parse(fs.readFileSync('packages/cli/package.json', 'utf-8'))
assert(cliPkg.version === '0.4.0', 'CLI is 0.4.0')

// Test 13: No raw API keys stored
console.log('\n13. No Raw Secrets')
assert(apiKeysContent.includes('keyHash'), 'Stores hash')
assert(!apiKeysContent.includes('console.log(rawKey)'), 'Does not log raw key')
assert(!apiKeysContent.includes('storeKey'), 'Does not store raw key')

// Test 14: Files private by default
console.log('\n14. File Privacy')
assert(fileRoutes.includes("'private'") || fileRoutes.includes('private'), 'Files default to private')

// Test 15: No fake claims
console.log('\n15. No Fake Claims')
let noFake = true
const fakeTerms = ['full supabase replacement', 'managed cloud storage', 'CDN hosting']
for (const file of ['README.md', 'docs/API.md']) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8').toLowerCase()
    for (const term of fakeTerms) {
      if (content.includes(term)) { noFake = false; console.log(`  ✗ "${term}" in ${file}`); }
    }
  }
}
assert(noFake, 'No fake claims')

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
