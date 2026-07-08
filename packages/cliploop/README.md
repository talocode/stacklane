# @talocode/cliploop

**Programmatic video generation** — prompt-to-video engine for briefs, scripts, and renders.

## Install

```bash
npm install @talocode/cliploop
```

## CLI Usage

```bash
# Generate a video brief
cliploop brief --prompt "explain quantum computing" --channel youtube --duration 60

# Generate a script from a brief
cliploop script --brief-id brief-abc123 --style educational

# Submit a render job
cliploop render --script-id script-abc123 --format landscape --quality standard

# Check render status
cliploop status --video-id render-abc123

# Create a campaign
cliploop campaign --name "Summer Launch" --platform youtube --schedule "2026-08-01T00:00:00Z"

# Use cloud API (requires TALOCODE_API_KEY)
cliploop --cloud brief --prompt "My video idea"
```

## SDK Usage

```typescript
import { generateBrief, generateScript, submitRender } from '@talocode/cliploop'

const brief = await generateBrief({
  prompt: 'explain quantum computing',
  channel: 'youtube',
  duration: 60,
})

const script = await generateScript({
  briefId: brief.id,
  style: 'educational',
})

const render = await submitRender({
  scriptId: script.id,
  format: 'landscape',
  quality: 'standard',
})
```

## Environment

| Variable | Description |
|----------|-------------|
| `MISTRAL_API_KEY` | Mistral API key for local AI generation |
| `TALOCODE_API_KEY` | API key for cloud mode |
| `TALOCODE_BASE_URL` | API base URL (default: `https://api.talocode.site`) |

## License

MIT
