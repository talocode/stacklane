-- Forward-only: cloud_topups remains available for historical reads, but new
-- checkout and webhook flows use the isolated tables below.
CREATE TABLE IF NOT EXISTS stacklane.billing_purchases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES stacklane.cloud_projects(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL CHECK (provider = 'lemonsqueezy'),
    pack_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
    checkout_id TEXT UNIQUE,
    provider_order_id TEXT UNIQUE,
    refunded_credits INTEGER NOT NULL DEFAULT 0 CHECK (refunded_credits >= 0 AND refunded_credits <= credits),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_purchases_project_created_idx
    ON stacklane.billing_purchases(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_purchases_pending_idx
    ON stacklane.billing_purchases(status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS stacklane.payment_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider = 'lemonsqueezy'),
    provider_event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    purchase_id TEXT REFERENCES stacklane.billing_purchases(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'failed')),
    claimed_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS payment_events_purchase_idx ON stacklane.payment_events(purchase_id);
CREATE INDEX IF NOT EXISTS payment_events_status_idx ON stacklane.payment_events(status) WHERE status IN ('received', 'failed');

CREATE TABLE IF NOT EXISTS stacklane.credit_ledger (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES stacklane.billing_purchases(id) ON DELETE RESTRICT,
    payment_event_id TEXT NOT NULL UNIQUE REFERENCES stacklane.payment_events(id) ON DELETE RESTRICT,
    wallet_id TEXT NOT NULL REFERENCES stacklane.cloud_wallets(id) ON DELETE RESTRICT,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('purchase_credit', 'refund_debit')),
    credits_delta INTEGER NOT NULL CHECK (credits_delta <> 0),
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    provider_order_id TEXT NOT NULL,
    refund_amount_cents INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (purchase_id, entry_type, payment_event_id)
);

CREATE INDEX IF NOT EXISTS credit_ledger_purchase_idx ON stacklane.credit_ledger(purchase_id, created_at);
CREATE INDEX IF NOT EXISTS credit_ledger_wallet_idx ON stacklane.credit_ledger(wallet_id, created_at);

CREATE OR REPLACE FUNCTION stacklane.reject_credit_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'credit_ledger entries are immutable';
END;
$$;

DROP TRIGGER IF EXISTS credit_ledger_immutable ON stacklane.credit_ledger;
CREATE TRIGGER credit_ledger_immutable
BEFORE UPDATE OR DELETE ON stacklane.credit_ledger
FOR EACH ROW EXECUTE FUNCTION stacklane.reject_credit_ledger_mutation();

ALTER TABLE stacklane.billing_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stacklane.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stacklane.credit_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stacklane.billing_purchases, stacklane.payment_events, stacklane.credit_ledger FROM PUBLIC;
REVOKE ALL ON FUNCTION stacklane.reject_credit_ledger_mutation() FROM PUBLIC;
