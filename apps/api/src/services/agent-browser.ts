const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

export interface AgentBrowserCheckInput {
  url: string
  screenshot?: boolean
  vision?: boolean
  sessionId?: string
}

export interface AgentBrowserCheckResult {
  status: 'up' | 'down' | 'error'
  statusCode: number
  title?: string
  screenshot?: string
  vision?: string
  checks: { name: string; passed: boolean; detail?: string }[]
  durationMs: number
  url: string
  finalUrl?: string
  mode: 'http' | 'playwright' | 'proxy'
}

export interface AgentBrowserScreenshotInput {
  url: string
  fullPage?: boolean
  width?: number
  height?: number
  sessionId?: string
}

export interface AgentBrowserScreenshotResult {
  url: string
  screenshot: string
  width: number
  height: number
  durationMs: number
  mode: 'http' | 'playwright' | 'proxy'
  note?: string
}

export interface AgentBrowserEvidenceInput {
  url: string
  sessionId?: string
}

export interface AgentBrowserEvidenceResult {
  url: string
  statusCode: number
  title?: string
  headers: Record<string, string>
  contentType?: string
  bodyPreview?: string
  durationMs: number
  mode: 'http' | 'playwright' | 'proxy'
}

export interface AgentBrowserTraceReportInput {
  url: string
  sessionId?: string
  steps?: { action: string; selector?: string; value?: string }[]
}

export interface AgentBrowserTraceReportResult {
  url: string
  steps: number
  passed: number
  failed: number
  durationMs: number
  report: {
    markdown: string
    checks: { name: string; passed: boolean; detail?: string }[]
  }
  mode: 'http' | 'playwright' | 'proxy'
}

export function validatePublicUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL.')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error('URLs pointing to private IPs or localhost are not allowed.')
  }

  if (
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    throw new Error('URLs pointing to private IPs or localhost are not allowed.')
  }

  if (process.env.AGENT_BROWSER_ALLOW_LOCALHOST !== '1' && (hostname === 'localhost' || hostname.endsWith('.local'))) {
    throw new Error('URLs pointing to private IPs or localhost are not allowed.')
  }

  return parsed
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match?.[1]?.trim() || undefined
}

async function proxyToService(path: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const base = process.env.AGENT_BROWSER_SERVICE_URL?.replace(/\/+$/, '')
  if (!base) return null

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  })

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message = typeof payload.message === 'string' ? payload.message : `Agent Browser service error (${res.status})`
    throw new Error(message)
  }

  return payload
}

export async function runBrowserCheck(input: AgentBrowserCheckInput): Promise<AgentBrowserCheckResult> {
  const started = Date.now()
  validatePublicUrl(input.url)

  const proxied = await proxyToService('/v1/browser/check', {
    url: input.url,
    screenshot: input.screenshot,
    vision: input.vision,
    sessionId: input.sessionId,
  })
  if (proxied?.result) {
    const result = proxied.result as Record<string, unknown>
    return {
      status: result.status === 'pass' ? 'up' : result.status === 'fail' ? 'down' : 'error',
      statusCode: typeof result.statusCode === 'number' ? result.statusCode : 0,
      title: typeof result.title === 'string' ? result.title : undefined,
      checks: Array.isArray(result.checks)
        ? result.checks.map((check: Record<string, unknown>) => ({
            name: String(check.id ?? check.name ?? 'check'),
            passed: check.status === 'pass' || check.passed === true,
            detail: typeof check.message === 'string' ? check.message : typeof check.detail === 'string' ? check.detail : undefined,
          }))
        : [],
      durationMs: Date.now() - started,
      url: input.url,
      finalUrl: typeof result.finalUrl === 'string' ? result.finalUrl : input.url,
      mode: 'proxy',
    }
  }

  const res = await fetch(input.url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'Talocode-Agent-Browser/1.0 (+https://talocode.site)' },
  })

  const body = await res.text()
  const title = extractTitle(body)
  const checks = [
    {
      name: 'http_status',
      passed: res.status >= 200 && res.status < 400,
      detail: `HTTP ${res.status}`,
    },
    {
      name: 'html_title',
      passed: Boolean(title),
      detail: title ? `Title: ${title}` : 'No <title> element found',
    },
    {
      name: 'response_body',
      passed: body.length > 0,
      detail: `${body.length} bytes received`,
    },
  ]

  const status = checks.every((check) => check.passed)
    ? 'up'
    : checks.some((check) => check.name === 'http_status' && check.passed)
      ? 'error'
      : 'down'

  return {
    status,
    statusCode: res.status,
    title,
    checks,
    durationMs: Date.now() - started,
    url: input.url,
    finalUrl: res.url || input.url,
    mode: 'http',
    vision: input.vision ? 'Vision requires Playwright or AGENT_BROWSER_SERVICE_URL.' : undefined,
    screenshot: input.screenshot ? undefined : undefined,
  }
}

