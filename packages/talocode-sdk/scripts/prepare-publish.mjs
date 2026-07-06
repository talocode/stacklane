import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const root = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(root, '..')
const sdkRoot = join(pkgRoot, '..', 'sdk')
const sdkDist = join(sdkRoot, 'dist')
const outDist = join(pkgRoot, 'dist')

execSync('npm run build', { cwd: sdkRoot, stdio: 'inherit' })
execSync('npm run test', { cwd: sdkRoot, stdio: 'inherit' })

if (!existsSync(sdkDist)) {
  throw new Error('SDK build output missing at packages/sdk/dist')
}

rmSync(outDist, { recursive: true, force: true })
mkdirSync(outDist, { recursive: true })

const skip = new Set(['__tests__'])

for (const name of readdirSync(sdkDist)) {
  if (skip.has(name)) continue
  const src = join(sdkDist, name)
  const dest = join(outDist, name)
  if (statSync(src).isDirectory()) continue
  cpSync(src, dest)
}

console.log('Prepared @talocode/sdk dist from packages/sdk')

const smokeRoot = join(tmpdir(), `talocode-sdk-smoke-${process.pid}`)
rmSync(smokeRoot, { recursive: true, force: true })
mkdirSync(smokeRoot, { recursive: true })

const tarball = execSync('npm pack --silent', { cwd: pkgRoot, encoding: 'utf8' }).trim()
const tarballPath = join(pkgRoot, tarball)
execSync(`npm init -y`, { cwd: smokeRoot, stdio: 'ignore' })
execSync(`npm install "${tarballPath}"`, { cwd: smokeRoot, stdio: 'inherit' })

const smokeScript = join(smokeRoot, 'smoke.mjs')
writeFileSync(smokeScript, `
import { Talocode, ReplyLaneClient } from '@talocode/sdk'

if (typeof Talocode !== 'function') throw new Error('Talocode export missing')
if (typeof ReplyLaneClient !== 'function') throw new Error('ReplyLaneClient export missing')

const client = new Talocode({ apiKey: 'tk_test_smoke' })
if (typeof client.replylane !== 'object') throw new Error('Talocode.replylane namespace missing')

console.log('SDK publish smoke test passed')
`)

try {
  execSync(`node ${smokeScript}`, { cwd: smokeRoot, stdio: 'inherit' })
} finally {
  unlinkSync(tarballPath)
  rmSync(smokeRoot, { recursive: true, force: true })
}