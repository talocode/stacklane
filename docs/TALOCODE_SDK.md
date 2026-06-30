# Talocode Cloud SDK

Package name: `@stacklane/sdk` (alias prepared for `@talocode/sdk`)

The Talocode Cloud SDK provides typed access to all Talocode product APIs through a single client.

> **Not yet published to npm.** Package name prepared for `@talocode/sdk`. Currently available as `@stacklane/sdk` in the Stacklane monorepo.

## Installation

```bash
npm install @stacklane/sdk
```

When published, the canonical name will be:

```bash
npm install @talocode/sdk
```

## Quick Start

```ts
import { Talocode } from "@stacklane/sdk";

const talocode = new Talocode({
  apiKey: process.env.TALOCODE_API_KEY,
  baseUrl: process.env.TALOCODE_BASE_URL, // defaults to https://api.talocode.xyz
});

const result = await talocode.tera.writing.rewrite({
  text: "We shipped Agent Browser.",
  style: "clear, founder-like, X post",
  tone: "direct",
  maxLength: 280,
});

console.log(result.result.text);
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

| Namespace | Client Access | Description |
|-----------|--------------|-------------|
| Tera | `talocode.tera.*` | Writing and coding capabilities |
| Router | `talocode.router.*` | OpenAI-compatible chat completions |
| Agent Browser | `talocode.agentBrowser.*` | Browser validation and screenshots |

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

## Error Handling

```ts
import {
  TalocodeError,
  TalocodeAuthError,
  TalocodeInsufficientCreditsError,
  TalocodeRateLimitError,
  TalocodeValidationError,
} from "@stacklane/sdk";

try {
  await talocode.tera.writing.rewrite({ text: "Hello", style: "clear" });
} catch (err) {
  if (err instanceof TalocodeInsufficientCreditsError) {
    console.log(`Need ${err.required} credits, have ${err.available}`);
  } else if (err instanceof TalocodeAuthError) {
    console.log("Check your TALOCODE_API_KEY");
  } else if (err instanceof TalocodeValidationError) {
    console.log("Validation failed:", err.details);
  } else if (err instanceof TalocodeRateLimitError) {
    console.log("Rate limited, retry later");
  } else if (err instanceof TalocodeError) {
    console.log(`API error ${err.status}: ${err.message}`);
  }
}
```

## TypeScript

All inputs and responses are fully typed:

```ts
import {
  Talocode,
  TeraRewriteInput,
  TeraRewriteResult,
  TeraSuccessResponse,
  RouterChatInput,
  RouterChatResponse,
  AgentBrowserCheckInput,
  AgentBrowserCheckResult,
  UsageMeta,
} from "@stacklane/sdk";
```

## Migration from v0.4

The existing `createStacklaneClient` function remains unchanged. Add the new `Talocode` client alongside it:

```ts
import { createStacklaneClient, Talocode } from "@stacklane/sdk";

// Still works:
const admin = createStacklaneClient({ baseUrl: "http://localhost:4000" });
await admin.health();

// New Talocode Cloud client:
const cloud = new Talocode({ apiKey: process.env.TALOCODE_API_KEY });
await cloud.router.chat({ model: "talocode/auto", messages: [] });
```
