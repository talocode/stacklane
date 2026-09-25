CREATE TABLE IF NOT EXISTS cloud_payment_webhook_events (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    topup_id TEXT REFERENCES cloud_topups(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    outcome TEXT NOT NULL,
    PRIMARY KEY (provider, event_id)
);

CREATE INDEX IF NOT EXISTS cloud_payment_webhook_events_topup_id_idx
    ON cloud_payment_webhook_events(topup_id);
