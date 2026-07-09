/**
 * SearchLane — Agent Web Search & Research Intelligence (v0.1)
 *
 * Pay-per-query search for agents and developers:
 * - query: structured web search hits
 * - news: freshness-biased search
 * - research: multi-source dig + extractive answer + citations
 *
 * Providers (auto):
 * 1. Brave Search if BRAVE_API_KEY set
 * 2. Serper if SERPER_API_KEY set
 * 3. DuckDuckGo Instant Answer + HTML scrape (no key)
 */

export const SEARCHLANE_VERSION = '0.1.0'

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

export interface SearchHit {
  title: string
  url: string
  snippet: string
  score: number
  source?: string
  publishedAt?: string
  position: number
}

export interface SearchQueryResult {
  query: string
  results: SearchHit[]
  provider: string
  count: number
  durationMs: number
  engine: 'searchlane'
  version: string
}

export interface ResearchResult {
  query: string
  answer: string
  citations: { index: number; title: string; url: string; snippet: string }[]
  results: SearchHit[]
  provider: string
  durationMs: number
  engine: 'searchlane'
  version: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
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
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.local')) {
    throw new Error('URLs pointing to private IPs or localhost are not allowed.')
  }
  if (
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    throw new Error('URLs pointing to private IPs or localhost are not allowed.')
  }
  return parsed
}

async function fetchText(
  url: string,
  options?: { timeoutMs?: number; headers?: Record<string, string>; maxBytes?: number },
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string }> {
  const timeoutMs = options?.timeoutMs ?? 10000
  const maxBytes = options?.maxBytes ?? 800_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'TalocodeSearchLane/0.1 (+https://talocode.site; agent-search)',
        accept: 'text/html,application/json,*/*;q=0.8',
        ...options?.headers,
      },
    })
    const buf = new Uint8Array(await res.arrayBuffer())
    const slice = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf
    const text = new TextDecoder('utf-8', { fatal: false }).decode(slice)
    return { ok: res.ok, status: res.status, text, finalUrl: res.url || url }
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function scoreHit(query: string, title: string, snippet: string, position: number): number {
  const q = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  const hay = `${title} ${snippet}`.toLowerCase()
  let score = 1 - position * 0.04
  for (const term of q) {
    if (title.toLowerCase().includes(term)) score += 0.12
    if (snippet.toLowerCase().includes(term)) score += 0.06
    if (hay.includes(term)) score += 0.02
  }
  return clamp(Math.round(score * 100) / 100, 0, 1)
}

function normalizeHits(query: string, raw: Omit<SearchHit, 'score' | 'position'>[], provider: string): SearchHit[] {
  const seen = new Set<string>()
  const hits: SearchHit[] = []
  for (const r of raw) {
    let url = r.url.trim()
    if (!url) continue
    try {
      url = validatePublicUrl(url).toString()
    } catch {
      continue
    }
    if (seen.has(url)) continue
    seen.add(url)
    const position = hits.length + 1
    hits.push({
      title: r.title?.trim() || url,
      url,
      snippet: (r.snippet || '').trim().slice(0, 400),
      source: r.source || provider,
      publishedAt: r.publishedAt,
      position,
      score: scoreHit(query, r.title || '', r.snippet || '', position),
    })
  }
  return hits
}

/** DuckDuckGo Instant Answer API */
async function searchDuckDuckGoIA(query: string, limit: number): Promise<{ hits: SearchHit[]; provider: string }> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
  const res = await fetchText(url, { timeoutMs: 8000 })
  const raw: Omit<SearchHit, 'score' | 'position'>[] = []
  try {
    const data = JSON.parse(res.text) as {
      AbstractText?: string
      AbstractURL?: string
      Heading?: string
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>
      Results?: Array<{ Text?: string; FirstURL?: string }>
    }
    if (data.AbstractText && data.AbstractURL) {
      raw.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: 'duckduckgo',
      })
    }
    const pushTopic = (t: { Text?: string; FirstURL?: string }) => {
      if (t.FirstURL && t.Text) {
        const parts = t.Text.split(' - ')
        raw.push({
          title: parts[0] || t.Text.slice(0, 80),
          url: t.FirstURL,
          snippet: parts.slice(1).join(' - ') || t.Text,
          source: 'duckduckgo',
        })
      }
    }
    for (const t of data.RelatedTopics || []) {
      if (t.Topics) for (const sub of t.Topics) pushTopic(sub)
      else pushTopic(t)
    }
    for (const r of data.Results || []) pushTopic(r)
  } catch {
    /* ignore parse errors */
  }
  return { hits: normalizeHits(query, raw, 'duckduckgo').slice(0, limit), provider: 'duckduckgo' }
}

