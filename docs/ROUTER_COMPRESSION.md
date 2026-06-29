# Router Compression

Context compression reduces token usage and credit costs by compressing large input contexts before sending to the AI provider.

## Enable

Set `TALOCODE_ROUTER_ENABLE_COMPRESSION=true` to enable.

## Modes

| Mode | Description | Detection |
|------|-------------|-----------|
| `none` | No compression | Manual |
| `logs` | Compress log output | Auto-detected |
| `diff` | Compress diffs/patches | Auto-detected |
| `trace` | Compress stack traces | Auto-detected |
| `auto` | Auto-detect mode | Heuristic |

When set to `auto`, the compression service detects the content type based on patterns in the text.

## Log Compression Rules

- Preserves code fences (``` blocks)
- Preserves JSON blocks
- Preserves error lines (Error:, TypeError:, stack frames, etc.)
- Preserves file paths
- Preserves stack traces
- Removes duplicate repeated log lines
- Truncates noisy dependency/install output (npm/yarn logs)
- Summarizes repeated identical lines as `[repeated N times]`
- Reports actual saved percentage (no false claims)

## Diff Compression Rules

- Preserves diff headers (`diff --git`, `---`, `+++`)
- Preserves `@@` hunk headers
- Preserves added (`+`) and removed (`-`) lines
- Truncates context lines after 10 consecutive context lines
- Adds `[...context truncated...]` marker

## Trace Compression Rules

- Preserves error lines
- Deduplicates similar stack frames (normalized by address/line)
- Adds `[... N similar frames omitted ...]` marker
- Preserves file paths

## Compression Results

The compression service returns:

```typescript
{
  compressedText: string    // The compressed text
  originalLength: number    // Original character count
  compressedLength: number  // Compressed character count
  savedPercent: number      // Percentage saved
  warnings: string[]        // Compression warnings
}
```

## Response Headers

When compression is applied, the response includes:

- `x-talocode-compression-applied: true`
- `x-talocode-compression-saved-estimate: <bytes saved>`

## Limitations v0.1

- Compression only applies to the last user message
- No semantic compression (only structural dedup)
- No token-level compression (character-level only)
- No streaming compression support
