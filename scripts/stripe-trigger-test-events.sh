#!/usr/bin/env bash
set -euo pipefail

# ─── stripe-trigger-test-events.sh ─────────────────────────────────────────
# Trigger webhook events handled by the Talocode Cloud billing system.
# Only triggers events actually handled by the API (checkout.session.completed).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC} $1"; }
ok()    { echo -e "${GREEN}[ok]${NC}   $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
err()   { echo -e "${RED}[err]${NC}  $1"; }

# ─── Check stripe CLI ──────────────────────────────────────────────────────

if ! command -v stripe &>/dev/null; then
  err "Stripe CLI not found. Install: https://stripe.com/docs/stripe-cli"
  exit 1
fi

ok "Stripe CLI found: $(stripe version 2>&1 | head -1)"

# ─── Events handled by the API ─────────────────────────────────────────────
# Source: apps/api/src/server.ts (webhook handler at line 562)
# Only checkout.session.completed is handled.
# All other events (charge.succeeded, payment_intent.succeeded, etc.) are
# silently ignored.

HANDLED_EVENTS=(
  "checkout.session.completed"
)

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
info "Talocode Cloud Billing — Trigger Test Webhook Events"
echo ""
info "Webhook route: POST /api/v1/cloud/billing/stripe/webhook"
info "Events handled: checkout.session.completed"
info "Events ignored: charge.succeeded, payment_intent.succeeded, customer.created, invoice.paid"
echo ""

# ─── Confirm with user ────────────────────────────────────────────────────

echo "The following events will be triggered:"
for event in "${HANDLED_EVENTS[@]}"; do
  echo "  - $event"
done
echo ""
echo "Make sure stripe listen is running in another terminal:"
echo ""
echo "  stripe listen --forward-to localhost:4000/api/v1/cloud/billing/stripe/webhook"
echo ""

if [[ -t 0 ]]; then
  echo -n "Proceed? (y/N) "
  read -r CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    info "Cancelled."
    exit 0
  fi
fi

echo ""

# ─── Trigger handled events ────────────────────────────────────────────────

for event in "${HANDLED_EVENTS[@]}"; do
  echo ""
  info "Triggering: $event"
  echo ""

  if stripe trigger "$event" 2>&1; then
    ok "$event triggered successfully"
  else
    warn "$event failed (may need stripe listen running)"
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
ok "All handled events triggered."
echo ""
info "Check the API logs to confirm webhook processing:"
echo ""
echo "  Look for: [webhook] checkout.session.completed — crediting wallet"
echo "  Look for: Topup succeeded / Wallet credited"
echo ""
info "Verify wallet balance:"
echo ""
echo "  curl http://localhost:4000/api/v1/cloud/projects/{projectId}/wallet \\"
echo "    -H \"Cookie: sl_session=...\""
echo ""