/** DuckDuckGo HTML results (no API key) */
async function searchDuckDuckGoHtml(query: string, limit: number): Promise<{ hits: SearchHit[]; provider: string }> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const res = await fetchText(url, {
    timeoutMs: 12000,
    headers: { accept: 'text/html' },
  })
  const raw: Omit<SearchHit, 'score' | 'position'>[] = []
  // result blocks
  const re =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div)>|)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(res.text)) !== null && raw.length < limit * 2) {
    let href = decodeEntities(m[1])
    // DDG sometimes uses redirect URLs
    const uddg = href.match(/[?&]uddg=([^&]+)/)
    if (uddg) {
      try {
        href = decodeURIComponent(uddg[1])
      } catch {
        /* keep */
      }
    }
    const title = stripHtml(m[2])
    const snippet = stripHtml(m[3] || '')
    if (href.startsWith('http')) {
      raw.push({ title, url: href, snippet, source: 'duckduckgo-html' })
    }
  }
  // fallback simpler parse
  if (raw.length === 0) {
    const simple = /<a[^>]+rel="nofollow"[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    while ((m = simple.exec(res.text)) !== null && raw.length < limit) {
      const href = decodeEntities(m[1])
      if (href.startsWith('http')) {
        raw.push({ title: stripHtml(m[2]), url: href, snippet: '', source: 'duckduckgo-html' })
      }
    }
  }
  return { hits: normalizeHits(query, raw, 'duckduckgo-html').slice(0, limit), provider: 'duckduckgo-html' }
}

async function searchBrave(query: string, limit: number, news = false): Promise<{ hits: SearchHit[]; provider: string } | null> {
  const key = process.env.BRAVE_API_KEY
  if (!key) return null
  const endpoint = news
    ? `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${limit}`
    : `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`
  try {
    const res = await fetchText(endpoint, {
      timeoutMs: 10000,
      headers: { Accept: 'application/json', 'X-Subscription-Token': key },
    })
    if (!res.ok) return null
    const data = JSON.parse(res.text) as {
      web?: {
        results?: Array<{ title?: string; url?: string; description?: string; age?: string; page_age?: string }>
      }
      results?: Array<{ title?: string; url?: string; description?: string; age?: string; page_age?: string }>
    }
    const items = data.web?.results || data.results || []
    const raw = items.map((r) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || '',
      source: 'brave',
      publishedAt: r.age || r.page_age,
    }))
    return { hits: normalizeHits(query, raw, 'brave').slice(0, limit), provider: 'brave' }
  } catch {
    return null
  }
}

async function searchSerper(query: string, limit: number, news = false): Promise<{ hits: SearchHit[]; provider: string } | null> {
  const key = process.env.SERPER_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://google.serper.dev/' + (news ? 'news' : 'search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
      body: JSON.stringify({ q: query, num: limit }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>
      news?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>
    }
    const items = news ? data.news || [] : data.organic || []
    const raw = items.map((r) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
      source: 'serper',
      publishedAt: r.date,
    }))
    return { hits: normalizeHits(query, raw, 'serper').slice(0, limit), provider: 'serper' }
  } catch {
    return null
  }
}

/** Built-in demo/mock results when all providers fail (tests + offline) */
export function mockSearchResults(query: string, limit: number): SearchHit[] {
  const base = [
    {
      title: `${query} — Overview`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
      snippet: `Overview and background information about ${query}.`,
    },
    {
      title: `${query} documentation`,
      url: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`,
      snippet: `Developer documentation and references related to ${query}.`,
    },
    {
      title: `GitHub results for ${query}`,
      url: `https://github.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Open source repositories and code matching ${query}.`,
    },
    {
      title: `News about ${query}`,
      url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Recent news coverage related to ${query}.`,
    },
    {
      title: `${query} on Stack Overflow`,
      url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Questions and answers from developers about ${query}.`,
    },
  ]
  return normalizeHits(query, base.slice(0, limit), 'mock')
}

export async function runSearchQuery(
  query: string,
  options?: { limit?: number; news?: boolean },
): Promise<SearchQueryResult> {
  const started = Date.now()
  const q = (query || '').trim()
  if (!q) throw new Error('query is required')
  if (q.length > 500) throw new Error('query is too long (max 500 chars)')
  const limit = clamp(options?.limit ?? 8, 1, 20)
  const news = options?.news === true

  // Prefer paid/quality providers when keys present
  const brave = await searchBrave(q, limit, news)
  if (brave && brave.hits.length > 0) {
    return {
      query: q,
      results: brave.hits,
      provider: brave.provider,
      count: brave.hits.length,
      durationMs: Date.now() - started,
      engine: 'searchlane',
      version: SEARCHLANE_VERSION,
    }
  }

  const serper = await searchSerper(q, limit, news)
  if (serper && serper.hits.length > 0) {
    return {
      query: q,
      results: serper.hits,
      provider: serper.provider,
      count: serper.hits.length,
      durationMs: Date.now() - started,
      engine: 'searchlane',
      version: SEARCHLANE_VERSION,
    }
  }

  // Free path: IA + HTML
  let hits: SearchHit[] = []
  let provider = 'duckduckgo'
  try {
    const ia = await searchDuckDuckGoIA(news ? `${q} news` : q, limit)
    hits = ia.hits
    provider = ia.provider
  } catch {
    /* continue */
  }
  if (hits.length < Math.min(3, limit)) {
    try {
      const html = await searchDuckDuckGoHtml(news ? `${q} news` : q, limit)
      const merged = normalizeHits(q, [...hits, ...html.hits], html.provider)
      hits = merged.slice(0, limit)
      provider = hits.length ? html.provider : provider
    } catch {
      /* continue */
    }
  }

  if (hits.length === 0) {
    hits = mockSearchResults(q, limit)
    provider = 'mock'
  }

  return {
    query: q,
    results: hits,
    provider,
    count: hits.length,
    durationMs: Date.now() - started,
    engine: 'searchlane',
    version: SEARCHLANE_VERSION,
  }
}

