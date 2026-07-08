import { randomUUID } from 'node:crypto'

const MOCK_ENABLED = process.env.CLIPLOOP_ALLOW_MOCK_PROVIDER === 'true'
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest'

export interface ClipLoopBriefInput {
  prompt: string
  channel?: string
  duration?: number
}

export interface ClipLoopBriefResult {
  id: string
  title: string
  channel: string
  duration: number
  hook: string
  structure: string[]
  tone: string
  targetAudience: string
}

export interface ClipLoopScriptInput {
  briefId: string
  style?: string
}

export interface ClipLoopScriptScene {
  index: number
  visual: string
  narration: string
  duration: number
}

export interface ClipLoopScriptResult {
  id: string
  briefId: string
  title: string
  scenes: ClipLoopScriptScene[]
  fullScript: string
  estimatedDuration: number
}

export interface ClipLoopVideoRenderInput {
  scriptId: string
  format?: 'portrait' | 'landscape' | 'square'
  quality?: 'draft' | 'standard' | 'high'
}

export interface ClipLoopVideoRenderResult {
  id: string
  status: 'processing' | 'completed' | 'failed'
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: number
  format: string
}

export interface ClipLoopVideoStatusResult {
  id: string
  status: 'processing' | 'completed' | 'failed'
  videoUrl: string | null
  thumbnailUrl: string | null
  error?: string
}

export interface ClipLoopCampaignCreateInput {
  name: string
  platform: string
  schedule?: string
}

export interface ClipLoopCampaignResult {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'active' | 'completed'
  platform: string
  scheduledAt?: string
  videoCount: number
  packageUrl?: string
}

const renderJobs = new Map<string, ClipLoopVideoRenderResult>()
const campaigns = new Map<string, ClipLoopCampaignResult>()
const briefs = new Map<string, ClipLoopBriefResult>()
const scripts = new Map<string, ClipLoopScriptResult>()

