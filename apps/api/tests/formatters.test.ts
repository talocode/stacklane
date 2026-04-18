import test from 'node:test'
import assert from 'node:assert/strict'
import { toProvisioningTaskResponse } from '../src/services/formatters'

test('provisioning task formatter exposes scheduling and lease metadata', () => {
  const output = toProvisioningTaskResponse(
    {
      id: 'task_1',
      project_id: 'prj_1',
      environment_id: null,
      region_id: 'region_1',
      status: 'retrying',
      source: 'user_request',
      requested_by_user_id: 'usr_1',
      current_attempt: 1,
      max_attempts: 3,
      last_error: 'timeout',
      diagnostics: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      started_at: null,
      completed_at: null,
      next_run_at: '2026-01-01T00:00:05.000Z',
      claimed_by: 'worker-a',
      claimed_at: '2026-01-01T00:00:01.000Z',
      claim_expires_at: '2026-01-01T00:00:31.000Z',
      last_heartbeat_at: '2026-01-01T00:00:02.000Z',
      last_transition_at: '2026-01-01T00:00:02.000Z'
    },
    null
  )

  assert.equal(output.status, 'retrying')
  assert.equal(output.nextRunAt, '2026-01-01T00:00:05.000Z')
  assert.equal(output.claimedBy, 'worker-a')
})
