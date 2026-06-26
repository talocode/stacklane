#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed += 1
  } else {
    console.log(`  ✗ ${label}`)
    failed += 1
  }
}

function trackedFiles() {
  return execSync('git ls-files', { cwd: root, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function trackedCompiledArtifacts() {
  return files.filter((file) => /\/src\/.*\.(js|js\.map|d\.ts)$/.test(file))
    .filter((file) => !file.endsWith('apps/api/src/types.d.ts'))
    .filter((file) => !file.endsWith('apps/api/src/fastify.d.ts'))
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function exists(file) {
  return fs.existsSync(path.join(root, file))
}

function walk(dir, predicate) {
  const results = []
  if (!exists(dir)) return results
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walk(rel, predicate))
    else if (predicate(rel)) results.push(rel)
  }
  return results
}

console.log('\n=== Stacklane Workspace Lint ===\n')

const files = trackedFiles()

console.log('1. No committed .env files')
assert(!files.some((file) => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example')), 'No tracked .env files')

console.log('\n2. No compiled artifacts in src trees')
const compiled = trackedCompiledArtifacts()
assert(compiled.length === 0, 'No compiled JS or d.ts artifacts inside src/')

console.log('\n3. No forbidden dependencies')
const rootPackage = read('package.json').toLowerCase()
assert(!rootPackage.includes('supabase'), 'No Supabase dependency added')
assert(!rootPackage.includes('resend'), 'No Resend dependency added')

console.log('\n4. No tracked raw secret fixtures')
const rawKeyPattern = /sk_lane_(dev|live)_[A-Za-z0-9_-]{20,}/
const suspiciousTracked = files.filter((file) => {
  if (file.includes('node_modules/')) return false
  if (!/\.(json|md|ts|tsx|mjs|js|txt|d\.ts)$/.test(file)) return false
  return rawKeyPattern.test(read(file))
}).filter((file) => !file.endsWith('README.md') && !file.endsWith('API.md'))
assert(suspiciousTracked.length === 0, 'No tracked raw API keys in repo files')

console.log('\n5. No unsafe console logging')
const sourceFiles = files.filter((file) => /\.(ts|tsx|js|mjs)$/.test(file) && !file.includes('node_modules/'))
const unsafeConsole = sourceFiles.filter((file) => {
  const content = read(file)
  return /console\.log\([^\n]*(keyHash|secretRef|console\.log\(config\.databasePassword|console\.log\(config\.accessToken)/.test(content)
}).filter((file) => !file.endsWith('scripts/test-stacklane-v020.mjs'))
assert(unsafeConsole.length === 0, 'No console.log calls printing secret-like values')

console.log('\n6. Storage safety checks exist')
const storageSource = read('packages/storage/src/local.ts')
assert(storageSource.includes('Unsafe storage path.'), 'Path traversal rejection exists')
assert(storageSource.includes('DEFAULT_MAX_FILE_SIZE_BYTES'), 'Max file size guard exists')

console.log('\n7. Required scripts exist')
const pkg = JSON.parse(read('package.json'))
assert(Boolean(pkg.scripts?.build), 'Root build script exists')
assert(Boolean(pkg.scripts?.typecheck), 'Root typecheck script exists')
assert(Boolean(pkg.scripts?.lint), 'Root lint script exists')
assert(Boolean(pkg.scripts?.['test:v041']), 'Root runtime test script exists')

console.log('\n8. Required docs and examples exist')
for (const file of [
  'docs/API.md',
  'docs/SDK.md',
  'docs/CLI.md',
  'docs/STORAGE_AND_USAGE.md',
  'docs/SECURITY.md',
  'docs/TALOCODE_INTEGRATION.md',
  'CHANGELOG.md',
  'examples/launchpix-usage.json',
  'examples/cliploop-usage.json',
  'examples/postlane-usage.json',
  'examples/worklane-usage.json'
]) {
  assert(exists(file), `${file} exists`)
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