async function callClipLoopLlm(systemInstruction: string, userContent: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey) {
    if (MOCK_ENABLED) {
      return mockClipLoopResponse(systemInstruction, userContent)
    }
    throw new Error('No AI provider configured. Set MISTRAL_API_KEY or CLIPLOOP_ALLOW_MOCK_PROVIDER=true for development.')
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new Error(`Mistral API returned status ${response.status}: ${errorBody.slice(0, 200)}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (typeof content === 'string') return content.trim()
    if (Array.isArray(content)) return content.map((c: unknown) => (typeof c === 'string' ? c : (c as { text?: string }).text || '')).join('').trim()

    throw new Error('Mistral API returned empty response')
  } catch (err) {
    if (err instanceof Error && (err.message.startsWith('Mistral API returned') || err.message.startsWith('No AI provider'))) {
      throw err
    }
    throw new Error('ClipLoop LLM request failed.')
  }
}

function mockClipLoopResponse(_systemInstruction: string, _userContent: string): string {
  return JSON.stringify({
    mock: true,
    note: 'This is a mock response because CLIPLOOP_ALLOW_MOCK_PROVIDER=true.',
  })
}

function extractJson<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse LLM response as JSON.')
  try {
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    throw new Error('Failed to parse LLM response as JSON.')
  }
}

function generateBriefSystemPrompt(): string {
  return `You are the ClipLoop AI — a video content strategy engine. You generate structured content briefs for short-form video.

CORE RULES:
- Return ONLY valid JSON. No markdown fences, no explanatory text.
- Do not mention AI model providers in your output.
- The product is ClipLoop.

Given a prompt, channel, and optional duration, generate a content brief with:
- title: A catchy title for the video
- channel: The target platform (youtube, tiktok, instagram, linkedin, twitter)
- duration: Target duration in seconds
- hook: An attention-grabbing opening hook (1-2 sentences)
- structure: Array of 3-6 section headings that form the video structure
- tone: The overall tone (e.g. casual, professional, humorous, educational)
- targetAudience: Brief description of the target audience`
}

function generateScriptSystemPrompt(): string {
  return `You are the ClipLoop AI — a video script generation engine. You generate detailed, scene-by-scene video scripts.

CORE RULES:
- Return ONLY valid JSON. No markdown fences, no explanatory text.
- Do not mention AI model providers in your output.
- The product is ClipLoop.

Given a brief and optional style, generate a full script with:
- title: The video title
- scenes: Array of scene objects, each with:
  - index: Scene number (0-based)
  - visual: Description of what appears on screen
  - narration: The spoken script for this scene
  - duration: Duration in seconds
- fullScript: The complete narration text concatenated
- estimatedDuration: Total estimated duration in seconds

Style can be: storytelling, educational, promotional, entertaining`
}

function generateCampaignSystemPrompt(): string {
  return `You are the ClipLoop AI — a video campaign planning engine.

CORE RULES:
- Return ONLY valid JSON. No markdown fences, no explanatory text.
- Do not mention AI model providers in your output.
- The product is ClipLoop.

Given a campaign name, platform, and optional schedule, generate campaign metadata.`
}

export async function generateBrief(input: ClipLoopBriefInput): Promise<ClipLoopBriefResult> {
  const prompt = input.prompt.trim()
  if (!prompt) throw new Error('prompt is required.')

  const channel = input.channel || 'youtube'
  const duration = input.duration || 60

  const systemPrompt = generateBriefSystemPrompt()
  const userContent = JSON.stringify({ prompt, channel, duration })

  if (MOCK_ENABLED) {
    const id = 'brief_' + randomUUID().slice(0, 12)
    const result: ClipLoopBriefResult = {
      id,
      title: `Mock: ${prompt.slice(0, 40)}`,
      channel,
      duration,
      hook: `Mock hook for "${prompt.slice(0, 60)}"`,
      structure: ['Introduction', 'Main Point 1', 'Main Point 2', 'Conclusion'],
      tone: 'casual',
      targetAudience: 'General audience interested in this topic',
    }
    briefs.set(id, result)
    return result
  }

  const raw = await callClipLoopLlm(systemPrompt, userContent)
  const parsed = extractJson<{
    title: string
    channel: string
    duration: number
    hook: string
    structure: string[]
    tone: string
    targetAudience: string
  }>(raw)

  const result: ClipLoopBriefResult = {
    id: 'brief_' + randomUUID().slice(0, 12),
    title: parsed.title || prompt.slice(0, 60),
    channel: parsed.channel || channel,
    duration: parsed.duration || duration,
    hook: parsed.hook || '',
    structure: Array.isArray(parsed.structure) ? parsed.structure : [],
    tone: parsed.tone || 'neutral',
    targetAudience: parsed.targetAudience || '',
  }

  briefs.set(result.id, result)
  return result
}

export async function generateScript(input: ClipLoopScriptInput): Promise<ClipLoopScriptResult> {
  if (!input.briefId) throw new Error('briefId is required.')

  const brief = briefs.get(input.briefId)
  const style = input.style || 'storytelling'

  if (MOCK_ENABLED) {
    const id = 'script_' + randomUUID().slice(0, 12)
    const scenes: ClipLoopScriptScene[] = [
      { index: 0, visual: 'Opening shot', narration: 'Mock opening narration', duration: 10 },
      { index: 1, visual: 'Main content visualization', narration: 'Mock main content', duration: 20 },
      { index: 2, visual: 'Closing shot', narration: 'Mock closing', duration: 10 },
    ]
    const result: ClipLoopScriptResult = {
      id,
      briefId: input.briefId,
      title: brief?.title || 'Mock Video',
      scenes,
      fullScript: scenes.map(s => s.narration).join(' '),
      estimatedDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
    }
    scripts.set(id, result)
    return result
  }

  const systemPrompt = generateScriptSystemPrompt()
  const userContent = JSON.stringify({
    brief: brief ? { title: brief.title, hook: brief.hook, structure: brief.structure, tone: brief.tone } : { title: 'Untitled' },
    style,
  })

  const raw = await callClipLoopLlm(systemPrompt, userContent)
  const parsed = extractJson<{
    title: string
    scenes: Array<{ index: number; visual: string; narration: string; duration: number }>
    fullScript: string
    estimatedDuration: number
  }>(raw)

  const scenes = (Array.isArray(parsed.scenes) ? parsed.scenes : []).map((s, i) => ({
    index: s.index ?? i,
    visual: s.visual || '',
    narration: s.narration || '',
    duration: typeof s.duration === 'number' && s.duration > 0 ? s.duration : 10,
  }))

  const estimatedDuration = scenes.reduce((sum, s) => sum + s.duration, 0)

  const result: ClipLoopScriptResult = {
    id: 'script_' + randomUUID().slice(0, 12),
    briefId: input.briefId,
    title: parsed.title || brief?.title || 'Untitled',
    scenes,
    fullScript: parsed.fullScript || scenes.map(s => s.narration).join('\n'),
    estimatedDuration: parsed.estimatedDuration || estimatedDuration,
  }

  scripts.set(result.id, result)
  return result
}

export async function submitRender(input: ClipLoopVideoRenderInput): Promise<ClipLoopVideoRenderResult> {
  if (!input.scriptId) throw new Error('scriptId is required.')

  const script = scripts.get(input.scriptId)
  if (!script) throw new Error(`Script not found: ${input.scriptId}`)

  const format = input.format || 'portrait'
  const quality = input.quality || 'standard'
  const id = 'render_' + randomUUID().slice(0, 12)

  const render: ClipLoopVideoRenderResult = {
    id,
    status: 'processing',
    videoUrl: null,
    thumbnailUrl: null,
    duration: script.estimatedDuration,
    format,
  }

  renderJobs.set(id, render)

  simulateRenderCompletion(id, script.estimatedDuration)

  return render
}

function simulateRenderCompletion(renderId: string, duration: number) {
  const processingTime = Math.max(2000, Math.random() * 5000)
  setTimeout(() => {
    const job = renderJobs.get(renderId)
    if (!job) return
    job.status = 'completed'
    job.videoUrl = `https://cdn.cliploop.talocode.site/renders/${renderId}.mp4`
    job.thumbnailUrl = `https://cdn.cliploop.talocode.site/thumbnails/${renderId}.jpg`
  }, processingTime)
}