export async function runBrowserScreenshot(input: AgentBrowserScreenshotInput): Promise<AgentBrowserScreenshotResult> {
  const started = Date.now()
  validatePublicUrl(input.url)

  const proxied = await proxyToService('/v1/browser/screenshot', {
    url: input.url,
    sessionId: input.sessionId,
  })
  if (proxied?.result) {
    const result = proxied.result as Record<string, unknown>
    return {
      url: input.url,
      screenshot: typeof result.screenshot === 'string' ? result.screenshot : '',
      width: typeof result.width === 'number' ? result.width : input.width ?? 1280,
      height: typeof result.height === 'number' ? result.height : input.height ?? 720,
      durationMs: Date.now() - started,
      mode: 'proxy',
    }
  }

  throw new Error(
    'Screenshot capture requires Playwright. Set AGENT_BROWSER_SERVICE_URL to a Playwright-enabled Agent Browser host.',
  )
}

export async function runBrowserEvidence(input: AgentBrowserEvidenceInput): Promise<AgentBrowserEvidenceResult> {
  const started = Date.now()
  validatePublicUrl(input.url)

  const res = await fetch(input.url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'Talocode-Agent-Browser/1.0 (+https://talocode.site)' },
  })

  const headers: Record<string, string> = {}
  res.headers.forEach((value, key) => {
    headers[key] = value
  })

  const body = await res.text()

  return {
    url: input.url,
    statusCode: res.status,
    title: extractTitle(body),
    headers,
    contentType: headers['content-type'],
    bodyPreview: body.slice(0, 4000),
    durationMs: Date.now() - started,
    mode: 'http',
  }
}

// ─── Web Intelligence: Content Extraction ───

export interface AgentBrowserExtractInput {
  url: string
  includeImages?: boolean
  includeLinks?: boolean
  maxTextLength?: number
}

export interface AgentBrowserExtractResult {
  url: string
  finalUrl?: string
  title: string | null
  description: string | null
  language: string | null
  canonical: string | null
  ogImage: string | null
  ogType: string | null
  headings: { level: number; text: string }[]
  textContent: string
  links?: { href: string; text: string }[]
  images?: { src: string; alt: string }[]
  wordCount: number
  durationMs: number
  mode: 'http'
}

function extractMetaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${name}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractLanguage(html: string): string | null {
  const match = html.match(/<html[^>]*\slang=["']([^"']+)["']/i)
  return match?.[1] || null
}

function extractAllHeadings(html: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = []
  for (let i = 1; i <= 6; i++) {
    const regex = new RegExp(`<h${i}[^>]*>([^<]*)<\\/h${i}>`, 'gi')
    let match: RegExpExecArray | null
    while ((match = regex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').trim()
      if (text) headings.push({ level: i, text })
    }
  }
  return headings
}

function extractAllLinks(html: string, baseUrl: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = []
  const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim()
    const text = match[2].replace(/<[^>]+>/g, '').trim()
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const resolved = new URL(href, baseUrl).href
        links.push({ href: resolved, text: text || href })
      } catch { /* skip invalid URLs */ }
    }
  }
  return links
}

function extractAllImages(html: string, baseUrl: string): { src: string; alt: string }[] {
  const images: { src: string; alt: string }[] = []
  const regex = /<img[^>]*src=["']([^"']*)["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const src = match[1].trim()
    const altMatch = match[0].match(/alt=["']([^"']*)["']/i)
    const alt = altMatch?.[1]?.trim() || ''
    if (src && !src.startsWith('data:')) {
      try {
        const resolved = new URL(src, baseUrl).href
        images.push({ src: resolved, alt })
      } catch { /* skip invalid URLs */ }
    }
  }
  return images
}

