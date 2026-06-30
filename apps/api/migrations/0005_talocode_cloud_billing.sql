DO $$ BEGIN
    CREATE TYPE cloud_api_key_mode AS ENUM ('dev', 'live');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cloud_api_key_status AS ENUM ('active', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cloud_wallet_transaction_type AS ENUM ('grant', 'topup', 'usage', 'refund', 'adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cloud_usage_status AS ENUM ('success', 'failed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cloud_topup_status AS ENUM ('pending', 'succeeded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS cloud_projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cloud_projects_owner_id_idx ON cloud_projects(owner_id);

CREATE TABLE IF NOT EXISTS cloud_api_keys (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    mode cloud_api_key_mode NOT NULL DEFAULT 'dev',
    status cloud_api_key_status NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cloud_api_keys_project_id_idx ON cloud_api_keys(project_id);
CREATE INDEX IF NOT EXISTS cloud_api_keys_key_hash_idx ON cloud_api_keys(key_hash);

CREATE TABLE IF NOT EXISTS cloud_wallets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE REFERENCES cloud_projects(id) ON DELETE CASCADE,
    balance_credits INTEGER NOT NULL DEFAULT 0,
    free_credits_granted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cloud_wallets_balance_check CHECK (balance_credits >= 0)
);

CREATE TABLE IF NOT EXISTS cloud_wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL REFERENCES cloud_wallets(id) ON DELETE CASCADE,
    type cloud_wallet_transaction_type NOT NULL,
    credits_delta INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cloud_wallet_transactions_wallet_id_idx ON cloud_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS cloud_wallet_transactions_created_at_idx ON cloud_wallet_transactions(created_at);

CREATE TABLE IF NOT EXISTS cloud_usage_events (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
    api_key_id TEXT REFERENCES cloud_api_keys(id) ON DELETE SET NULL,
    product TEXT NOT NULL,
    action TEXT NOT NULL,
    credits INTEGER NOT NULL,
    status cloud_usage_status NOT NULL DEFAULT 'success',
    request_id TEXT,
    idempotency_key TEXT UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cloud_usage_events_project_id_idx ON cloud_usage_events(project_id);
CREATE INDEX IF NOT EXISTS cloud_usage_events_idempotency_key_idx ON cloud_usage_events(idempotency_key);
CREATE INDEX IF NOT EXISTS cloud_usage_events_product_action_idx ON cloud_usage_events(product, action);
CREATE INDEX IF NOT EXISTS cloud_usage_events_created_at_idx ON cloud_usage_events(created_at);

CREATE TABLE IF NOT EXISTS cloud_topups (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'manual',
    provider_reference TEXT,
    amount_usd INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    status cloud_topup_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cloud_topups_project_id_idx ON cloud_topups(project_id);
CREATE INDEX IF NOT EXISTS cloud_topups_provider_reference_idx ON cloud_topups(provider_reference);