export async function getRenderStatus(renderId: string): Promise<ClipLoopVideoStatusResult> {
  if (!renderId) throw new Error('renderId is required.')

  const job = renderJobs.get(renderId)
  if (!job) throw new Error(`Render job not found: ${renderId}`)

  return {
    id: job.id,
    status: job.status,
    videoUrl: job.videoUrl,
    thumbnailUrl: job.thumbnailUrl,
    error: job.status === 'failed' ? 'Render failed due to an internal error.' : undefined,
  }
}

export async function createCampaign(input: ClipLoopCampaignCreateInput): Promise<ClipLoopCampaignResult> {
  const name = input.name.trim()
  if (!name) throw new Error('name is required.')
  if (!input.platform) throw new Error('platform is required.')

  const id = 'camp_' + randomUUID().slice(0, 12)

  if (MOCK_ENABLED) {
    const result: ClipLoopCampaignResult = {
      id,
      name,
      status: 'draft',
      platform: input.platform,
      scheduledAt: input.schedule || undefined,
      videoCount: 0,
    }
    campaigns.set(id, result)
    return result
  }

  const systemPrompt = generateCampaignSystemPrompt()
  const userContent = JSON.stringify({
    name,
    platform: input.platform,
    schedule: input.schedule || null,
  })

  const raw = await callClipLoopLlm(systemPrompt, userContent)
  const parsed = extractJson<{
    platform: string
    scheduledAt?: string
    videoCount?: number
  }>(raw)

  const result: ClipLoopCampaignResult = {
    id,
    name,
    status: 'draft',
    platform: parsed.platform || input.platform,
    scheduledAt: parsed.scheduledAt || input.schedule || undefined,
    videoCount: parsed.videoCount ?? 0,
  }

  campaigns.set(id, result)
  return result
}

export async function packageCampaign(campaignId: string): Promise<ClipLoopCampaignResult> {
  if (!campaignId) throw new Error('campaignId is required.')

  const campaign = campaigns.get(campaignId)
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`)

  campaign.status = 'completed'
  campaign.packageUrl = `https://cdn.cliploop.talocode.site/packages/${campaignId}.zip`
  campaign.videoCount = Math.max(campaign.videoCount, 1)

  return { ...campaign }
}

export function resetInMemoryStore() {
  renderJobs.clear()
  campaigns.clear()
  briefs.clear()
  scripts.clear()
}
