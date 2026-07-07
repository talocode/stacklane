# Netlify Deployment Guide — Talocode API (Stacklane)

Primary deployment target for **https://api.talocode.site**.

## Service Overview

| Property | Value |
|----------|-------|
| Site name | `talocode-cloud-api` |
| Domain | `api.talocode.site` |
| Repo | `github.com/talocode/Stacklane` |
| Functions | `netlify/functions/api.mjs` (catch-all) |
| Health check | `GET /api/v1/cloud/health` |

## Architecture

Stacklane API runs as a **Netlify Function** with a catch-all redirect:

```
/*  →  /.netlify/functions/api
```

The function loads the compiled API handler from `apps/api/dist/server.js`.

| Product API | Path prefix | Billing |
|-------------|-------------|---------|
| Skills API | `/v1/skills/*` | Per action (credits) |
| Agent Browser API | `/v1/agent-browser/*` | Per action (credits) |
| MCP | `/mcp` | Proxies to product APIs |
| Cloud billing | `/api/v1/cloud/*` | Wallet + Stripe |

## Prerequisites

- Netlify account with access to `api.talocode.site`
- PostgreSQL database with connection pooling (Neon, Supabase, or Aiven recommended)
- `NETLIFY_AUTH_TOKEN` for CLI deploys
- Stripe keys for wallet top-ups

## Step 1: Netlify Site Setup

| Setting | Value |
|---------|-------|
| Build command | `npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm --filter @stacklane/api build` |
| Publish directory | `apps/api/dist` |
| Functions directory | `netlify/functions` |

`netlify.toml` at the repo root configures build, functions, and redirects.

## Step 2: Environment Variables

Set in Netlify → Site settings → Environment variables (see `apps/api/.env.netlify.example`):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection string |
| `TALOCODE_BASE_URL` | Yes | `https://api.talocode.site` |
| `TALOCODE_WEB_URL` | Yes | `https://talocode.site` |
| `TALOCODE_MCP_URL` | Yes | `https://api.talocode.site/mcp` |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `MISTRAL_API_KEY` | For Tera API | Mistral AI provider |
| `GITHUB_TOKEN` | Optional | Richer Skills API data |
| `AGENT_BROWSER_SERVICE_URL` | Optional | Playwright host for screenshots/full browser checks |

## Step 3: Custom Domain DNS

| Record | Type | Value |
|--------|------|-------|
| `api` | CNAME | `talocode-cloud-api.netlify.app` |

Or manage DNS in the Netlify domain panel.

## Step 4: Deploy with Netlify CLI

```bash
# From Stacklane repo root
export NETLIFY_AUTH_TOKEN="your-token"

# Link site (first time)
netlify link

# Production deploy
netlify deploy --prod

# Or trigger build from CI
netlify build && netlify deploy --prod --dir=apps/api/dist --functions=netlify/functions
```

## APIs Served

| Path | Description |
|------|-------------|
| `GET /api/v1/cloud/health` | Cloud health (with DB) |
| `GET /api/v1/cloud/pricing` | Credit pricing catalog |
| `POST /v1/skills/generate/*` | Skills API |
| `GET /v1/skills/health` | Skills health |
| `POST /v1/agent-browser/check` | HTTP/proxy browser check |
| `POST /v1/agent-browser/evidence` | Page evidence capture |
| `POST /v1/agent-browser/trace-report` | Deploy validation trace |
| `GET /v1/agent-browser/health` | Agent Browser health |
| `POST /mcp` | Model Context Protocol endpoint |
| `POST /api/v1/cloud/billing/stripe/webhook` | Stripe webhook |

## Agent Browser on Netlify

Netlify Functions support **HTTP-based** browser checks out of the box (status, title, response evidence).

For **screenshots and full Playwright checks**, set:

```
AGENT_BROWSER_SERVICE_URL=https://<playwright-host>
```

Point this at any host running `@talocode/agent-browser` API (Render, Fly.io, VPS).

## Local Testing Before Deploy

```bash
pnpm install --frozen-lockfile
pnpm --filter @stacklane/api build
pnpm --filter @stacklane/api test

node scripts/check-netlify-readiness.mjs
node scripts/smoke-netlify-api.mjs
```

## Smoke Test After Deploy

```bash
TALOCODE_BASE_URL=https://api.talocode.site node scripts/smoke-netlify-api.mjs

TALOCODE_BASE_URL=https://api.talocode.site \
  TALOCODE_API_KEY=tk_live_xxxx \
  node scripts/smoke-netlify-api.mjs
```

## Rollback Plan

1. Netlify dashboard → **Deploys** → select last working deploy → **Publish deploy**
2. Verify `curl https://api.talocode.site/api/v1/cloud/health`
3. Run `node scripts/smoke-netlify-api.mjs`
4. If DNS issue, fix `api` CNAME to Netlify target

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| 502 on all routes | Function failed to load | Check build output in `apps/api/dist` |
| DB errors | Missing or wrong `DATABASE_URL` | Use pooled connection string |
| Tera API 500 | No Mistral key | Set `MISTRAL_API_KEY` |
| Screenshot 503 | No Playwright on Netlify | Set `AGENT_BROWSER_SERVICE_URL` |
| Stripe webhook fails | Wrong secret | Match `STRIPE_WEBHOOK_SECRET` to Stripe dashboard |