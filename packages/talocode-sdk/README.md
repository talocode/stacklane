# @talocode/sdk

**Talocode Cloud SDK** — typed access to all Talocode product APIs through one client, plus a unified CLI.

```bash
npm install -g @talocode/sdk
# or use directly
npx @talocode/sdk agent-browser check https://example.com
```

## CLI Usage

The package includes a `talocode` CLI for Web Intelligence (no API key needed for local mode).

```bash
# Check if a site is up
talocode agent-browser check https://example.com

# Extract structured content
talocode agent-browser extract https://en.wikipedia.org/wiki/JavaScript

# Analyze page content
talocode agent-browser analyze https://news.ycombinator.com

# Cloud mode (requires TALOCODE_API_KEY)
talocode --cloud agent-browser extract https://example.com
```

## SDK Quick start

```ts
import { Talocode } from '@talocode/sdk'

const talocode = new Talocode({
  apiKey: process.env.TALOCODE_API_KEY,
  baseUrl: 'https://api.talocode.site',
})
```

### Web Intelligence — Extract

```ts
const result = await talocode.agentBrowser.extract({
  url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
  includeImages: true,
  includeLinks: true,
})

console.log(result.title)       // "Artificial Intelligence - Wikipedia"
console.log(result.wordCount)   // 12543
console.log(result.headings)    // [{ level: 1, text: "..." }, ...]
console.log(result.links)       // [{ href: "...", text: "..." }, ...]
```

### Web Intelligence — Analyze

```ts
const result = await talocode.agentBrowser.analyze({
  url: 'https://news.ycombinator.com',
  analysis: ['summary', 'sentiment', 'topics', 'keywords'],
})

console.log(result.analysis.summary)
console.log(result.analysis.sentiment)   // "positive" | "negative" | "neutral" | "mixed"
console.log(result.analysis.keywords)    // ["ai", "startup", ...]
```

### Web Intelligence — Check

```ts
const check = await talocode.agentBrowser.check({
  url: 'https://example.com',
  screenshot: true,
})

console.log(check.status)     // "up" | "down" | "error"
console.log(check.checks)     // [{ name: "http_status", passed: true }, ...]
```

## Products

| Namespace | Product |
|-----------|---------|
| `talocode.agentBrowser` | Agent Browser / Web Intelligence |
| `talocode.tera` | Tera writing/coding |
| `talocode.router` | Model router |
| `talocode.cliploop` | ClipLoop |
| `talocode.codra` | Codra |
| `talocode.skills` | Talocode Skills |
| `talocode.invoicelane` | InvoiceLane |
| `talocode.webdatalane` | WebDataLane |
| `talocode.signallane` | SignalLane |
| `talocode.ugclane` | UGCLane |
| `talocode.crawlerlane` | CrawlerLane |
| `talocode.opensourcelane` | OpenSourceLane |
| `talocode.forgecad` | ForgeCAD |
| `talocode.replylane` | ReplyLane |

## Auth

```bash
export TALOCODE_API_KEY=tc_your_key
export TALOCODE_BASE_URL=https://api.talocode.site
```

## License

MIT — [Talocode](https://talocode.site)

Sponsor: https://github.com/sponsors/Abdulmuiz44