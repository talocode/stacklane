import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

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