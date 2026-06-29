# Talocode Cloud Router v0.1

OpenAI-compatible AI provider routing layer for Talocode Cloud. Routes chat completion requests through configured AI providers, charges prepaid wallet credits, and returns OpenAI-compatible responses.

## Quick Start

```bash
curl https://api.talocode.xyz/v1/chat/completions \
  -H "Authorization: Bearer $TALOCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "talocode/auto",
    "messages": [
      { "role": "user", "content": "Hello" }
    ]
  }'
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/chat/completions` | API Key | Chat completion with provider routing |
| GET | `/v1/models` | None | List available Talocode router models |
| GET | `/api/v1/cloud/router/health` | None | Router health and provider status |
| GET | `/api/v1/cloud/router/providers` | None | List configured providers |

## Authentication

Use your Talocode API key:

```
Authorization: Bearer tk_dev_xxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or via header:

```
X-Api-Key: tk_dev_xxxxxxxx.xxxxxxxx...
```

## Models

| Model | Use Case | Base Credits | Input/1k | Output/1k | Fallback |
|-------|----------|-------------|----------|-----------|----------|
| `talocode/auto` | General purpose | 2 | 1 | 2 | OpenRouter → OpenAI → Gemini |
| `talocode/fast` | Quick responses | 1 | 1 | 1 | OpenRouter → Gemini |
| `talocode/coding` | Code generation | 3 | 2 | 4 | OpenRouter → OpenAI |

## Credit Charging

Safe estimated charging:

1. **Pre-charge**: Estimate input tokens → compute minimum credits → charge before provider call
2. **Provider call**: Route to first available provider in fallback order
3. **Delta charge**: If final token cost exceeds pre-charge, charge the difference
4. **Usage event**: Record `product: talocode_router, action: chat.completions` with token estimates

1 credit = $0.01 USD. New projects receive 100 free credits.

## Response Headers

| Header | Description |
|--------|-------------|
| `x-talocode-request-id` | Unique request identifier |
| `x-talocode-project-id` | Project that was charged |
| `x-talocode-provider` | AI provider used |
| `x-talocode-model` | Model requested |
| `x-talocode-credits-charged` | Total credits deducted |
| `x-talocode-wallet-balance` | Remaining credits |
| `x-talocode-compression-applied` | Whether compression was used |
| `x-talocode-compression-saved-estimate` | Bytes saved by compression |

## Provider Fallback

If a provider returns 429 (rate limited), 5xx, times out, or is unavailable, the router automatically tries the next provider in the model's fallback order.

No fallback on: invalid requests, safety refusals, malformed API keys, or insufficient credits.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `OPENROUTER_API_KEY` | No | - | OpenRouter API key |
| `GEMINI_API_KEY` | No | - | Google Gemini API key |
| `TALOCODE_ROUTER_DEFAULT_PROVIDER` | No | `openrouter` | Default provider |
| `TALOCODE_ROUTER_FALLBACK_ORDER` | No | env order | Comma-separated fallback order |
| `TALOCODE_ROUTER_ENABLE_COMPRESSION` | No | `false` | Enable context compression |

## Usage Examples

### Codra

```bash
curl https://api.talocode.xyz/v1/chat/completions \
  -H "Authorization: Bearer $TALOCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "talocode/coding",
    "messages": [
      { "role": "user", "content": "Explain this codebase structure" }
    ],
    "max_tokens": 2000
  }'
```

### Agent Browser

```bash
curl https://api.talocode.xyz/v1/chat/completions \
  -H "Authorization: Bearer $TALOCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "talocode/fast",
    "messages": [
      { "role": "system", "content": "You are a browser automation assistant." },
      { "role": "user", "content": "Analyze this page content: ..." }
    ]
  }'
```

### Tera Browser

```bash
curl https://api.talocode.xyz/v1/chat/completions \
  -H "Authorization: Bearer $TALOCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "talocode/auto",
    "messages": [
      { "role": "user", "content": "Summarize the context from this page." }
    ]
  }'
```

### WorkLane

```bash
curl https://api.talocode.xyz/v1/chat/completions \
  -H "Authorization: Bearer $TALOCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "talocode/auto",
    "messages": [
      { "role": "user", "content": "Generate a workflow summary for..." }
    ]
  }'
```

## Error Responses

### Insufficient Credits

```json
HTTP 402
{
  "error": {
    "code": "insufficient_credits",
    "message": "Insufficient Talocode Cloud credits.",
    "required": 5,
    "available": 2
  }
}
```

### Unknown Model

```json
HTTP 404
{
  "error": {
    "code": "UNKNOWN_MODEL",
    "message": "Unknown model: talocode/unknown"
  }
}
```

### No Providers Configured

```json
HTTP 501
{
  "error": {
    "code": "NO_PROVIDERS_CONFIGURED",
    "message": "No AI providers are configured..."
  }
}
```

### All Providers Failed

```json
HTTP 503
{
  "error": {
    "code": "ALL_PROVIDERS_FAILED",
    "message": "..."
  }
}
```
