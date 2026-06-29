# Router Providers

Talocode Cloud Router v0.1 supports the following AI providers. Providers are only active when their environment variable is set.

## Supported Providers

| Provider | Env Variable | Default Model | Status |
|----------|-------------|---------------|--------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` | Optional |
| OpenRouter | `OPENROUTER_API_KEY` | `openai/gpt-4o-mini` | Optional |
| Gemini | `GEMINI_API_KEY` | `gemini-2.0-flash` | Optional |
| Mock | (always available) | `mock-model` | Development |

## Provider Behavior

### OpenAI
- Standard OpenAI `/v1/chat/completions` API
- Supports all OpenAI chat models
- Uses Bearer token auth

### OpenRouter
- OpenRouter `/api/v1/chat/completions` API
- Routes to available models based on OpenRouter credits
- Sends `HTTP-Referer` and `X-Title` headers for OpenRouter ranking

### Gemini
- Google Gemini `generateContent` API
- Uses API key query parameter
- Response parsed from Gemini format to OpenAI-compatible format

### Mock
- Returns deterministic mock responses
- Always available for development and testing
- No API key required
- Useful for integration testing without provider costs

## Fallback Order

Each model defines its fallback order. The router tries providers in sequence:

- `talocode/auto`: OpenRouter → OpenAI → Gemini
- `talocode/fast`: OpenRouter → Gemini
- `talocode/coding`: OpenRouter → OpenAI

Overridable via `TALOCODE_ROUTER_FALLBACK_ORDER` environment variable.

## Adding a New Provider

1. Add provider config to `PROVIDER_CONFIGS` in `providers.ts`
2. Add `callProvider` handler in `providers.ts`
3. Add response parser (OpenAI-compatible or custom)
4. Add to `listConfiguredProviders()`
5. Add env variable check in `availableProviders()`
6. Update provider docs

## Security

- API keys are never logged in full (redacted to `sk-p...f456` format)
- Debug logging only enabled in development or with `TALOCODE_ROUTER_DEBUG=true`
- Provider requests timeout after 30 seconds
- Maximum input size is limited by provider constraints
- No raw prompts stored in usage events
