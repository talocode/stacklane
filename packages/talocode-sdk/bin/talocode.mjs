#!/usr/bin/env node

const BASE_URL = process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'
const API_KEY = process.env.TALOCODE_API_KEY || ''

function help() {
  console.log(`
Talocode SDK CLI — Web Intelligence

Usage:
  talocode agent-browser check <url> [--screenshot] [--vision]
  talocode agent-browser extract <url> [--no-links] [--no-images] [--max-text N]
  talocode agent-browser analyze <url> [--analysis summary,sentiment,entities,topics,keywords]
  talocode agent-browser screenshot <url> [--full-page] [--width N] [--height N]
  talocode agent-browser health
  talocode --help

Options:
  --cloud              Use Talocode Cloud API (requires TALOCODE_API_KEY)
  --format json|text   Output format (default: text)
  --output <file>      Write output to file
  --help               Show this help

Environment:
  TALOCODE_BASE_URL    API base URL (default: https://api.talocode.site)
  TALOCODE_API_KEY     API key for cloud mode

Examples:
  talocode agent-browser check https://example.com
  talocode agent-browser extract https://example.com --no-images
  talocode agent-browser analyze https://example.com
  TALOCODE_API_KEY=sk_... talocode --cloud agent-browser analyze https://example.com
`.trim())
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { cloud: false, format: 'text', output: '', analysis: [], screenshot: false, vision: false, fullPage: false, width: 0, height: 0, noLinks: false, noImages: false, maxText: 0 }
  const positional = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help') { help(); process.exit(0) }
    if (arg === '--cloud') { opts.cloud = true; continue }
    if (arg === '--format' && i + 1 < args.length) { opts.format = args[++i]; continue }
    if (arg === '--output' && i + 1 < args.length) { opts.output = args[++i]; continue }
    if (arg === '--screenshot') { opts.screenshot = true; continue }
    if (arg === '--vision') { opts.vision = true; continue }
    if (arg === '--full-page') { opts.fullPage = true; continue }
    if (arg === '--width' && i + 1 < args.length) { opts.width = parseInt(args[++i]); continue }
    if (arg === '--height' && i + 1 < args.length) { opts.height = parseInt(args[++i]); continue }
    if (arg === '--no-links') { opts.noLinks = true; continue }
    if (arg === '--no-images') { opts.noImages = true; continue }
    if (arg === '--max-text' && i + 1 < args.length) { opts.maxText = parseInt(args[++i]); continue }
    if (arg === '--analysis' && i + 1 < args.length) { opts.analysis = args[++i].split(',').map(s => s.trim()); continue }
    if (arg.startsWith('--')) { console.error(`Unknown option: ${arg}`); process.exit(1) }
    positional.push(arg)
  }

  return { positional, opts }
}

function outputResult(label, data, format, outputFile) {
  const text = format === 'json' ? JSON.stringify(data, null, 2) : formatOutput(label, data)
  if (outputFile) {
    import('fs').then(fs => fs.writeFileSync(outputFile, text + '\n'))
    console.log(`Written to ${outputFile}`)
  } else {
    console.log(text)
  }
}

function formatOutput(label, data) {
  if (typeof data === 'string') return data
  const lines = [`── ${label} ──`]
  for (const [key, value] of Object.entries(data)) {
    if (key === 'durationMs') continue
    if (typeof value === 'object' && value !== null) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`)
    } else {
      lines.push(`  ${key}: ${value}`)
    }
  }
  if (data.durationMs) lines.push(`  duration: ${data.durationMs}ms`)
  return lines.join('\n')
}

async function main() {
  const { positional, opts } = parseArgs()

  if (positional.length < 1) {
    help()
    process.exit(0)
  }

  const command = positional[0]
  const subcommand = positional[1]
  const url = positional[2]

  try {
    if (command === 'agent-browser') {
      if (subcommand === 'health') {
        if (opts.cloud) {
          const res = await fetch(`${BASE_URL}/v1/agent-browser/health`)
          const result = await res.json()
          outputResult('Agent Browser Health', result, opts.format, opts.output)
        } else {
          outputResult('Agent Browser Health', { status: 'ok', mode: 'local' }, opts.format, opts.output)
        }
        return
      }

      if (!url) { console.error('Error: URL is required'); process.exit(1) }

      if (subcommand === 'check') {
        const started = Date.now()
        const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
        const body = await res.text()
        const title = (body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
        outputResult('Browser Check', {
          url,
          status: res.ok ? 'up' : 'down',
          statusCode: res.status,
          title,
          bytes: body.length,
          durationMs: Date.now() - started,
        }, opts.format, opts.output)
        return
      }

      if (subcommand === 'screenshot') {
        console.error('Screenshot requires the Talocode Cloud API. Use --cloud with a valid API key.')
        process.exit(1)
      }

      if (subcommand === 'extract') {
        const started = Date.now()
        const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
        const html = await res.text()
        const finalUrl = res.url || url

        const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
        const desc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ||
                     html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] || '')
        const lang = (html.match(/<html[^>]*\slang=["']([^"']+)["']/i)?.[1] || '')

        const headings = []
        for (let i = 1; i <= 6; i++) {
          const re = new RegExp(`<h${i}[^>]*>([^<]*)<\\/h${i}>`, 'gi')
          let m; while ((m = re.exec(html)) !== null) {
            const t = m[1].replace(/<[^>]+>/g, '').trim()
            if (t) headings.push({ level: i, text: t })
          }
        }

        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
          .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

        const maxText = opts.maxText || 50000
        const preview = textContent.length > maxText ? textContent.slice(0, maxText) + '...' : textContent

        outputResult('Content Extraction', {
          url,
          title,
          description: desc.slice(0, 300),
          language: lang,
          wordCount: textContent.split(/\s+/).filter(Boolean).length,
          headings: headings.length,
          textPreview: preview.slice(0, 500) + '...',
          durationMs: Date.now() - started,
        }, opts.format, opts.output)
        return
      }

      if (subcommand === 'analyze') {
        const started = Date.now()
        const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
        const html = await res.text()
        const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000)

        const words = textContent.toLowerCase().split(/\s+/).filter(Boolean)
        const positiveWords = ['good','great','excellent','amazing','best','success','positive','growth','profit','improve','breakthrough']
        const negativeWords = ['bad','worst','fail','loss','risk','danger','crisis','decline','problem','error','threat']
        const posCount = words.filter(w => positiveWords.includes(w)).length
        const negCount = words.filter(w => negativeWords.includes(w)).length
        const sentiment = posCount > negCount * 1.5 ? 'positive' : negCount > posCount * 1.5 ? 'negative' : posCount > 0 && negCount > 0 ? 'mixed' : 'neutral'

        const wordFreq = {}
        words.filter(w => w.length > 4).forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1 })
        const keywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(e => e[0])

        outputResult('Page Analysis', {
          url,
          title,
          wordCount: textContent.split(/\s+/).filter(Boolean).length,
          summary: `Page titled "${title}" contains ${textContent.split(/\s+/).filter(Boolean).length} words.`,
          sentiment,
          keywords: keywords.join(', ') || 'none',
          note: 'Local analysis. Use --cloud for AI-powered analysis.',
          durationMs: Date.now() - started,
        }, opts.format, opts.output)
        return
      }

      console.error(`Unknown agent-browser subcommand: ${subcommand}`)
      console.error('Available: check, screenshot, extract, analyze, health')
      process.exit(1)
    }

    console.error(`Unknown command: ${command}`)
    help()
    process.exit(1)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
