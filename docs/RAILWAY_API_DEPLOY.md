# Railway API Deployment — talocode-api

This guide documents how to deploy the **Talocode API (Stacklane)** to Railway.

## Service Overview

| Property | Value |
|----------|-------|
| Service name | `talocode-api` |
| Domain | `api.talocode.site` |
| Repo | `github.com/talocode/Stacklane` |
| Root directory | `/` (monorepo root) |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Start command | `pnpm --filter @stacklane/api start` |
| Health check | `GET /api/v1/cloud/health` |
| Port | `$PORT` (Railway auto-injects, falls back to `4000`) |

## Prerequisites

- Railway account with billing enabled
- Access to `talocode.site` DNS at Namecheap
- PostgreSQL plugin added to the Railway project

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) → **Dashboard** → **New Project**
2. Select **Deploy from GitHub repo**
3. Connect `github.com/talocode/Stacklane`
4. Railway auto-detects pnpm + Node.js via Nixpacks (config in `nixpacks.toml`)

## Step 2: Add PostgreSQL Plugin

1. In the same Railway project, click **New** → **Database** → **Add PostgreSQL**
2. Railway creates a PostgreSQL instance and injects `DATABASE_URL` into the API service

## Step 3: Set Environment Variables

### Required

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Railway Postgres plugin | Auto-injected, no manual entry needed |
| `NODE_ENV` | Manual | Set to `production` |

### Recommended

| Variable | Value | Notes |
|----------|-------|-------|
| `WEB_ORIGIN` | `https://dashboard.talocode.site` | CORS origin for dashboard |
| `TALOCODE_BASE_URL` | `https://api.talocode.site` | Self-referencing API base URL |
| `TALOCODE_CLOUD_SUCCESS_URL` | `https://dashboard.talocode.site` | Stripe checkout success redirect |
| `TALOCODE_CLOUD_CANCEL_URL` | `https://dashboard.talocode.site` | Stripe checkout cancel redirect |

### LLM Provider Keys (at least one required for router)

| Variable | Notes |
|----------|-------|
| `OPENAI_API_KEY` | OpenAI provider |
| `OPENROUTER_API_KEY` | OpenRouter provider (used as default if set) |
| `GEMINI_API_KEY` | Google Gemini provider |

### Stripe Keys (required for billing)

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Optional

| Variable | Default | Notes |
|----------|---------|-------|
| `TALOCODE_ROUTER_DEFAULT_PROVIDER` | `openrouter` | Default LLM provider |
| `GITHUB_TOKEN` | — | For richer Skills API data |
| `TALOCODE_ALLOW_MANUAL_TOPUPS` | — | Enable manual top-ups in production |

## Step 4: Configure Health Check

In Railway service settings:

1. Go to **Settings** → **Health Checks**
2. Set health check path: `/api/v1/cloud/health`
3. Set **Restart Policy**: `On failure`
4. Set **Restart Max Retries**: `5`

## Step 5: Add Custom Domain

After deployment, Railway provides a URL like `talocode-api.up.railway.app`.

1. In Railway service → **Settings** → **Domains** → **Custom Domain**
2. Add: `api.talocode.site`
3. Railway will prompt for the DNS record

### DNS (Namecheap)

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `api` | `{railway-project}.railway.app` | Automatic |

> **Important:** Remove any existing A/CNAME records for `api` pointing to GitHub Pages.

## Step 6: Verify Deployment

```bash
# Health check
curl -I https://api.talocode.site/api/v1/cloud/health
# Expected: 200 OK, body: { ok: true, service: "talocode-cloud-api", ... }

# Live check
curl https://api.talocode.site/api/v1/cloud/health
# Expected: JSON with database status

# Models endpoint
curl https://api.talocode.site/v1/models
# Expected: JSON list of available models

# Skills health
curl -H "Authorization: Bearer $TALOCODE_API_KEY" \
  https://api.talocode.site/v1/skills/health
# Expected: JSON with skills API status
```

## APIs Served

| Path | Description |
|------|-------------|
| `GET /health` | Basic health (no DB needed) |
| `GET /api/v1/cloud/health` | Cloud health (with DB) |
| `GET /api/v1/cloud/pricing` | Pricing catalog |
| `POST /api/v1/cloud/usage/charge` | Charge credits |
| `POST /mcp` | Model Context Protocol endpoint |
| `POST /v1/router/chat/completions` | Chat completions |
| `GET /v1/router/models` | List models |
| `POST /v1/skills/generate/*` | Skills API |
| `GET /v1/skills/health` | Skills health |
| `POST /api/v1/cloud/billing/stripe/webhook` | Stripe webhook |

## Rollback Plan

If deployment fails or the API is unstable:

1. **Revert DNS**: Point `api.talocode.site` back to the previous hosting (if any), or remove the CNAME to take the API offline.
2. **Redeploy previous version**: In Railway, go to **Deployments** → select the last known-good deployment → **Redeploy**.
3. **Rollback Railway project**: If using Git-based deploys, push a revert commit or pin deployment to a specific branch/commit.

## Local Testing Before Deploy

```bash
# Start local Postgres
docker compose -f infra/docker/docker-compose.yml up -d

# Run migrations
pnpm db:migrate

# Start API
pnpm dev:api

# Test health
curl http://localhost:4000/health

# Run tests
pnpm test:api
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| App crashes on start | Missing `DATABASE_URL` | Add PostgreSQL plugin or set `DATABASE_URL` manually |
| Health check fails | DB not migrated | Run `pnpm db:migrate` manually via Railway Shell |
| 502 Bad Gateway | App not listening on `$PORT` | Verify `process.env.PORT` is read in config.ts |
| Stripe webhook fails | Missing `STRIPE_WEBHOOK_SECRET` | Set the Stripe webhook signing secret |
| Router returns 500 | No LLM provider keys | Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` |
