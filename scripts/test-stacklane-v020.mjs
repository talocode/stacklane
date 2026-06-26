#!/usr/bin/env node

/**
 * Stacklane v0.2.0 tests.
 * Run: node scripts/test-stacklane-v020.mjs
 */

import * as fs from 'fs'
import * as path from 'path'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label}`); failed++; }
}

console.log('\n=== Stacklane v0.2.0 Tests ===\n')

// Test 1: CLI exists
console.log('1. CLI')
assert(fs.existsSync('packages/cli/src/index.ts'), 'CLI source exists')
assert(fs.existsSync('packages/cli/package.json'), 'CLI package.json exists')
const cliPkg = JSON.parse(fs.readFileSync('packages/cli/package.json', 'utf-8'))
assert(cliPkg.bin?.stacklane, 'CLI has bin entry')
assert(cliPkg.dependencies?.commander, 'CLI depends on commander')

const cliContent = fs.readFileSync('packages/cli/src/index.ts', 'utf-8')
assert(cliContent.includes('stacklane init'), 'CLI has init command')
assert(cliContent.includes('project create'), 'CLI has project create')
assert(cliContent.includes('token create'), 'CLI has token create')
assert(cliContent.includes('token verify'), 'CLI has token verify')
assert(cliContent.includes('db set'), 'CLI has db set')
assert(cliContent.includes('db show'), 'CLI has db show')
assert(cliContent.includes('env generate'), 'CLI has env generate')
assert(cliContent.includes('backup'), 'CLI has backup')
assert(cliContent.includes('audit'), 'CLI has audit')

// Test 2: CLI safety
console.log('\n2. CLI Safety')
assert(cliContent.includes('.stacklane'), 'CLI uses .stacklane directory')
assert(cliContent.includes('(redacted)'), 'Backup redacts sensitive values')
assert(cliContent.includes('safe'), 'Env generate has safe mode')
assert(!cliContent.includes('console.log(config.databasePassword)'), 'Does not print full password')
assert(!cliContent.includes('console.log(config.accessToken)'), 'Does not print full token after creation')

// Test 3: SDK exists
console.log('\n3. SDK')
assert(fs.existsSync('packages/sdk/src/index.ts'), 'SDK source exists')
assert(fs.existsSync('packages/sdk/package.json'), 'SDK package.json exists')

const sdkContent = fs.readFileSync('packages/sdk/src/index.ts', 'utf-8')
assert(sdkContent.includes('createStacklaneClient'), 'SDK has createStacklaneClient')
assert(sdkContent.includes('async health'), 'SDK has health method')
assert(sdkContent.includes('async create(data:'), 'SDK has project create')
assert(sdkContent.includes('async list()'), 'SDK has project list')
assert(sdkContent.includes('async set(projectId'), 'SDK has database set')
assert(sdkContent.includes('async create(projectId'), 'SDK has token create')
assert(sdkContent.includes('async verify(token'), 'SDK has token verify')
assert(sdkContent.includes('async list(projectId'), 'SDK has audit list')

// Test 4: SDK safety
console.log('\n4. SDK Safety')
assert(sdkContent.includes('Authorization'), 'SDK uses auth header')
assert(sdkContent.includes('Bearer'), 'SDK uses Bearer token')
assert(!sdkContent.includes('console.log(accessToken)'), 'SDK does not print token')

// Test 5: Docs exist
console.log('\n5. Documentation')
assert(fs.existsSync('docs/API.md'), 'API docs exist')
assert(fs.existsSync('README.md'), 'README exists')

const readme = fs.readFileSync('README.md', 'utf-8')
assert(readme.includes('Stacklane'), 'README mentions Stacklane')
assert(readme.includes('v0.1.0'), 'README mentions v0.1.0')
assert(readme.includes('v0.2.0'), 'README mentions v0.2.0')
assert(readme.includes('MIT'), 'README has license')

const apiDocs = fs.readFileSync('docs/API.md', 'utf-8')
assert(apiDocs.includes('/health'), 'API docs have health endpoint')
assert(apiDocs.includes('/v1/projects') || apiDocs.includes('/v1/projects/:id/tokens'), 'API docs have projects endpoint')
assert(apiDocs.includes('/v1/tokens/verify'), 'API docs have token verify')
assert(apiDocs.includes('Bearer'), 'API docs show auth pattern')

// Test 6: Examples exist
console.log('\n6. Examples')
assert(fs.existsSync('examples/basic-node'), 'Basic node example dir exists')

// Test 7: No Supabase copy
console.log('\n7. No Supabase Copy')
let noSupabaseCopy = true
const supabaseTerms = ['drop-in supabase replacement', 'supabase alternative', 'like supabase']
for (const file of ['README.md', 'docs/API.md']) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8').toLowerCase()
    for (const term of supabaseTerms) {
      if (content.includes(term)) {
        noSupabaseCopy = false
        console.log(`  ✗ Found "${term}" in ${file}`)
      }
    }
  }
}
assert(noSupabaseCopy, 'No Supabase replacement claims')

// Test 8: Package versions
console.log('\n8. Package Versions')
const corePkg = JSON.parse(fs.readFileSync('packages/core/package.json', 'utf-8'))
assert(corePkg.version === '0.4.1', 'Core version is 0.4.1')

const sdkPkg = JSON.parse(fs.readFileSync('packages/sdk/package.json', 'utf-8'))
assert(sdkPkg.version === '0.4.1', 'SDK version is 0.4.1')

assert(cliPkg.version === '0.4.1', 'CLI version is 0.4.1')

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
