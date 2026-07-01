# Netlify Deployment Guide — Stacklane API

## Deployment Shape Assessment

### Recommendation: NOT suitable for Netlify Functions (primary)

**Stacklane API is a long-running Node HTTP server with database connections, not a stateless serverless function.** Key incompatibilities:

| Factor | Stacklane API | Netlify Functions Requirement | Impact |
|--------|---------------|-------------------------------|--------|
| Runtime | Persistent Node process (via `tsx`) | Stateless, cold-start per request | High latency, connection churn |
| Database | Persistent PostgreSQL connection pool | No persistent connections | Need external DB pooler |
| Timeout | Unlimited (listening server) | 10s (26s on Pro) | Long requests fail |
| State | In-memory cache, provisioning worker | No persistent state | Worker cannot run |
| Build | TypeScript via `tsx` at runtime | Pre-compiled JS required | Build config mismatch |

### Recommended: Deploy API on persistent Node hosting

| Platform | Strengths | Cost | Notes |
|----------|-----------|------|-------|
| **Railway** | Native Node, Postgres add-on, GitHub deploy | Free tier → $5/mo | Best fit for monorepo, pnpm support |
| **Render** | Web Services, cron jobs, Postgres | Free tier → $7/mo | Good for long-running processes |
| **Fly.io** | Edge-close, Postgres, global regions | Pay-as-you-go | More complex setup |
| **Railway is recommended** for Stacklane API. | | | |

### Alternative: Netlify Functions with adapter (if needed)

If you must deploy on Netlify, a Function adapter is provided at `netlify/functions/api.mjs`. This wraps the Node HTTP handler for Netlify Functions using a catch-all `/*` route.

**Limitations of the Netlify approach:**
- Database connections must use an external pooler (e.g., PgBouncer via Neon, Supabase, or Aiven)
- Provisioning worker (interval-based) will NOT run
- Cold starts add 3-5 seconds per request
- Function timeout (26s max on Pro) limits long operations
- MCP tools that proxy to external APIs may timeout
- Skills API GitHub fetches may timeout on large profiles

---

## Recommended Setup (Railway or Render)

### 1. Create a Railway project

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `talocode/stacklane`
3. Set root directory: `/` (monorepo root)
4. Build command: `pnpm install --frozen-lockfile`
5. Start command: `pnpm --filter @stacklane/api start`

### 2. Set environment variables in Railway

Copy all vars from `apps/api/.env.netlify.example` and set:
- `DATABASE_URL` → Railway PostgreSQL add-on connection string
- `PORT` → Railway sets this automatically (usually 8080)
- All AI provider keys as needed

### 3. Add PostgreSQL

1. Railway → New → Database → PostgreSQL
2. Copy the connection string to `DATABASE_URL`
3. Run migration once: `pnpm --filter @stacklane/api db:migrate`

---

## Netlify Setup (If Required)

### Prerequisites

- Netlify account with access to `api.talocode.site` custom domain
- DNS A record for `api.talocode.site` pointing to Netlify's load balancer IPs (`75.2.60.5`)
- PostgreSQL database with external pooler (e.g., Neon, Supabase, Railway PG)

### Step-by-Step

#### 1. Netlify Site Setup

| Setting | Value |
|---------|-------|
| Site name | `talocode-cloud-api` |
| Build command | `pnpm install --frozen-lockfile && pnpm --filter @stacklane/api build` |
| Publish directory | `apps/api/dist` |
| Functions directory | `netlify/functions` |

#### 2. Custom Domain

