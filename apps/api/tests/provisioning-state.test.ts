import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRetryDelayMs, canTransition, nextRetryAt } from '../src/services/provisioning/state-machine'

test('transition graph enforces legal provisioning transitions', () => {
  assert.equal(canTransition('queued', 'running'), true)
  assert.equal(canTransition('running', 'ready'), true)
  assert.equal(canTransition('failed', 'retrying'), true)
  assert.equal(canTransition('ready', 'failed'), false)
})

test('retry delay backoff grows by attempt', () => {
  assert.equal(calculateRetryDelayMs(1), 5000)
  assert.equal(calculateRetryDelayMs(2), 15000)
  assert.equal(calculateRetryDelayMs(3), 45000)
})

test('nextRetryAt returns a future timestamp', () => {
  const now = Date.now()
  const next = new Date(nextRetryAt(1)).getTime()
  assert.ok(next > now)
})
