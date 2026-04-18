CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  market_scope TEXT NOT NULL,
  deployment_target TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provisioning_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_id TEXT REFERENCES environments(id) ON DELETE SET NULL,
  region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  current_attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_provisioning_tasks_project_id ON provisioning_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_tasks_status ON provisioning_tasks(status);

CREATE TABLE IF NOT EXISTS provisioning_attempts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES provisioning_tasks(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL,
  status TEXT NOT NULL,
  runtime_adapter TEXT NOT NULL,
  step TEXT,
  error_message TEXT,
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (task_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS idx_provisioning_attempts_task_id ON provisioning_attempts(task_id);

CREATE TABLE IF NOT EXISTS project_runtime_bindings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
  database_ref TEXT,
  storage_ref TEXT,
  auth_namespace_ref TEXT,
  functions_namespace_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_runtime_bindings_region_id ON project_runtime_bindings(region_id);
