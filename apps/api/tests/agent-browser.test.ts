import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePublicUrl } from '../src/services/agent-browser.ts'

test('validatePublicUrl rejects localhost by default', () => {
  assert.throws(() => validatePublicUrl('http://localhost:3000'), /private IPs or localhost/)
})

test('validatePublicUrl rejects private ipv4 ranges', () => {
  assert.throws(() => validatePublicUrl('http://192.168.1.10'), /private IPs or localhost/)
})

test('validatePublicUrl rejects unsupported protocols', () => {
  assert.throws(() => validatePublicUrl('file:///etc/passwd'), /Only http and https/)
})

test('validatePublicUrl accepts public https urls', () => {
  const parsed = validatePublicUrl('https://example.com/path')
  assert.equal(parsed.hostname, 'example.com')
  assert.equal(parsed.pathname, '/path')
})