| Setting | Value |
|---------|-------|
| Domain | `api.talocode.site` |
| DNS | Add CNAME `api` → `talocode-cloud-api.netlify.app` (or Netlify's 75.2.60.5 A record) |
| SSL | Auto-provisioned by Netlify (Let's Encrypt) |

#### 3. Environment Variables (Netlify UI)

Set these in Netlify → Site settings → Environment variables:

```
NODE_VERSION=22
NODE_ENV=production
DATABASE_URL=<postgres://...>
TALOCODE_BASE_URL=https://api.talocode.site
TALOCODE_WEB_URL=https://talocode.site
TALOCODE_MCP_URL=https://api.talocode.site/mcp
STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
GITHUB_TOKEN=<github-token>
OPENROUTER_API_KEY=<openrouter-key>
GEMINI_API_KEY=<gemini-key>
```

#### 4. netlify.toml

The `netlify.toml` at the repo root handles:
- Build command
- Function settings (esbuild bundler, node_modules externals)
- Catch-all redirect `/*` → Netlify Function

#### 5. Apex Domain DNS

For `api.talocode.site`:

| Record | Type | Value |
|--------|------|-------|
| `api` | CNAME | `talocode-cloud-api.netlify.app` |

Or use Netlify's DNS panel to manage the domain directly.

---

## Build Process

The build step compiles TypeScript to JS:

```bash
pnpm install --frozen-lockfile \
  && pnpm --filter @stacklane/api build
```

Output: `apps/api/dist/` (compiled JS from `tsc`)

The Netlify Function at `netlify/functions/api.mjs` imports from `../../apps/api/src/server.ts` at dev time, but in production the Netlify build will compile TS and the function should import from `../../apps/api/dist/server.js`.

> **Note:** The current adapter imports from `.ts` source directly, which requires `tsx` at runtime. A production-ready adapter should import from the compiled output. This is a known limitation of the adapter approach.

---

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `DATABASE_URL` | Yes | PostgreSQL provider |
| `TALOCODE_BASE_URL` | Yes | `https://api.talocode.site` |
| `TALOCODE_WEB_URL` | Yes | `https://talocode.site` |
| `TALOCODE_MCP_URL` | Yes | `https://api.talocode.site/mcp` |
| `STRIPE_SECRET_KEY` | For billing | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook config |
| `GITHUB_TOKEN` | Optional | GitHub token for Skills API |
| `OPENROUTER_API_KEY` | For router | OpenRouter dashboard |
| `WEB_ORIGIN` | Yes | CORS origin (`https://talocode.site`) |

See `apps/api/.env.netlify.example` for the full list.

---

## Smoke Test After Deploy

```bash
# Against production
TALOCODE_BASE_URL=https://api.talocode.site node scripts/smoke-netlify-api.mjs

# With API key for authenticated tests
TALOCODE_BASE_URL=https://api.talocode.site \
  TALOCODE_API_KEY=tk_live_xxxx \
  node scripts/smoke-netlify-api.mjs
```

The smoke script checks:
- `GET /api/v1/cloud/health`
- `GET /health`
- `GET /v1/router/models`
- `POST /mcp` (tools/list)
- `GET /api/v1/cloud/mcp/tools`
- `GET /v1/skills/health`
- Authenticated skills generation (if API key set)
- Response headers

---

## Readiness Verification

Before deploying, run:

```bash
node scripts/check-netlify-readiness.mjs
```

This verifies:
- All required files exist
- Package scripts are configured
- Health endpoints are defined
- No `.xyz` primary URLs remain
- `.env.netlify.example` documents required vars
- Smoke scripts exist

---

## Rollback Plan

| Scenario | Action |
|----------|--------|
| Deploy broken | Netlify → Deploys → Deploy previous successful deploy |
| DNS misconfigured | Update `api.talocode.site` CNAME back to previous target |
| Database migration failed | Run rollback migration or restore DB backup |
| Auth broken | Verify `TALOCODE_API_KEY` env and Stripe keys in Netlify UI |
| Credits / billing broken | Check Stripe webhook endpoint, verify STRIPE_WEBHOOK_SECRET |

**Rollback steps:**
1. Netlify dashboard → Deploys → find last working deploy → "Publish deploy"
2. Check `https://api.talocode.site/api/v1/cloud/health`
3. Run smoke test
4. If still broken, check DNS: ensure CNAME `api` → correct target

---

## Verifying Deployment

```bash
# 1. Health endpoint
curl https://api.talocode.site/api/v1/cloud/health

# 2. Router models
curl https://api.talocode.site/v1/router/models

# 3. Skills health
curl https://api.talocode.site/v1/skills/health

# 4. MCP tools
curl -X POST https://api.talocode.site/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
  -H "Authorization: Bearer $TALOCODE_API_KEY"

# 5. MCP tool list (GET)
curl https://api.talocode.site/api/v1/cloud/mcp/tools
```
