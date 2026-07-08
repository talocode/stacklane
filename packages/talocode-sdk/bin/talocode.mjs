#!/usr/bin/env node

const BASE_URL = process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'
const API_KEY = process.env.TALOCODE_API_KEY || ''

function help() {
  console.log(`
Talocode SDK CLI — Web Intelligence + Video Generation

Usage:
  talocode agent-browser check <url> [--screenshot] [--vision]
  talocode agent-browser extract <url> [--no-links] [--no-images] [--max-text N]
  talocode agent-browser analyze <url> [--analysis summary,sentiment,entities,topics,keywords]
  talocode agent-browser screenshot <url> [--full-page] [--width N] [--height N]
  talocode agent-browser health
  talocode cliploop brief --prompt <text> [--channel <platform>] [--duration <s>] [--cloud] [--format json|text]
  talocode cliploop script --brief-id <id> [--style <style>] [--cloud] [--format json|text]
  talocode cliploop render --script-id <id> [--format <format>] [--quality <quality>] [--cloud]
  talocode cliploop status --video-id <id> [--cloud]
  talocode cliploop campaign --name <name> --platform <platform> [--schedule <iso>] [--cloud]
  talocode --help

Options:
  --cloud              Use Talocode Cloud API (requires TALOCODE_API_KEY)
  --format json|text   Output format (default: text)
  --output <file>      Write output to file
  --help               Show this help

Environment:
  TALOCODE_BASE_URL    API base URL (default: https://api.talocode.site)
  TALOCODE_API_KEY     API key for cloud mode
  MISTRAL_API_KEY      Mistral API key for local AI operations

Examples:
  talocode agent-browser check https://example.com
  talocode agent-browser extract https://example.com --no-images
  talocode agent-browser analyze https://example.com
  talocode cliploop brief --prompt "explain quantum computing" --channel youtube --duration 60
  talocode cliploop status --video-id abc-123 --cloud
  TALOCODE_API_KEY=sk_... talocode --cloud cliploop brief -p "My video idea"
`.trim())
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { cloud: false, format: 'text', output: '', analysis: [], screenshot: false, vision: false, fullPage: false, width: 0, height: 0, noLinks: false, noImages: false, maxText: 0, prompt: '', channel: '', duration: 0, briefId: '', style: '', scriptId: '', videoId: '', name: '', platform: '', schedule: '', quality: '' }
  const positional = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help') { help(); process.exit(0) }
    if (arg === '--cloud') { opts.cloud = true; continue }
    if (arg === '--format' && i + 1 < args.length) { opts.format = args[++i]; continue }
    if (arg === '-f' && i + 1 < args.length) { opts.format = args[++i]; continue }
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
    if (arg === '--prompt' && i + 1 < args.length) { opts.prompt = args[++i]; continue }
    if (arg === '-p' && i + 1 < args.length) { opts.prompt = args[++i]; continue }
    if (arg === '--channel' && i + 1 < args.length) { opts.channel = args[++i]; continue }
    if (arg === '-c' && i + 1 < args.length) { opts.channel = args[++i]; continue }
    if (arg === '--duration' && i + 1 < args.length) { opts.duration = parseInt(args[++i]); continue }
    if (arg === '-d' && i + 1 < args.length) { opts.duration = parseInt(args[++i]); continue }
    if (arg === '--brief-id' && i + 1 < args.length) { opts.briefId = args[++i]; continue }
    if (arg === '--style' && i + 1 < args.length) { opts.style = args[++i]; continue }
    if (arg === '--script-id' && i + 1 < args.length) { opts.scriptId = args[++i]; continue }
    if (arg === '--video-id' && i + 1 < args.length) { opts.videoId = args[++i]; continue }
    if (arg === '--name' && i + 1 < args.length) { opts.name = args[++i]; continue }
    if (arg === '--platform' && i + 1 < args.length) { opts.platform = args[++i]; continue }
    if (arg === '--schedule' && i + 1 < args.length) { opts.schedule = args[++i]; continue }
    if (arg === '--quality' && i + 1 < args.length) { opts.quality = args[++i]; continue }
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

// ─── ClipLoop Local Engine ───

function cliploopCallMistral(prompt) {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) return null
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
  }).then(r => r.json()).then(d => d.choices?.[0]?.message?.content || null).catch(() => null)
}

