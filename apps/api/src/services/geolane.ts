/**
 * GeoLane — AI Search Visibility Intelligence API (v0.1)
 *
 * Pay-per-domain intelligence for agents and developers:
 * - Full GEO audit (score + actions)
 * - AI crawler access (robots.txt)
 * - Citation readiness (passage structure, schema, E-E-A-T signals)
 * - llms.txt generate / score
 * - Domain compare
 *
 * Deterministic intelligence engine — no ML required for v0.1.
 */

export const GEOLANE_VERSION = '0.1.0'

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

/** Major AI / search crawlers agents care about */
export const AI_CRAWLERS = [
  { name: 'GPTBot', company: 'OpenAI', paths: ['GPTBot'] },
  { name: 'ChatGPT-User', company: 'OpenAI', paths: ['ChatGPT-User'] },
  { name: 'OAI-SearchBot', company: 'OpenAI', paths: ['OAI-SearchBot'] },
  { name: 'ClaudeBot', company: 'Anthropic', paths: ['ClaudeBot', 'anthropic-ai'] },
  { name: 'anthropic-ai', company: 'Anthropic', paths: ['anthropic-ai'] },
  { name: 'PerplexityBot', company: 'Perplexity', paths: ['PerplexityBot'] },
  { name: 'Google-Extended', company: 'Google', paths: ['Google-Extended'] },
  { name: 'Googlebot', company: 'Google', paths: ['Googlebot'] },
  { name: 'Bingbot', company: 'Microsoft', paths: ['bingbot', 'Bingbot'] },
  { name: 'Applebot-Extended', company: 'Apple', paths: ['Applebot-Extended', 'Applebot'] },
  { name: 'Bytespider', company: 'ByteDance', paths: ['Bytespider'] },
  { name: 'CCBot', company: 'Common Crawl', paths: ['CCBot'] },
  { name: 'Amazonbot', company: 'Amazon', paths: ['Amazonbot'] },
  { name: 'meta-externalagent', company: 'Meta', paths: ['meta-externalagent', 'FacebookBot'] },
  { name: 'cohere-ai', company: 'Cohere', paths: ['cohere-ai'] },
  { name: 'Diffbot', company: 'Diffbot', paths: ['Diffbot'] },
] as const

export interface ActionItem {
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  detail: string
  impact: number
}

export interface CrawlerAccessResult {
  bot: string
  company: string
  allowed: boolean
  rule: string
  note?: string
}

export interface CitationReadinessResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  signals: {
    hasTitle: boolean
    hasMetaDescription: boolean
    hasH1: boolean
    hasCanonical: boolean
    hasJsonLd: boolean
    hasAuthor: boolean
    hasDate: boolean
    hasFaq: boolean
    wordCount: number
    avgPassageWords: number
    passageInMagicRange: boolean
    headingDepth: number
    internalLinks: number
    externalLinks: number
  }
  strengths: string[]
  gaps: string[]
  recommendations: string[]
}

export interface LlmsTxtResult {
  exists: boolean
  url: string
  score: number
  issues: string[]
  draft: string
  current?: string
}

export interface GeoAuditResult {
  url: string
  domain: string
  finalUrl?: string
  statusCode: number
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string
  crawlers: {
    allowed: number
    blocked: number
    total: number
    accessRate: number
    details: CrawlerAccessResult[]
  }
  citation: CitationReadinessResult
  llmsTxt: LlmsTxtResult
  technical: {
    https: boolean
    hasRobotsTxt: boolean
    hasSitemap: boolean
    hasLlmsTxt: boolean
    contentType?: string
    title?: string
    description?: string
    language?: string
    jsonLdTypes: string[]
  }
  actions: ActionItem[]
  durationMs: number
  engine: 'rules'
  version: string
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
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
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new Error('URLs pointing to private IPs or localhost are not allowed.')
  }
  return parsed
}

