export type UserRecord = {
  id: string
  email: string
  name: string
  status: string
  password_hash: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type OrganizationRecord = {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
  updated_at: string
}

export type OrganizationMembershipRecord = {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  status: string
}

export type RegionRecord = {
  id: string
  code: string
  name: string
  market_scope: string
  deployment_target: string
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ProjectRecord = {
  id: string
  organization_id: string
  name: string
  slug: string
  status: 'provisioning' | 'ready' | 'paused' | 'error'
  region: string
  description: string
  created_at: string
  updated_at: string
}

export type EnvironmentRecord = {
  id: string
  project_id: string
  name: string
  slug: string
  status: string
  region: string
  deployment_target: string
  created_at: string
  updated_at: string
}

export type ApiKeyRecord = {
  id: string
  project_id: string | null
  organization_id: string | null
  name: string
  key_prefix: string
  key_hash: string
  scope: string
  status: string
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export type SessionRecord = {
  id: string
  user_id: string
  session_hash: string
  expires_at: string
  revoked_at: string | null
  created_at: string
  last_seen_at: string
}

export type ProvisioningTaskRecord = {
  id: string
  project_id: string
  environment_id: string | null
  region_id: string | null
  status: 'requested' | 'queued' | 'running' | 'ready' | 'failed' | 'retrying'
  source: string
  requested_by_user_id: string | null
  current_attempt: number
  max_attempts: number
  last_error: string | null
  diagnostics: Record<string, unknown>
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  next_run_at: string
  claimed_by: string | null
  claimed_at: string | null
  claim_expires_at: string | null
  last_heartbeat_at: string | null
  last_transition_at: string
}

export type ProvisioningAttemptRecord = {
  id: string
  task_id: string
  attempt_no: number
  status: string
  runtime_adapter: string
  step: string | null
  error_message: string | null
  diagnostics: Record<string, unknown>
  created_at: string
  started_at: string | null
  completed_at: string | null
  next_run_at: string
  claimed_by: string | null
  claimed_at: string | null
  claim_expires_at: string | null
  last_heartbeat_at: string | null
  last_transition_at: string
}

export type ProjectRuntimeBindingRecord = {
  id: string
  project_id: string
  region_id: string | null
  database_ref: string | null
  storage_ref: string | null
  auth_namespace_ref: string | null
  functions_namespace_ref: string | null
  status: string
  diagnostics: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type AuditEventRecord = {
  id: string
  organization_id: string | null
  project_id: string | null
  actor_user_id: string | null
  action: string
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}