function extractReadableText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function runBrowserExtract(input: AgentBrowserExtractInput): Promise<AgentBrowserExtractResult> {
  const started = Date.now()
  const parsed = validatePublicUrl(input.url)
  const maxText = input.maxTextLength ?? 50000

  const res = await fetch(input.url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'Talocode-Web-Intelligence/1.0 (+https://talocode.site)' },
  })

  const html = await res.text()
  const baseUrl = res.url || input.url
  const title = extractTitle(html) ?? extractMetaContent(html, 'title')
  const description = extractMetaContent(html, 'description')

  const headings = extractAllHeadings(html)
  let textContent = extractReadableText(html)
  if (textContent.length > maxText) textContent = textContent.slice(0, maxText) + '...'

  const result: AgentBrowserExtractResult = {
    url: input.url,
    finalUrl: baseUrl,
    title,
    description,
    language: extractLanguage(html),
    canonical: extractMetaContent(html, 'canonical'),
    ogImage: extractMetaContent(html, 'image'),
    ogType: extractMetaContent(html, 'type'),
    headings,
    textContent,
    wordCount: textContent.split(/\s+/).filter(Boolean).length,
    durationMs: Date.now() - started,
    mode: 'http',
  }

  if (input.includeLinks !== false) {
    result.links = extractAllLinks(html, baseUrl).slice(0, 200)
  }
  if (input.includeImages !== false) {
    result.images = extractAllImages(html, baseUrl).slice(0, 50)
  }

  return result
}

// ─── Web Intelligence: AI Analysis ───

export interface AgentBrowserAnalyzeInput {
  url: string
  analysis?: ('summary' | 'sentiment' | 'entities' | 'topics' | 'keywords')[]
  maxTextLength?: number
}

export interface AgentBrowserAnalyzeResult {
  url: string
  title: string | null
  description: string | null
  wordCount: number
  analysis: {
    summary?: string
    sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed'
    entities?: { name: string; type: string }[]
    topics?: string[]
    keywords?: string[]
  }
  durationMs: number
  mode: 'http'
  note?: string
}

export async function runBrowserAnalyze(input: AgentBrowserAnalyzeInput): Promise<AgentBrowserAnalyzeResult> {
  const started = Date.now()
  const parsed = validatePublicUrl(input.url)
  const types = input.analysis ?? ['summary', 'sentiment', 'topics', 'keywords']

  const extract = await runBrowserExtract({
    url: input.url,
    includeImages: false,
    includeLinks: false,
    maxTextLength: input.maxTextLength ?? 8000,
  })

  const content = extract.textContent.slice(0, 8000)

  const result: AgentBrowserAnalyzeResult = {
    url: input.url,
    title: extract.title,
    description: extract.description,
    wordCount: extract.wordCount,
    analysis: {},
    durationMs: Date.now() - started,
    mode: 'http',
  }

  // Use lightweight rule-based analysis when no AI provider is configured
  result.analysis = performLocalAnalysis(content, types, extract.title ?? '')

  if (!process.env.TALOCODE_API_KEY && !process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    result.note = 'AI-powered analysis requires an LLM provider key. Using rule-based analysis.'
  }

  return result
}