export async function runSearchNews(query: string, options?: { limit?: number }): Promise<SearchQueryResult> {
  return runSearchQuery(query, { ...options, news: true })
}

async function fetchPageSnippet(url: string): Promise<string> {
  try {
    validatePublicUrl(url)
    const res = await fetchText(url, { timeoutMs: 6000, maxBytes: 200_000 })
    if (!res.ok) return ''
    const text = stripHtml(res.text)
    return text.slice(0, 600)
  } catch {
    return ''
  }
}

/** Extractive research brief from search hits + optional page peeks */
export function buildResearchAnswer(query: string, hits: SearchHit[], pageSnippets: string[]): string {
  const lines: string[] = []
  lines.push(`Research brief for: "${query}"`)
  lines.push('')
  if (hits.length === 0) {
    lines.push('No sources found. Try a more specific query.')
    return lines.join('\n')
  }
  lines.push('## Key findings')
  lines.push('')
  const top = hits.slice(0, 5)
  top.forEach((h, i) => {
    const extra = pageSnippets[i] ? ` ${pageSnippets[i].slice(0, 180)}` : ''
    const snip = h.snippet || extra
    lines.push(`${i + 1}. **${h.title}** — ${snip.slice(0, 220)}${snip.length > 220 ? '…' : ''}`)
    lines.push(`   Source: ${h.url}`)
    lines.push('')
  })
  lines.push('## Summary')
  lines.push('')
  const bag = top.map((h) => h.snippet).filter(Boolean).join(' ')
  const sentences = bag
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40)
  const summary = sentences.slice(0, 4).join(' ')
  lines.push(summary || `Top sources discuss ${query}. Review citations for details.`)
  lines.push('')
  lines.push(`Sources used: ${top.length}. Provider scores reflect title/snippet relevance to the query.`)
  return lines.join('\n')
}

export async function runResearch(
  query: string,
  options?: { limit?: number; fetchPages?: boolean },
): Promise<ResearchResult> {
  const started = Date.now()
  const limit = clamp(options?.limit ?? 6, 3, 12)
  const search = await runSearchQuery(query, { limit })
  const hits = search.results

  const fetchPages = options?.fetchPages !== false
  const pageSnippets: string[] = []
  if (fetchPages) {
    const peeks = await Promise.all(hits.slice(0, 4).map((h) => fetchPageSnippet(h.url)))
    pageSnippets.push(...peeks)
  }

  const answer = buildResearchAnswer(query, hits, pageSnippets)
  const citations = hits.slice(0, 8).map((h, i) => ({
    index: i + 1,
    title: h.title,
    url: h.url,
    snippet: h.snippet,
  }))

  return {
    query: search.query,
    answer,
    citations,
    results: hits,
    provider: search.provider,
    durationMs: Date.now() - started,
    engine: 'searchlane',
    version: SEARCHLANE_VERSION,
  }
}

export function getSearchLanePricing() {
  return {
    product: 'searchlane',
    version: SEARCHLANE_VERSION,
    credits: {
      'searchlane.query': 5,
      'searchlane.research': 30,
      'searchlane.news': 8,
    },
    note: 'Agent web search & research. Optional BRAVE_API_KEY or SERPER_API_KEY for higher quality; DuckDuckGo fallback is free-path.',
  }
}

export function getSearchLaneCapabilities() {
  return {
    product: 'searchlane',
    version: SEARCHLANE_VERSION,
    endpoints: [
      'GET /v1/searchlane/health',
      'GET /v1/searchlane/pricing',
      'GET /v1/searchlane/capabilities',
      'POST /v1/searchlane/query',
      'POST /v1/searchlane/research',
      'POST /v1/searchlane/news',
    ],
    providers: ['brave (BRAVE_API_KEY)', 'serper (SERPER_API_KEY)', 'duckduckgo', 'mock'],
    outputs: [
      'ranked structured search hits',
      'news-biased search',
      'research brief with citations',
    ],
    limitations: [
      'No full browser rendering',
      'Free providers may rate-limit',
      'Research answer is extractive (not LLM) in v0.1',
    ],
  }
}
