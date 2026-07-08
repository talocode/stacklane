export interface BriefInput {
  prompt: string
  channel?: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin'
  duration?: number
}

export interface BriefResult {
  id: string
  brief: string
  channel: string
  estimatedDuration: number
}

export interface ScriptInput {
  briefId: string
  style?: 'storytelling' | 'educational' | 'promotional' | 'entertaining'
}

export interface ScriptScene {
  index: number
  visual: string
  narration: string
  duration: number
}

export interface ScriptResult {
  id: string
  script: string
  scenes: ScriptScene[]
}

export interface RenderInput {
  scriptId: string
  format?: 'portrait' | 'landscape' | 'square'
  quality?: 'draft' | 'standard' | 'high'
}

export interface RenderResult {
  id: string
  status: 'rendering' | 'completed' | 'failed'
  url: string | null
  duration: number
  creditsCharged: number
}

export interface StatusResult {
  id: string
  status: 'processing' | 'completed' | 'failed'
  videoUrl: string | null
  thumbnailUrl: string | null
  error?: string
}

export interface CampaignInput {
  name: string
  platform: string
  schedule?: string
}

export interface CampaignResult {
  id: string
  name: string
  status: string
  videos: string[]
}

function callMistral(prompt: string): Promise<string | null> {
  const apiKey = typeof process !== 'undefined' ? process.env.MISTRAL_API_KEY : undefined
  if (!apiKey) return Promise.resolve(null)
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
  }).then(r => r.json()).then(d => d.choices?.[0]?.message?.content || null).catch(() => null)
}

function parseJSON(text: string): unknown {
  try { return JSON.parse(text.replace(/```(?:json)?/g, '').trim()) } catch { return null }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function generateBrief(input: BriefInput): Promise<BriefResult> {
  const prompt = `Generate a video brief for topic: "${input.prompt}". Channel: ${input.channel || 'general'}. Duration: ${input.duration || 60}s. Output valid JSON with keys: id (string), brief (string), channel (string), estimatedDuration (number).`
  const ai = await callMistral(prompt)
  if (ai) {
    const parsed = parseJSON(ai) as Record<string, unknown> | null
    if (parsed && typeof parsed.brief === 'string') {
      return { id: (parsed.id as string) || generateId('brief'), brief: parsed.brief as string, channel: (parsed.channel as string) || input.channel || 'general', estimatedDuration: (parsed.estimatedDuration as number) || input.duration || 60 }
    }
  }
  return { id: generateId('brief'), brief: `Video concept: ${input.prompt}`, channel: input.channel || 'general', estimatedDuration: input.duration || 60 }
}

export async function generateScript(input: ScriptInput): Promise<ScriptResult> {
  const prompt = `Generate a video script for brief "${input.briefId}". Style: ${input.style || 'storytelling'}. Output valid JSON with keys: id (string), script (string, full script text), scenes (array of {index: number, visual: string, narration: string, duration: number}).`
  const ai = await callMistral(prompt)
  if (ai) {
    const parsed = parseJSON(ai) as Record<string, unknown> | null
    if (parsed && typeof parsed.script === 'string') {
      return { id: (parsed.id as string) || generateId('script'), script: parsed.script as string, scenes: Array.isArray(parsed.scenes) ? parsed.scenes as ScriptScene[] : [{ index: 1, visual: 'Opening scene', narration: 'Introduction', duration: 15 }] }
    }
  }
  return { id: generateId('script'), script: `Script for brief ${input.briefId}`, scenes: [{ index: 1, visual: 'Opening scene', narration: 'Introduction', duration: 15 }] }
}

export async function submitRender(input: RenderInput): Promise<RenderResult> {
  return { id: generateId('render'), status: 'rendering', url: null, duration: 0, creditsCharged: 0 }
}

export async function getRenderStatus(id: string): Promise<StatusResult> {
  return { id, status: 'completed', videoUrl: `https://cdn.talocode.site/cliploop/${id}.mp4`, thumbnailUrl: `https://cdn.talocode.site/cliploop/${id}.jpg` }
}

export async function createCampaign(input: CampaignInput): Promise<CampaignResult> {
  return { id: generateId('campaign'), name: input.name, status: 'draft', videos: [] }
}

export async function packageCampaign(id: string): Promise<CampaignResult> {
  return { id, name: `Campaign ${id}`, status: 'packaged', videos: [] }
}