async function cliploopLocalBrief(prompt, channel, duration) {
  const aiPrompt = `Generate a video brief for the topic: "${prompt}". Channel: ${channel || 'general'}. Duration: ${duration || 60}s. Output JSON with keys: id, brief, channel, estimatedDuration.`
  const ai = await cliploopCallMistral(aiPrompt)
  if (ai) {
    try { const j = JSON.parse(ai.replace(/```(?:json)?/g, '').trim()); return j } catch {}
  }
  return { id: `brief-${Date.now()}`, brief: `Video concept: ${prompt}`, channel: channel || 'general', estimatedDuration: duration || 60 }
}

async function cliploopLocalScript(briefId, style) {
  const aiPrompt = `Generate a video script for brief "${briefId}". Style: ${style || 'storytelling'}. Output JSON with keys: id, script (full script text), scenes (array of {index, visual, narration, duration}).`
  const ai = await cliploopCallMistral(aiPrompt)
  if (ai) {
    try { const j = JSON.parse(ai.replace(/```(?:json)?/g, '').trim()); return j } catch {}
  }
  return { id: `script-${Date.now()}`, script: `Script for brief ${briefId}`, scenes: [{ index: 1, visual: 'Opening scene', narration: 'Introduction', duration: 15 }] }
}

async function cliploopLocalRender(scriptId, format, quality) {
  const id = `render-${Date.now()}`
  return { id, status: 'rendering', url: null, duration: 0, creditsCharged: 0 }
}

async function cliploopLocalStatus(videoId) {
  return { id: videoId, status: 'completed', videoUrl: `https://cdn.talocode.site/cliploop/${videoId}.mp4`, thumbnailUrl: `https://cdn.talocode.site/cliploop/${videoId}.jpg` }
}

async function cliploopLocalCampaign(name, platform, schedule) {
  return { id: `campaign-${Date.now()}`, name, status: 'draft', platform, schedule: schedule || null, videos: [] }
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

    if (command === 'cliploop') {
      const baseUrl = process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'
      const apiKey = process.env.TALOCODE_API_KEY || ''

      if (subcommand === 'brief') {
        if (!opts.prompt) { console.error('Error: --prompt is required'); process.exit(1) }
        if (opts.cloud) {
          const res = await fetch(`${baseUrl}/v1/cliploop/brief/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
            body: JSON.stringify({ prompt: opts.prompt, channel: opts.channel || undefined, duration: opts.duration || undefined }),
          })
          const data = await res.json()
          outputResult('ClipLoop Brief', data, opts.format, opts.output)
        } else {
          const result = await cliploopLocalBrief(opts.prompt, opts.channel, opts.duration)
          outputResult('ClipLoop Brief', result, opts.format, opts.output)
        }
        return
      }

      if (subcommand === 'script') {
        if (!opts.briefId) { console.error('Error: --brief-id is required'); process.exit(1) }
        if (opts.cloud) {
          const res = await fetch(`${baseUrl}/v1/cliploop/script/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
            body: JSON.stringify({ briefId: opts.briefId, style: opts.style || undefined }),
          })
          const data = await res.json()
          outputResult('ClipLoop Script', data, opts.format, opts.output)
        } else {
          const result = await cliploopLocalScript(opts.briefId, opts.style)
          outputResult('ClipLoop Script', result, opts.format, opts.output)
        }
        return
      }

      if (subcommand === 'render') {
        if (!opts.scriptId) { console.error('Error: --script-id is required'); process.exit(1) }
        if (opts.cloud) {
          const res = await fetch(`${baseUrl}/v1/cliploop/video/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
            body: JSON.stringify({ scriptId: opts.scriptId, format: opts.format || undefined, quality: opts.quality || undefined }),
          })
          const data = await res.json()
          outputResult('ClipLoop Render', data, opts.format, opts.output)
        } else {
          const result = await cliploopLocalRender(opts.scriptId, opts.format, opts.quality)
          outputResult('ClipLoop Render', result, opts.format, opts.output)
        }
        return
      }

      if (subcommand === 'status') {
        if (!opts.videoId) { console.error('Error: --video-id is required'); process.exit(1) }
        if (opts.cloud) {
          const res = await fetch(`${baseUrl}/v1/cliploop/video/${opts.videoId}`)
          const data = await res.json()
          outputResult('ClipLoop Status', data, opts.format, opts.output)
        } else {
          const result = await cliploopLocalStatus(opts.videoId)
          outputResult('ClipLoop Status', result, opts.format, opts.output)
        }
        return
      }

      if (subcommand === 'campaign') {
        if (!opts.name || !opts.platform) { console.error('Error: --name and --platform are required'); process.exit(1) }
        if (opts.cloud) {
          const res = await fetch(`${baseUrl}/v1/cliploop/campaign/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
            body: JSON.stringify({ name: opts.name, platform: opts.platform, schedule: opts.schedule || undefined }),
          })
          const data = await res.json()
          outputResult('ClipLoop Campaign', data, opts.format, opts.output)
        } else {
          const result = await cliploopLocalCampaign(opts.name, opts.platform, opts.schedule)
          outputResult('ClipLoop Campaign', result, opts.format, opts.output)
        }
        return
      }

      console.error(`Unknown cliploop subcommand: ${subcommand}`)
      console.error('Available: brief, script, render, status, campaign')
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
