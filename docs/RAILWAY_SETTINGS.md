# Railway Deployment Settings

## Stacklane API

| Setting | Value |
|---------|-------|
| Root Directory | `.` (repo root) |
| Build Command | `pnpm install --frozen-lockfile && pnpm build` |
| Start Command | `pnpm --filter @stacklane/api start` |
| Healthcheck Path | `/api/v1/cloud/health` |

### Environment Variables

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `PORT` | `4000` | Yes | Must match custom domain target port |

Custom domain `api.talocode.site` → target port `4000`.

### Startup Behavior
- Binds to `0.0.0.0` explicitly
- Logs: `[startup] Stacklane API running on 0.0.0.0:{port} (PORT={env})`
- Continues without DB if connection fails (logged as error, server still starts)

---

## Talocode Dashboard

| Setting | Value |
|---------|-------|
| Root Directory | `apps/dashboard` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` (→ `serve dist -l tcp://0.0.0.0:$PORT`) |
| Healthcheck Path | `/` |

### Environment Variables

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `PORT` | `3000` | Yes | Must match custom domain target port |

Custom domain `dashboard.talocode.site` → target port `3000`.

### Startup Behavior
- `serve` serves static `dist/` on `0.0.0.0:$PORT`
- Single-page app: all paths fall back to `index.html` (handled by `serve -s`)