async function fetchText(
  url: string,
  options?: { timeoutMs?: number; maxBytes?: number; accept?: string },
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string; contentType?: string }> {
  const timeoutMs = options?.timeoutMs ?? 12000
  const maxBytes = options?.maxBytes ?? 1_500_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'TalocodeGeoLane/0.1 (+https://talocode.site; AI-visibility-audit)',
        accept: options?.accept ?? 'text/html,application/xhtml+xml,text/plain,*/*;q=0.8',
      },
    })
    const contentType = res.headers.get('content-type') || undefined
    const buf = new Uint8Array(await res.arrayBuffer())
    const slice = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf
    const text = new TextDecoder('utf-8', { fatal: false }).decode(slice)
    return {
      ok: res.ok,
      status: res.status,
      text,
      finalUrl: res.url || url,
      contentType,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed'
    throw new Error(`Failed to fetch ${url}: ${message}`)
  } finally {
    clearTimeout(timer)
  }
}

/** Parse robots.txt allow/disallow for a specific bot */
export function parseRobotsForBot(robotsTxt: string, botName: string): CrawlerAccessResult {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim())
  const agents: { agent: string; rules: { type: 'allow' | 'disallow'; path: string }[] }[] = []
  let current: { agent: string; rules: { type: 'allow' | 'disallow'; path: string }[] } | null = null

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const ua = line.match(/^user-agent:\s*(.+)$/i)
    if (ua) {
      current = { agent: ua[1].trim(), rules: [] }
      agents.push(current)
      continue
    }
    if (!current) continue
    const disallow = line.match(/^disallow:\s*(.*)$/i)
    if (disallow) {
      current.rules.push({ type: 'disallow', path: (disallow[1] || '').trim() })
      continue
    }
    const allow = line.match(/^allow:\s*(.*)$/i)
    if (allow) {
      current.rules.push({ type: 'allow', path: (allow[1] || '').trim() })
    }
  }

  const botLower = botName.toLowerCase()
  const specific = agents.filter((a) => a.agent.toLowerCase() === botLower)
  const wildcard = agents.filter((a) => a.agent === '*')
  const group = specific.length > 0 ? specific : wildcard

  if (group.length === 0) {
    return {
      bot: botName,
      company: AI_CRAWLERS.find((c) => c.name === botName)?.company || 'unknown',
      allowed: true,
      rule: 'no matching user-agent (default allow)',
    }
  }

  // If any group has Disallow: / with no Allow: / override → blocked for root
  let blockedRoot = false
  let rule = 'allowed'
  for (const g of group) {
    for (const r of g.rules) {
      if (r.type === 'disallow' && (r.path === '/' || r.path === '/*')) {
        blockedRoot = true
        rule = `Disallow: ${r.path}`
      }
      if (r.type === 'allow' && (r.path === '/' || r.path === '' || r.path === '/*')) {
        blockedRoot = false
        rule = `Allow: ${r.path || '/'}`
      }
    }
    // Disallow: with empty path means allow all in some parsers — ignore empty disallow
    const hasFullBlock = g.rules.some((r) => r.type === 'disallow' && r.path === '/')
    const hasFullAllow = g.rules.some((r) => r.type === 'allow' && (r.path === '/' || r.path === ''))
    if (hasFullBlock && !hasFullAllow) {
      blockedRoot = true
      rule = 'Disallow: /'
    }
  }

  return {
    bot: botName,
    company: AI_CRAWLERS.find((c) => c.name === botName)?.company || 'unknown',
    allowed: !blockedRoot,
    rule,
    note: specific.length === 0 ? 'matched User-agent: *' : undefined,
  }
}

