# @talocode/sdk

**Talocode Cloud SDK** — typed access to all Talocode product APIs through one client.

```bash
npm install @talocode/sdk
```

## Quick start

```ts
import { Talocode } from '@talocode/sdk'

const talocode = new Talocode({
  apiKey: process.env.TALOCODE_API_KEY,
  baseUrl: 'https://api.talocode.site',
})

const health = await talocode.replylane.health()
const score = await talocode.replylane.opportunity.score({
  tweetText: 'We tested reply timing across 50 accounts.',
  authorHandle: 'builder',
  authorFollowers: 8000,
  yourFollowers: 800,
  ageMinutes: 5,
})
```

## Products

| Namespace | Product |
|-----------|---------|
| `talocode.tera` | Tera writing/coding |
| `talocode.router` | Model router |
| `talocode.agentBrowser` | Agent Browser |
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

## Legacy Stacklane client

```ts
import { createStacklaneClient, Talocode } from '@talocode/sdk'
```

## License

MIT — [Talocode](https://talocode.site)

Sponsor: https://github.com/sponsors/Abdulmuiz44