function performLocalAnalysis(
  content: string,
  types: string[],
  title: string,
): { summary?: string; sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed'; entities?: { name: string; type: string }[]; topics?: string[]; keywords?: string[] } {
  const analysis: { summary?: string; sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed'; entities?: { name: string; type: string }[]; topics?: string[]; keywords?: string[] } = {}

  if (types.includes('summary')) {
    analysis.summary = `Page titled "${title}" contains ${content.split(/\s+/).filter(Boolean).length} words of content. ` +
      `First sentence: "${content.split(/[.!?]/).filter(Boolean)[0]?.trim() ?? 'N/A'}"`
  }

  if (types.includes('sentiment')) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'best', 'success', 'positive', 'growth', 'profit', 'benefit', 'improve', 'breakthrough']
    const negativeWords = ['bad', 'worst', 'fail', 'failure', 'loss', 'risk', 'danger', 'crisis', 'decline', 'problem', 'error', 'threat']
    const words = content.toLowerCase().split(/\s+/)
    const posCount = words.filter(w => positiveWords.includes(w)).length
    const negCount = words.filter(w => negativeWords.includes(w)).length
    if (posCount > negCount * 1.5) analysis.sentiment = 'positive'
    else if (negCount > posCount * 1.5) analysis.sentiment = 'negative'
    else if (posCount > 0 && negCount > 0) analysis.sentiment = 'mixed'
    else analysis.sentiment = 'neutral'
  }

  if (types.includes('keywords')) {
    const wordFreq: Record<string, number> = {}
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
    analysis.keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word)
  }

  if (types.includes('topics')) {
    const topicKeywords: Record<string, string[]> = {
      technology: ['software', 'hardware', 'app', 'digital', 'data', 'code', 'api', 'cloud', 'ai', 'ml', 'algorithm'],
      business: ['market', 'revenue', 'profit', 'customer', 'product', 'service', 'sales', 'strategy', 'growth'],
      finance: ['stock', 'trade', 'invest', 'bank', 'crypto', 'currency', 'fund', 'asset', 'portfolio', 'risk'],
      health: ['medical', 'health', 'patient', 'treatment', 'drug', 'hospital', 'doctor', 'disease', 'therapy'],
      education: ['learn', 'course', 'student', 'teacher', 'school', 'university', 'training', 'skill'],
      news: ['report', 'today', 'breaking', 'update', 'source', 'announce', 'statement', 'officials'],
    }
    const words = content.toLowerCase().split(/\s+/)
    const scores: Record<string, number> = {}
    for (const [topic, kws] of Object.entries(topicKeywords)) {
      scores[topic] = words.filter(w => kws.includes(w)).length
    }
    analysis.topics = Object.entries(scores)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 5)
  }

  if (types.includes('entities')) {
    // Simple entity extraction: find capitalized multi-word phrases
    const entityRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g
    const entitySet = new Set<string>()
    let entityMatch: RegExpExecArray | null
    while ((entityMatch = entityRegex.exec(content)) !== null) {
      entitySet.add(entityMatch[1])
    }
    analysis.entities = Array.from(entitySet).slice(0, 20).map(name => ({ name, type: guessEntityType(name) }))
  }

  return analysis
}

function guessEntityType(name: string): string {
  const orgSuffixes = ['Inc', 'Corp', 'Ltd', 'LLC', 'Technologies', 'Group', 'Company', 'Enterprises', 'Systems', 'Global']
  if (orgSuffixes.some(s => name.endsWith(s))) return 'organization'
  const personPattern = /^[A-Z][a-z]+ [A-Z][a-z]+$/
  if (personPattern.test(name)) return 'person'
  return 'other'
}

export async function runBrowserTraceReport(input: AgentBrowserTraceReportInput): Promise<AgentBrowserTraceReportResult> {
  const started = Date.now()
  validatePublicUrl(input.url)

  const check = await runBrowserCheck({ url: input.url, sessionId: input.sessionId })
  const evidence = await runBrowserEvidence({ url: input.url, sessionId: input.sessionId })
  const customSteps = input.steps ?? [{ action: 'navigate', value: input.url }]

  const passed = check.checks.filter((item) => item.passed).length
  const failed = check.checks.length - passed
  const markdown = [
    '# Agent Browser Trace Report',
    '',
    `- URL: ${input.url}`,
    `- Status: ${check.status} (${check.statusCode})`,
    `- Mode: ${check.mode}`,
    `- Duration: ${Date.now() - started}ms`,
    '',
    '## Checks',
    ...check.checks.map((item) => `- [${item.passed ? 'x' : ' '}] ${item.name}: ${item.detail ?? ''}`),
    '',
    '## Evidence',
    `- Content-Type: ${evidence.contentType ?? 'unknown'}`,
    `- Title: ${evidence.title ?? 'n/a'}`,
    '',
    '## Steps',
    ...customSteps.map((step, index) => `${index + 1}. ${step.action}${step.selector ? ` (${step.selector})` : ''}${step.value ? ` → ${step.value}` : ''}`),
  ].join('\n')

  return {
    url: input.url,
    steps: customSteps.length + check.checks.length,
    passed,
    failed,
    durationMs: Date.now() - started,
    report: { markdown, checks: check.checks },
    mode: check.mode,
  }
}