ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS control_plane_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_control_plane_sessions_user_id ON control_plane_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_control_plane_sessions_expires_at ON control_plane_sessions(expires_at);

ALTER TABLE environments
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'af-west-1',
  ADD COLUMN IF NOT EXISTS deployment_target TEXT NOT NULL DEFAULT 'primary';

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_active_by_project
  ON api_keys(project_id, status)
  WHERE revoked_at IS NULL;
