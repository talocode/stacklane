# Stacklane

Stacklane is the Talocode backend cloud/control plane — API keys, customers, wallet credits, usage metering, billing, and hosted API infrastructure for all Talocode products.

## Features

- **API Keys** — `sk_lane_dev_...` and `sk_lane_live_...`, hashed at rest, shown once at creation
- **Customers** — Local customer management with `.stacklane/customers.json`
- **Usage Metering** — Event tracking and usage summaries
- **Billing** — Credit-based billing for Talocode product APIs
- **Asset Management** — Metadata records and local file storage under `.stacklane/files/`
- **Audit Events** — Security-relevant event logging
- **Health** — `/health` endpoint

## Packages

| Package | Description |
|---------|-------------|
| `@talocode/sdk` | Unified TypeScript SDK — TradiaClient, TeraClient, ClipLoopClient, and more |
| `@talocode/mcp` | MCP bridge for AI agent integration (Claude Code, Cursor, OpenCode, Codex) |
| `apps/api` | REST API server with hosted routes + billing |

## SDK

```typescript
import { TradiaClient } from '@talocode/sdk'

const tradia = new TradiaClient({
  apiKey: process.env.TALOCODE_API_KEY,
  useCloud: true,
})

const proposal = await tradia.trade.propose({
  symbol: 'XAUUSD',
  market: 'forex',
  accountBalance: 500,
  riskPercent: 0.5,
})
```

## MCP

MCP tools expose Talocode products (Tradia, Tera, ClipLoop, etc.) as agent-callable tools. See [`@talocode/mcp`](packages/talocode-mcp/README.md).

## Docs

- `docs/API.md`
- `docs/SDK.md`
- `docs/CLI.md`
- `docs/MCP.md`
- `docs/PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/STORAGE_AND_USAGE.md`
- `docs/SECURITY.md`
- `docs/TALOCODE_INTEGRATION.md`
- `docs/TALOCODE_MCP_BRIDGE.md`

## Local-First

Stacklane runs fully local. No external platform dependencies. Data is persisted under `.stacklane/`.

## License

MIT

## Support

Open-source Talocode products are built and maintained by Abdulmuiz Adeyemo.

Sponsor the work: https://github.com/sponsors/Abdulmuiz44
