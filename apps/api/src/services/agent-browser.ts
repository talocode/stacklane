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