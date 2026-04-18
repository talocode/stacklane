import test from 'node:test'
import assert from 'node:assert/strict'
import { can, projectCapabilities } from '../src/policy'

test('owner/admin can mutate protected actions', () => {
  assert.equal(can('owner', 'provisioning:request'), true)
  assert.equal(can('admin', 'apikey:create'), true)
  assert.equal(can('member', 'environment:update'), false)
})

test('capability flags map by role', () => {
  assert.equal(projectCapabilities('owner').canManageProvisioning, true)
  assert.equal(projectCapabilities('admin').canManageApiKeys, true)
  assert.equal(projectCapabilities('member').canManageEnvironments, false)
})
