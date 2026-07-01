#!/usr/bin/env bash
set -euo pipefail

# ─── stripe-cli-dev.sh ─────────────────────────────────────────────────────
# Start Stripe CLI webhook forwarding to local Stacklane API.
# Never writes secrets to git-tracked files without explicit confirmation.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_LOCAL="$PROJECT_ROOT/apps/api/.env.local"
FORWARD_URL="localhost:4000/api/v1/cloud/billing/stripe/webhook"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[info]${NC} $1"; }
ok()    { echo -e "${GREEN}[ok]${NC}   $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
err()   { echo -e "${RED}[err]${NC}  $1"; }

# ─── Check stripe CLI ──────────────────────────────────────────────────────

if ! command -v stripe &>/dev/null; then
  err "Stripe CLI not found."
  echo ""
  echo "  Install: https://stripe.com/docs/stripe-cli"
  echo ""
  echo "  macOS: brew install stripe/stripe-cli/stripe"
  echo "  Linux: see https://packages.stripe.com/stripe-cli/"
  exit 1
fi

ok "Stripe CLI found: $(stripe version 2>&1 | head -1)"

# ─── Check if logged in ────────────────────────────────────────────────────

if ! stripe config --list 2>/dev/null | grep -q 'device_id'; then
  warn "Not logged in to Stripe. Run 'stripe login' first."
  echo ""
  echo "  stripe login"
  echo ""
  exit 1
fi

ok "Logged in to Stripe"

# ─── Check .env.local for existing secrets ─────────────────────────────────

EXISTING_KEYS=()
if [[ -f "$ENV_LOCAL" ]]; then
  while IFS='=' read -r key value; do
    case "$key" in
      STRIPE_SECRET_KEY|STRIPE_PUBLISHABLE_KEY|STRIPE_WEBHOOK_SECRET)
        EXISTING_KEYS+=("$key is set ($(echo "$value" | cut -c1-8)...)")
        ;;
    esac
  done < "$ENV_LOCAL"
fi

if [[ ${#EXISTING_KEYS[@]} -gt 0 ]]; then
  warn "Existing Stripe secrets found in $ENV_LOCAL:"
  for entry in "${EXISTING_KEYS[@]}"; do
    echo "       $entry"
  done
  echo ""
fi

# ─── Print safe instructions ──────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
info "Starting Stripe webhook forwarding..."
echo ""
echo "  stripe listen --forward-to $FORWARD_URL"
echo ""
echo "After running this command, Stripe CLI will print:"
echo ""
echo "  > Ready! Your webhook signing secret is whsec_..."
echo ""
echo "Copy that whsec_ secret and add it to your .env.local file:"
echo ""
echo "  STRIPE_WEBHOOK_SECRET=whsec_<paste>"
echo ""
echo "Then restart the API with:"
echo ""
echo "  pnpm --filter @stacklane/api dev"
echo ""
echo "The API must have STRIPE_WEBHOOK_SECRET set to verify webhooks."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Confirm before writing to .env.local ─────────────────────────────────

WRITE_SECRET=""
if [[ -t 0 ]]; then
  echo -n "Automatically write the webhook secret to .env.local when it appears? (y/N) "
  read -r CONFIRM
  if [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]]; then
    WRITE_SECRET="yes"
  fi
fi

if [[ "$WRITE_SECRET" == "yes" ]]; then
  info "Will capture webhook secret and write to $ENV_LOCAL"
  info "Press Ctrl+C to quit."
  echo ""

  # Start stripe listen and capture the signing secret
  stripe listen --forward-to "$FORWARD_URL" 2>&1 | while IFS= read -r line; do
    echo "$line"
    if [[ "$line" =~ Your\ webhook\ signing\ secret\ is\ (whsec_[a-zA-Z0-9_]+) ]]; then
      SECRET="${BASH_REMATCH[1]}"
      if [[ ! -f "$ENV_LOCAL" ]]; then
        touch "$ENV_LOCAL"
      fi
      # Remove any existing STRIPE_WEBHOOK_SECRET line
      if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' '/^STRIPE_WEBHOOK_SECRET=/d' "$ENV_LOCAL"
      else
        sed -i '/^STRIPE_WEBHOOK_SECRET=/d' "$ENV_LOCAL"
      fi
      echo "STRIPE_WEBHOOK_SECRET=$SECRET" >> "$ENV_LOCAL"
      ok "Written STRIPE_WEBHOOK_SECRET to $ENV_LOCAL"
    fi
  done
else
  info "Running stripe listen. Copy the whsec_ secret manually."
  info "Press Ctrl+C to quit."
  echo ""
  stripe listen --forward-to "$FORWARD_URL"
fi
