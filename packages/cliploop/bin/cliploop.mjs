#!/usr/bin/env node

const BASE_URL = process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'
const API_KEY = process.env.TALOCODE_API_KEY || ''

function help() {
  console.log(`
@talocode/cliploop — Programmatic video generation CLI

Usage:
  cliploop brief --prompt <text> [--channel <platform>] [--duration <s>] [--cloud] [--format json|text]
  cliploop script --brief-id <id> [--style <style>] [--cloud] [--format json|text]
  cliploop render --script-id <id> [--format <format>] [--quality <quality>] [--cloud]
  cliploop status --video-id <id> [--cloud]
  cliploop campaign --name <name> --platform <platform> [--schedule <iso>] [--cloud]
  cliploop --help

Options:
  --cloud                 Use Talocode Cloud API (requires TALOCODE_API_KEY)
  --format json|text      Output format (default: text)
  --help                  Show this help

Environment:
  TALOCODE_BASE_URL       API base URL (default: https://api.talocode.site)
  TALOCODE_API_KEY        API key for cloud mode
  MISTRAL_API_KEY         Mistral API key for local AI operations

Examples:
  cliploop brief --prompt "explain quantum computing" --channel youtube
  cliploop script --brief-id brief-abc123 --style educational
  cliploop render --script-id script-abc123 --format landscape --quality standard
  cliploop status --video-id render-abc123
  TALOCODE_API_KEY=sk_... cliploop --cloud brief -p "My video"
`.trim())
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { cloud: false, format: 'text', prompt: '', channel: '', duration: 0, briefId: '', style: '', scriptId: '', videoId: '', name: '', platform: '', schedule: '', quality: '' }
  const positional = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help') { help(); process.exit(0) }
    if (arg === '--cloud') { opts.cloud = true; continue }
    if (arg === '--format' && i + 1 < args.length) { opts.format = args[++i]; continue }
    if (arg === '-f' && i + 1 < args.length) { opts.format = args[++i]; continue }
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

function outputResult(label, data, format) {
  const text = format === 'json' ? JSON.stringify(data, null, 2) : formatOutput(label, data)
  console.log(text)
}

function formatOutput(label, data) {
  if (typeof data === 'string') return data
  const lines = [`── ${label} ──`]
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`)
    } else {
      lines.push(`  ${key}: ${value}`)
    }
  }
  return lines.join('\n')
}

// ─── Local engine ───

function callMistral(prompt) {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) return null
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
  }).then(r => r.json()).then(d => d.choices?.[0]?.message?.content || null).catch(() => null)
}

async function localBrief(prompt, channel, duration) {
  const aiPrompt = `Generate a video brief for topic: "${prompt}". Channel: ${channel || 'general'}. Duration: ${duration || 60}s. Output JSON with keys: id, brief, channel, estimatedDuration.`
  const ai = await callMistral(aiPrompt)
  if (ai) {
    try { const j = JSON.parse(ai.replace(/```(?:json)?/g, '').trim()); return j } catch {}
  }
  return { id: `brief-${Date.now()}`, brief: `Video concept: ${prompt}`, channel: channel || 'general', estimatedDuration: duration || 60 }
}

async function localScript(briefId, style) {
  const aiPrompt = `Generate a video script for brief "${briefId}". Style: ${style || 'storytelling'}. Output JSON with keys: id, script, scenes (array of {index, visual, narration, duration}).`
  const ai = await callMistral(aiPrompt)
  if (ai) {
    try { const j = JSON.parse(ai.replace(/```(?:json)?/g, '').trim()); return j } catch {}
  }
  return { id: `script-${Date.now()}`, script: `Script for brief ${briefId}`, scenes: [{ index: 1, visual: 'Opening scene', narration: 'Introduction', duration: 15 }] }
}

async function localRender(scriptId, format, quality) {
  return { id: `render-${Date.now()}`, status: 'rendering', url: null, duration: 0, creditsCharged: 0 }
}

async function localStatus(videoId) {
  return { id: videoId, status: 'completed', videoUrl: `https://cdn.talocode.site/cliploop/${videoId}.mp4`, thumbnailUrl: `https://cdn.talocode.site/cliploop/${videoId}.jpg` }
}

async function localCampaign(name, platform, schedule) {
  return { id: `campaign-${Date.now()}`, name, status: 'draft', videos: [] }
}

async function main() {
  const { positional, opts } = parseArgs()

  if (positional.length < 1) {
    help()
    process.exit(0)
  }

  const command = positional[0]
  let result

  try {
    if (command === 'brief') {
      if (!opts.prompt) { console.error('Error: --prompt is required'); process.exit(1) }
      result = opts.cloud
        ? await (await fetch(`${BASE_URL}/v1/cliploop/brief/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
            body: JSON.stringify({ prompt: opts.prompt, channel: opts.channel || undefined, duration: opts.duration || undefined }),
          })).json()
        : await localBrief(opts.prompt, opts.channel, opts.duration)
      outputResult('ClipLoop Brief', result, opts.format)
      return
    }

    if (command === 'script') {
      if (!opts.briefId) { console.error('Error: --brief-id is required'); process.exit(1) }
      result = opts.cloud
        ? await (await fetch(`${BASE_URL}/v1/cliploop/script/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
            body: JSON.stringify({ briefId: opts.briefId, style: opts.style || undefined }),
          })).json()
        : await localScript(opts.briefId, opts.style)
      outputResult('ClipLoop Script', result, opts.format)
      return
    }

    if (command === 'render') {
      if (!opts.scriptId) { console.error('Error: --script-id is required'); process.exit(1) }
      result = opts.cloud
        ? await (await fetch(`${BASE_URL}/v1/cliploop/video/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
            body: JSON.stringify({ scriptId: opts.scriptId, format: opts.format || undefined, quality: opts.quality || undefined }),
          })).json()
        : await localRender(opts.scriptId, opts.format, opts.quality)
      outputResult('ClipLoop Render', result, opts.format)
      return
    }

    if (command === 'status') {
      if (!opts.videoId) { console.error('Error: --video-id is required'); process.exit(1) }
      result = opts.cloud
        ? await (await fetch(`${BASE_URL}/v1/cliploop/video/${opts.videoId}`)).json()
        : await localStatus(opts.videoId)
      outputResult('ClipLoop Status', result, opts.format)
      return
    }

    if (command === 'campaign') {
      if (!opts.name || !opts.platform) { console.error('Error: --name and --platform are required'); process.exit(1) }
      result = opts.cloud
        ? await (await fetch(`${BASE_URL}/v1/cliploop/campaign/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
            body: JSON.stringify({ name: opts.name, platform: opts.platform, schedule: opts.schedule || undefined }),
          })).json()
        : await localCampaign(opts.name, opts.platform, opts.schedule)
      outputResult('ClipLoop Campaign', result, opts.format)
      return
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
