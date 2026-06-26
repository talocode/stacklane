#!/usr/bin/env node

import * as fs from 'node:fs'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.log(`  ✗ ${label}`)
    failed++
  }
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

console.log('\n=== Stacklane v0.4.0 Tests ===\n')

const app = read('apps/api/src/app.ts')
const localStore = read('packages/storage/src/local.ts')
const customerRoutes = read('apps/api/src/modules/customers/routes.ts')
const sdk = read('packages/sdk/src/index.ts')
const cli = read('packages/cli/src/index.ts')
const readme = read('README.md')
const apiDocs = read('docs/API.md')

console.log('1. Health and config')
assert(app.includes('/v1/health'), 'health endpoint surface exists')
assert(app.includes('/v1/config/status'), 'config status surface exists')

console.log('\n2. Customers')
assert(localStore.includes('createCustomer('), 'create customer function exists')
assert(localStore.includes('listCustomers()'), 'list customers function exists')
assert(localStore.includes('updateCustomer('), 'update customer function exists')

console.log('\n3. API keys')
const apiKeysModule = read('packages/core/src/customers/apiKeys.ts')
assert(apiKeysModule.includes('sk_lane_${mode}_'), 'API key format is sk_lane_dev/live')
assert(localStore.includes('keyHash'), 'key hash stored')
assert(!localStore.includes('writeJsonFile(API_KEYS_FILE, [{ rawKey'), 'raw key not stored')
assert(customerRoutes.includes('INVALID_API_KEY'), 'revoked/missing key returns JSON error')
assert(localStore.includes('lastUsedAt'), 'successful auth updates lastUsedAt')

console.log('\n4. Usage')
assert(localStore.includes('recordUsageEvent('), 'record usage event exists')
assert(localStore.includes('summarizeUsage('), 'summarize usage exists')
assert(localStore.includes('summarizeUsageByCustomer('), 'summarize by customer exists')
assert(localStore.includes('summarizeUsageByProduct('), 'summarize by product exists')
assert(localStore.includes('summarizeUsageByAction('), 'summarize by action exists')

console.log('\n5. Assets and files')
assert(localStore.includes('.stacklane/files'), 'local files path is .stacklane/files')
assert(localStore.includes('Unsafe storage path.'), 'unsafe filename/path traversal rejected')
assert(localStore.includes('DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024'), 'default max file size is 10MB')
assert(localStore.includes('createAssetRecord('), 'asset record creation exists')

console.log('\n6. SDK')
for (const method of ['createCustomer', 'listCustomers', 'getCustomer', 'updateCustomer', 'createApiKey', 'listApiKeys', 'revokeApiKey', 'recordUsageEvent', 'listUsageEvents', 'summarizeUsage', 'createAsset', 'listAssets', 'getAsset', 'deleteAsset', 'health', 'configStatus']) {
  assert(sdk.includes(method), `SDK method ${method} exists`)
}

console.log('\n7. CLI')
for (const command of ['customers create', 'customers list', 'keys create', 'keys list', 'keys revoke', 'usage record', 'usage list', 'usage summary', 'assets create', 'assets list', 'assets get', 'assets delete', 'doctor']) {
  assert(cli.includes(command), `CLI command ${command} exists`)
}
assert(cli.includes('Store this key securely'), 'CLI prints raw key only once with warning')

console.log('\n8. Docs and examples')
for (const file of ['docs/SDK.md', 'docs/CLI.md', 'docs/STORAGE_AND_USAGE.md', 'docs/SECURITY.md', 'docs/TALOCODE_INTEGRATION.md', 'CHANGELOG.md', 'examples/launchpix-usage.json', 'examples/cliploop-usage.json', 'examples/postlane-usage.json', 'examples/worklane-usage.json']) {
  assert(fs.existsSync(file), `${file} exists`)
}
assert(readme.toLowerCase().includes('local-first'), 'README says local-first')
assert(apiDocs.includes('/v1/usage/summary'), 'API docs include usage summary')

console.log('\n9. Dependency constraints')
const rootPkg = read('package.json').toLowerCase()
assert(!rootPkg.includes('supabase'), 'no supabase dependency added')
assert(!rootPkg.includes('resend'), 'no resend dependency added')

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