export function analyzeCitationReadiness(html: string, pageUrl: string): CitationReadinessResult {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch?.[1]?.trim() || ''
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const description = descMatch?.[1]?.trim() || ''
  const hasH1 = /<h1[\s>]/i.test(html)
  const hasCanonical = /rel=["']canonical["']/i.test(html)
  const hasJsonLd = /application\/ld\+json/i.test(html)
  const hasAuthor =
    /rel=["']author["']/i.test(html) ||
    /itemprop=["']author["']/i.test(html) ||
    /property=["']article:author["']/i.test(html) ||
    /name=["']author["']/i.test(html)
  const hasDate =
    /property=["']article:published_time["']/i.test(html) ||
    /itemprop=["']datePublished["']/i.test(html) ||
    /datetime=["']\d{4}-\d{2}/i.test(html)
  const hasFaq =
    /FAQPage/i.test(html) ||
    /<h[23][^>]*>\s*faq/i.test(html) ||
    /schema\.org\/FAQPage/i.test(html)

  // Strip scripts/styles and tags for text analysis
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  // Approximate passages by paragraphs / double-newline chunks in cleaned text
  const bodyChunks = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .split(/<\/p>|<br\s*\/?>|<\/div>|<\/li>|<\/h[1-6]>/i)
    .map((c) =>
      c
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((c) => c.split(/\s+/).length >= 20)

  const passageLens = bodyChunks.map((c) => c.split(/\s+/).filter(Boolean).length)
  const avgPassageWords =
    passageLens.length > 0
      ? Math.round(passageLens.reduce((a, b) => a + b, 0) / passageLens.length)
      : wordCount > 0
        ? Math.min(wordCount, 200)
        : 0
  // Magic range often cited for AI citation: ~134–167 words per passage
  const passageInMagicRange = avgPassageWords >= 120 && avgPassageWords <= 180

  const h2 = (html.match(/<h2[\s>]/gi) || []).length
  const h3 = (html.match(/<h3[\s>]/gi) || []).length
  const headingDepth = (hasH1 ? 1 : 0) + (h2 > 0 ? 1 : 0) + (h3 > 0 ? 1 : 0)

  let internalLinks = 0
  let externalLinks = 0
  let host = ''
  try {
    host = new URL(pageUrl).hostname
  } catch {
    /* ignore */
  }
  const linkRe = /<a[^>]+href=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1]
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue
    try {
      const abs = new URL(href, pageUrl)
      if (abs.hostname === host) internalLinks++
      else externalLinks++
    } catch {
      /* ignore */
    }
  }

  const signals = {
    hasTitle: title.length >= 10,
    hasMetaDescription: description.length >= 50,
    hasH1,
    hasCanonical,
    hasJsonLd,
    hasAuthor,
    hasDate,
    hasFaq,
    wordCount,
    avgPassageWords,
    passageInMagicRange,
    headingDepth,
    internalLinks,
    externalLinks,
  }

  let score = 0
  if (signals.hasTitle) score += 10
  if (signals.hasMetaDescription) score += 10
  if (signals.hasH1) score += 10
  if (signals.hasCanonical) score += 5
  if (signals.hasJsonLd) score += 12
  if (signals.hasAuthor) score += 8
  if (signals.hasDate) score += 8
  if (signals.hasFaq) score += 7
  if (wordCount >= 300) score += 8
  if (wordCount >= 800) score += 5
  if (passageInMagicRange) score += 10
  else if (avgPassageWords >= 80 && avgPassageWords <= 220) score += 5
  if (headingDepth >= 2) score += 5
  if (internalLinks >= 3) score += 2
  score = Math.min(100, score)

  const strengths: string[] = []
  const gaps: string[] = []
  const recommendations: string[] = []

  if (signals.hasTitle) strengths.push('Clear page title')
  else {
    gaps.push('Missing or weak <title>')
    recommendations.push('Add a descriptive title (50–60 chars) with primary entity + topic')
  }
  if (signals.hasMetaDescription) strengths.push('Meta description present')
  else {
    gaps.push('Missing meta description')
    recommendations.push('Add a 120–160 char meta description that answers the query intent')
  }
  if (signals.hasH1) strengths.push('H1 present')
  else {
    gaps.push('No H1')
    recommendations.push('Use a single clear H1 matching the primary entity')
  }
  if (signals.hasJsonLd) strengths.push('JSON-LD structured data')
  else {
    gaps.push('No JSON-LD')
    recommendations.push('Add JSON-LD (Article, Organization, FAQPage, or Product as relevant)')
  }
  if (signals.hasAuthor) strengths.push('Author signal found')
  else {
    gaps.push('No author signal')
    recommendations.push('Expose author name (E-E-A-T) via meta or schema')
  }
  if (signals.hasDate) strengths.push('Publish/update date found')
  else {
    gaps.push('No date signal')
    recommendations.push('Add datePublished / dateModified for freshness')
  }
  if (signals.hasFaq) strengths.push('FAQ content detected')
  else {
    recommendations.push('Add an FAQ section with FAQPage schema for extractable Q&A')
  }
  if (passageInMagicRange) strengths.push(`Passage length in citation-friendly range (~${avgPassageWords} words)`)
  else {
    gaps.push(`Avg passage length ${avgPassageWords} words (target ~134–167)`)
    recommendations.push('Break content into self-contained passages of ~130–170 words that fully answer a question')
  }
  if (wordCount < 300) {
    gaps.push(`Thin content (${wordCount} words)`)
    recommendations.push('Expand substantive content to 600+ words for citation eligibility')
  }

  return {
    score,
    grade: gradeFromScore(score),
    signals,
    strengths,
    gaps,
    recommendations,
  }
}

export function scoreLlmsTxt(content: string | undefined): { score: number; issues: string[] } {
  if (!content || !content.trim()) {
    return { score: 0, issues: ['llms.txt not found'] }
  }
  const issues: string[] = []
  let score = 40
  if (content.length < 80) issues.push('llms.txt is very short')
  else score += 15
  if (/^#\s+/m.test(content)) score += 10
  else issues.push('Missing markdown headings')
  if (/https?:\/\//i.test(content)) score += 15
  else issues.push('No absolute URLs to key pages')
  if (/optional|docs|api|about|product/i.test(content)) score += 10
  if (content.length > 400) score += 10
  if (!/sitemap/i.test(content)) issues.push('No sitemap mention')
  return { score: Math.min(100, score), issues }
}

export function generateLlmsTxt(input: {
  domain: string
  title?: string
  description?: string
  url: string
  jsonLdTypes?: string[]
}): string {
  const name = input.title || input.domain
  const desc = input.description || `Website for ${input.domain}`
  const base = new URL(input.url).origin
  return [
    `# ${name}`,
    '',
    `> ${desc}`,
    '',
    `Primary URL: ${base}`,
    '',
    '## Key pages',
    '',
    `- Home: ${base}/`,
    `- Docs: ${base}/docs (update if different)`,
    `- API: ${base}/api or ${base}/docs/api (update if different)`,
    `- Pricing: ${base}/pricing (update if different)`,
    `- Contact: ${base}/contact (update if different)`,
    '',
    '## For AI assistants',
    '',
    `- Prefer citing official pages under ${base}`,
    '- Use product documentation for accurate capability claims',
    '- Do not invent pricing or SLAs not listed on the site',
    input.jsonLdTypes?.length ? `- Structured data types present: ${input.jsonLdTypes.join(', ')}` : '',
    '',
    '## Sitemap',
    '',
    `- ${base}/sitemap.xml`,
    '',
    '## Optional',
    '',
    `- llms-full.txt: ${base}/llms-full.txt`,
    '',
  ]
    .filter(Boolean)
    .join('\n')
}

function extractJsonLdTypes(html: string): string[] {
  const types = new Set<string>()
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const walk = (node: unknown) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
          node.forEach(walk)
          return
        }
        const obj = node as Record<string, unknown>
        if (typeof obj['@type'] === 'string') types.add(obj['@type'])
        if (Array.isArray(obj['@type'])) {
          for (const t of obj['@type']) if (typeof t === 'string') types.add(t)
        }
        if (obj['@graph']) walk(obj['@graph'])
      }
      walk(data)
    } catch {
      /* ignore invalid json-ld */
    }
  }
  return [...types]
}

function extractMeta(html: string): { title?: string; description?: string; language?: string } {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()
  const description =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]?.trim()
  const language = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1]?.trim()
  return { title, description, language }
}

function buildActions(audit: {
  crawlers: { details: CrawlerAccessResult[]; accessRate: number }
  citation: CitationReadinessResult
  llmsTxt: LlmsTxtResult
  technical: { hasSitemap: boolean; https: boolean; hasRobotsTxt: boolean }
}): ActionItem[] {
  const actions: ActionItem[] = []

  const blockedCritical = audit.crawlers.details.filter(
    (d) => !d.allowed && ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'OAI-SearchBot'].includes(d.bot),
  )
  for (const b of blockedCritical) {
    actions.push({
      priority: 'critical',
      category: 'crawlers',
      title: `Unblock ${b.bot}`,
      detail: `${b.bot} is blocked via robots.txt (${b.rule}). AI search cannot cite what it cannot crawl.`,
      impact: 15,
    })
  }

  if (!audit.llmsTxt.exists) {
    actions.push({
      priority: 'high',
      category: 'llms.txt',
      title: 'Publish /llms.txt',
      detail: 'No llms.txt found. Publish a machine-readable site map for AI agents at /llms.txt.',
      impact: 12,
    })
  } else if (audit.llmsTxt.score < 60) {
    actions.push({
      priority: 'medium',
      category: 'llms.txt',
      title: 'Improve llms.txt quality',
      detail: `llms.txt score ${audit.llmsTxt.score}/100. Issues: ${audit.llmsTxt.issues.join('; ') || 'quality'}`,
      impact: 6,
    })
  }

  if (!audit.technical.hasSitemap) {
    actions.push({
      priority: 'high',
      category: 'technical',
      title: 'Add sitemap.xml',
      detail: 'No sitemap detected. Sitemaps help crawlers discover indexable pages.',
      impact: 8,
    })
  }

  if (!audit.technical.https) {
    actions.push({
      priority: 'critical',
      category: 'technical',
      title: 'Enable HTTPS',
      detail: 'Site is not served over HTTPS.',
      impact: 20,
    })
  }

  for (const rec of audit.citation.recommendations.slice(0, 5)) {
    actions.push({
      priority: audit.citation.score < 50 ? 'high' : 'medium',
      category: 'citation',
      title: rec.slice(0, 80),
      detail: rec,
      impact: 5,
    })
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.impact - a.impact)
}

export async function runCrawlerAccess(url: string): Promise<{
  url: string
  domain: string
  robotsUrl: string
  hasRobotsTxt: boolean
  allowed: number
  blocked: number
  total: number
  accessRate: number
  details: CrawlerAccessResult[]
  durationMs: number
  version: string
}> {
  const started = Date.now()
  const parsed = validatePublicUrl(url)
  const origin = parsed.origin
  const robotsUrl = `${origin}/robots.txt`
  let robotsText = ''
  let hasRobotsTxt = false
  try {
    const robots = await fetchText(robotsUrl, { accept: 'text/plain,*/*' })
    if (robots.ok && robots.text.trim()) {
      hasRobotsTxt = true
      robotsText = robots.text
    }
  } catch {
    hasRobotsTxt = false
  }

  const details = AI_CRAWLERS.map((bot) => {
    if (!hasRobotsTxt) {
      return {
        bot: bot.name,
        company: bot.company,
        allowed: true,
        rule: 'no robots.txt (default allow)',
      }
    }
    // Check all path aliases — if any is blocked, report blocked for primary name
    let result = parseRobotsForBot(robotsText, bot.name)
    for (const alias of bot.paths) {
      const r = parseRobotsForBot(robotsText, alias)
      if (!r.allowed) {
        result = { ...r, bot: bot.name, company: bot.company }
        break
      }
    }
    return result
  })

  const allowed = details.filter((d) => d.allowed).length
  const blocked = details.length - allowed

  return {
    url: parsed.toString(),
    domain: parsed.hostname,
    robotsUrl,
    hasRobotsTxt,
    allowed,
    blocked,
    total: details.length,
    accessRate: Math.round((allowed / details.length) * 100),
    details,
    durationMs: Date.now() - started,
    version: GEOLANE_VERSION,
  }
}

export async function runCitationReadiness(url: string): Promise<CitationReadinessResult & { url: string; domain: string; durationMs: number; version: string }> {
  const started = Date.now()
  const parsed = validatePublicUrl(url)
  const page = await fetchText(parsed.toString())
  const citation = analyzeCitationReadiness(page.text, page.finalUrl || parsed.toString())
  return {
    ...citation,
    url: parsed.toString(),
    domain: parsed.hostname,
    durationMs: Date.now() - started,
    version: GEOLANE_VERSION,
  }
}

export async function runLlmsTxt(url: string): Promise<LlmsTxtResult & { domain: string; durationMs: number; version: string }> {
  const started = Date.now()
  const parsed = validatePublicUrl(url)
  const origin = parsed.origin
  const llmsUrl = `${origin}/llms.txt`
  let current: string | undefined
  let exists = false
  try {
    const res = await fetchText(llmsUrl, { accept: 'text/plain,*/*' })
    if (res.ok && res.text.trim() && !res.contentType?.includes('text/html')) {
      exists = true
      current = res.text
    } else if (res.ok && res.text.trim() && !/<html/i.test(res.text.slice(0, 200))) {
      exists = true
      current = res.text
    }
  } catch {
    exists = false
  }

  let title: string | undefined
  let description: string | undefined
  let jsonLdTypes: string[] = []
  try {
    const page = await fetchText(parsed.toString())
    const meta = extractMeta(page.text)
    title = meta.title
    description = meta.description
    jsonLdTypes = extractJsonLdTypes(page.text)
  } catch {
    /* page fetch optional for draft */
  }

  const scored = scoreLlmsTxt(current)
  const draft = generateLlmsTxt({
    domain: parsed.hostname,
    title,
    description,
    url: parsed.toString(),
    jsonLdTypes,
  })

  return {
    exists,
    url: llmsUrl,
    score: scored.score,
    issues: scored.issues,
    draft,
    current,
    domain: parsed.hostname,
    durationMs: Date.now() - started,
    version: GEOLANE_VERSION,
  }
}

export async function runGeoAudit(url: string): Promise<GeoAuditResult> {
  const started = Date.now()
  const parsed = validatePublicUrl(url)

  const [page, crawlers, llms] = await Promise.all([
    fetchText(parsed.toString()),
    runCrawlerAccess(parsed.toString()),
    runLlmsTxt(parsed.toString()),
  ])

  const citation = analyzeCitationReadiness(page.text, page.finalUrl || parsed.toString())
  const meta = extractMeta(page.text)
  const jsonLdTypes = extractJsonLdTypes(page.text)

  let hasSitemap = false
  try {
    const sm = await fetchText(`${parsed.origin}/sitemap.xml`, { accept: 'application/xml,text/xml,*/*' })
    if (sm.ok && (sm.text.includes('<urlset') || sm.text.includes('<sitemapindex') || sm.text.includes('<url>'))) {
      hasSitemap = true
    }
  } catch {
    hasSitemap = false
  }

  // Composite score weights
  const crawlerScore = crawlers.accessRate
  const citationScore = citation.score
  const llmsScore = llms.exists ? llms.score : 0
  const techScore =
    (parsed.protocol === 'https:' ? 40 : 0) +
    (crawlers.hasRobotsTxt ? 20 : 0) +
    (hasSitemap ? 25 : 0) +
    (llms.exists ? 15 : 0)

  const score = Math.round(crawlerScore * 0.3 + citationScore * 0.4 + llmsScore * 0.15 + techScore * 0.15)
  const grade = gradeFromScore(score)

  const technical = {
    https: parsed.protocol === 'https:',
    hasRobotsTxt: crawlers.hasRobotsTxt,
    hasSitemap,
    hasLlmsTxt: llms.exists,
    contentType: page.contentType,
    title: meta.title,
    description: meta.description,
    language: meta.language,
    jsonLdTypes,
  }

  const actions = buildActions({
    crawlers: {
      details: crawlers.details,
      accessRate: crawlers.accessRate,
    },
    citation,
    llmsTxt: llms,
    technical,
  })

  const summaryParts: string[] = []
  summaryParts.push(`Overall GEO score ${score}/100 (${grade}).`)
  summaryParts.push(
    `AI crawler access ${crawlers.allowed}/${crawlers.total} (${crawlers.accessRate}%).`,
  )
  summaryParts.push(`Citation readiness ${citation.score}/100.`)
  if (!llms.exists) summaryParts.push('Missing llms.txt.')
  else summaryParts.push(`llms.txt score ${llms.score}/100.`)
  if (actions[0]) summaryParts.push(`Top fix: ${actions[0].title}.`)

  return {
    url: parsed.toString(),
    domain: parsed.hostname,
    finalUrl: page.finalUrl,
    statusCode: page.status,
    score,
    grade,
    summary: summaryParts.join(' '),
    crawlers: {
      allowed: crawlers.allowed,
      blocked: crawlers.blocked,
      total: crawlers.total,
      accessRate: crawlers.accessRate,
      details: crawlers.details,
    },
    citation,
    llmsTxt: {
      exists: llms.exists,
      url: llms.url,
      score: llms.score,
      issues: llms.issues,
      draft: llms.draft,
      current: llms.current,
    },
    technical,
    actions,
    durationMs: Date.now() - started,
    engine: 'rules',
    version: GEOLANE_VERSION,
  }
}

export async function runCompare(urlA: string, urlB: string): Promise<{
  a: GeoAuditResult
  b: GeoAuditResult
  winner: 'a' | 'b' | 'tie'
  scoreDelta: number
  insights: string[]
  durationMs: number
  version: string
}> {
  const started = Date.now()
  const [a, b] = await Promise.all([runGeoAudit(urlA), runGeoAudit(urlB)])
  const scoreDelta = a.score - b.score
  const winner = scoreDelta > 2 ? 'a' : scoreDelta < -2 ? 'b' : 'tie'
  const insights: string[] = []
  insights.push(
    winner === 'tie'
      ? `Scores are close: ${a.domain} ${a.score} vs ${b.domain} ${b.score}.`
      : `${winner === 'a' ? a.domain : b.domain} leads by ${Math.abs(scoreDelta)} points.`,
  )
  if (a.crawlers.accessRate !== b.crawlers.accessRate) {
    insights.push(
      `Crawler access: ${a.domain} ${a.crawlers.accessRate}% vs ${b.domain} ${b.crawlers.accessRate}%.`,
    )
  }
  if (a.citation.score !== b.citation.score) {
    insights.push(
      `Citation readiness: ${a.domain} ${a.citation.score} vs ${b.domain} ${b.citation.score}.`,
    )
  }
  if (a.llmsTxt.exists !== b.llmsTxt.exists) {
    const has = a.llmsTxt.exists ? a.domain : b.domain
    const missing = a.llmsTxt.exists ? b.domain : a.domain
    insights.push(`${has} has llms.txt; ${missing} does not.`)
  }
  return {
    a,
    b,
    winner,
    scoreDelta,
    insights,
    durationMs: Date.now() - started,
    version: GEOLANE_VERSION,
  }
}

export function getGeoLanePricing() {
  return {
    product: 'geolane',
    version: GEOLANE_VERSION,
    credits: {
      'geolane.audit': 40,
      'geolane.crawlers': 15,
      'geolane.llms_txt': 20,
      'geolane.citation_readiness': 25,
      'geolane.compare': 50,
    },
    note: 'Pay-per-domain AI visibility intelligence. Charged via Talocode Cloud wallet.',
  }
}

export function getGeoLaneCapabilities() {
  return {
    product: 'geolane',
    version: GEOLANE_VERSION,
    engine: 'rules',
    endpoints: [
      'GET /v1/geolane/health',
      'GET /v1/geolane/pricing',
      'GET /v1/geolane/capabilities',
      'POST /v1/geolane/audit',
      'POST /v1/geolane/crawlers',
      'POST /v1/geolane/llms-txt',
      'POST /v1/geolane/citation-readiness',
      'POST /v1/geolane/compare',
    ],
    crawlersTracked: AI_CRAWLERS.map((c) => c.name),
    outputs: [
      'composite GEO score + grade',
      'AI crawler allow/block matrix',
      'citation readiness signals',
      'llms.txt score + draft',
      'prioritized action plan',
      'domain comparison',
    ],
    limitations: [
      'HTTP fetch only (no headless browser in v0.1)',
      'robots.txt root allow/disallow heuristic',
      'Does not scrape third-party AI answer engines for live citations',
    ],
  }
}
