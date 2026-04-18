CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'provisioning',
  region TEXT NOT NULL DEFAULT 'af-west-1',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_environments_project_id ON environments(project_id);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'project',
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);

CREATE TABLE IF NOT EXISTS billing_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'NGN',
  billing_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_id ON audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_project_id ON audit_events(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
