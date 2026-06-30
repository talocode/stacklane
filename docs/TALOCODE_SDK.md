# Talocode Cloud SDK

Official package: `@talocode/sdk` (currently available as `@stacklane/sdk`)

The Talocode Cloud SDK provides typed access to all Talocode product APIs through a single client.

> **Not yet published to npm.** Package name prepared for `@talocode/sdk`. Currently available as `@stacklane/sdk` in the Stacklane monorepo.

## Installation

```bash
npm install @stacklane/sdk   # current
```

When published, the canonical import will be:

```bash
npm install @talocode/sdk
```

## Quick Start

```ts
import { Talocode } from "@talocode/sdk";

const talocode = new Talocode({
  apiKey: process.env.TALOCODE_API_KEY,
});

const result = await talocode.tera.writing.rewrite({
  text: "We shipped Agent Browser.",
  style: "clear, founder-like, X post",
  maxLength: 280,
});
```

## Configuration

```ts
const talocode = new Talocode({
  apiKey: "tk_dev_xxx",           // defaults to process.env.TALOCODE_API_KEY
  baseUrl: "https://custom.url",  // defaults to process.env.TALOCODE_BASE_URL or https://api.talocode.xyz
  timeoutMs: 30000,               // per-request timeout (default: 30000)
});
```

## Supported Namespaces

| Namespace | Client Access | Status |
|-----------|--------------|--------|
| Tera | `talocode.tera.*` | Implemented |
| Router | `talocode.router.*` | Implemented |
| Agent Browser | `talocode.agentBrowser.*` | Implemented |
| ClipLoop | `talocode.cliploop.*` | Implemented (typed, routes planned) |
| Codra | `talocode.codra.*` | Implemented |
| Tradia | `talocode.tradia.*` | Planned — throws `TalocodeNotImplementedError` |
| SignalLane | `talocode.signallane.*` | Planned — throws `TalocodeNotImplementedError` |
| WorkLane | `talocode.worklane.*` | Planned — throws `TalocodeNotImplementedError` |

## Tera API

```ts
// Writing
const rewrite = await talocode.tera.writing.rewrite({ text, style, tone, maxLength });
const draft   = await talocode.tera.writing.draft({ type, brief, audience, tone });

// Coding
const explain = await talocode.tera.coding.explain({ language, code, level, focus });
const review  = await talocode.tera.coding.review({ language, code, focus, strictness });

// Info
const health       = await talocode.tera.health();
const capabilities = await talocode.tera.capabilities();
const pricing      = await talocode.tera.pricing();
```

## Router API

```ts
// Chat completion
const chat = await talocode.router.chat({
  model: "talocode/auto",
  messages: [{ role: "user", content: "Hello" }],
});

// Info
const models    = await talocode.router.models();
const providers = await talocode.router.providers();
const health    = await talocode.router.health();
```

## Agent Browser API

```ts
const check = await talocode.agentBrowser.check({
  url: "https://example.com",
  screenshot: true,
});

const screenshot = await talocode.agentBrowser.screenshot({
  url: "https://example.com",
  fullPage: true,
});

const trace = await talocode.agentBrowser.traceReport({
  url: "https://example.com",
  steps: [{ action: "click", selector: "#submit" }],
});
```

## Codra API

Codra Cloud API provides hosted coding capabilities: repo analysis, code explanation, code review, and planning. Local Codra remains open-source and local-first.

```ts
// Analyze repository structure
const summary = await talocode.codra.repoSummary({
  files: [{ path: "src/main.ts", content: "..." }],
  focus: ["architecture", "risks"],
});

// Explain code
const explain = await talocode.codra.explain({
  language: "typescript",
  code: "const x = 1;",
  level: "beginner",
});

// Review code
const review = await talocode.codra.review({
  language: "typescript",
  code: "function f() {}",
  focus: ["bugs", "types"],
});

// Plan implementation
const plan = await talocode.codra.plan({
  task: "Add Stripe topups",
  context: "We use Stripe for payments",
  constraints: ["do not break auth"],
});
```

Pricing: `repo.summary` 50cr, `explain` 20cr, `review` 40cr, `plan` 40cr.

## ClipLoop API (planned — routes documented, backend in development)

```ts
const brief = await talocode.cliploop.brief({
  prompt: "Weekly promo for our new feature",
  channel: "twitter",
  tone: "exciting",
});

const script = await talocode.cliploop.script({ briefId: brief.id });

const video = await talocode.cliploop.render({
  scriptId: script.id,
  format: "portrait",
  quality: "standard",
});

const campaign = await talocode.cliploop.campaign.create({
  name: "Product Launch Week",
  platform: "twitter",
});

const packaged = await talocode.cliploop.campaign.package({
  campaignId: campaign.id,
});
```

## Error Handling

```ts
import { TalocodeInsufficientCreditsError, TalocodeAuthError } from "@talocode/sdk";

try {
  await talocode.tera.writing.rewrite({ text: "Hello", style: "clear" });
} catch (err) {
  if (err instanceof TalocodeInsufficientCreditsError) {
    console.log(`Need ${err.required} credits, have ${err.available}`);
  } else if (err instanceof TalocodeAuthError) {
    console.log("Check your TALOCODE_API_KEY");
  }
}
```

All error classes:

| Error Class | HTTP Status | Description |
|-------------|-------------|-------------|
| `TalocodeError` | varies | Base error |
| `TalocodeAuthError` | 401 | Missing/invalid API key |
| `TalocodeInsufficientCreditsError` | 402 | Not enough credits |
| `TalocodeRateLimitError` | 429 | Rate limited |
| `TalocodeValidationError` | 400 | Invalid request |
| `TalocodeNotImplementedError` | — | Namespace not yet implemented |

## Migration from v0.4

The existing `createStacklaneClient` function remains unchanged. Add the new `Talocode` client alongside it:

```ts
import { createStacklaneClient, Talocode } from "@stacklane/sdk";

// Still works:
const admin = createStacklaneClient({ baseUrl: "http://localhost:4000" });

// New Talocode Cloud client:
const cloud = new Talocode({ apiKey: process.env.TALOCODE_API_KEY });
await cloud.router.chat({ model: "talocode/auto", messages: [] });
```
