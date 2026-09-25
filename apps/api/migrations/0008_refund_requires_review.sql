-- Forward-only: retain a durable liability record when a verified refund
-- cannot be applied without overdrawing the customer's wallet.
CREATE TABLE IF NOT EXISTS stacklane.refund_requires_review (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES stacklane.billing_purchases(id) ON DELETE RESTRICT,
    payment_event_id TEXT NOT NULL UNIQUE REFERENCES stacklane.payment_events(id) ON DELETE RESTRICT,
    provider_order_id TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    requested_credits INTEGER NOT NULL CHECK (requested_credits > 0),
    already_reversed_credits INTEGER NOT NULL CHECK (already_reversed_credits >= 0),
    outstanding_credits INTEGER NOT NULL CHECK (outstanding_credits > 0),
    available_balance_credits INTEGER NOT NULL CHECK (available_balance_credits >= 0),
    reason TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'resolved')),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (outstanding_credits = requested_credits - already_reversed_credits)
);

CREATE INDEX IF NOT EXISTS refund_requires_review_purchase_idx
    ON stacklane.refund_requires_review(purchase_id, review_status, received_at);

ALTER TABLE stacklane.refund_requires_review ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stacklane.refund_requires_review FROM PUBLIC;
