import type { McpToolInputSchema } from './types'

export const teraWritingRewriteSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'The text to rewrite' },
    style: { type: 'string', description: 'Target style (e.g. "clear", "concise", "professional")' },
    tone: { type: 'string', description: 'Target tone (e.g. "formal", "casual", "friendly")' },
    maxLength: { type: 'number', description: 'Maximum output length in characters' },
  },
  required: ['text'],
  additionalProperties: false,
}

export const teraWritingDraftSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['email', 'social_post', 'announcement', 'article', 'doc', 'custom'], description: 'Type of content to draft' },
    brief: { type: 'string', description: 'Brief description of what to write' },
    audience: { type: 'string', description: 'Target audience' },
    tone: { type: 'string', description: 'Desired tone' },
    maxLength: { type: 'number', description: 'Maximum output length' },
    points: { type: 'array', items: { type: 'string' }, description: 'Key points to include' },
  },
  required: ['type', 'brief'],
  additionalProperties: false,
}

export const teraCodingExplainSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    language: { type: 'string', description: 'Programming language' },
    code: { type: 'string', description: 'Code snippet to explain' },
    level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], description: 'Explanation depth' },
    focus: { type: 'array', items: { type: 'string' }, description: 'Aspects to focus on' },
  },
  required: ['language', 'code'],
  additionalProperties: false,
}

export const teraCodingReviewSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    language: { type: 'string', description: 'Programming language' },
    code: { type: 'string', description: 'Code to review' },
    focus: { type: 'array', items: { type: 'string' }, description: 'Aspects to review (bugs, security, performance, etc.)' },
    strictness: { type: 'string', enum: ['gentle', 'normal', 'strict'], description: 'Review strictness' },
  },
  required: ['language', 'code'],
  additionalProperties: false,
}

export const routerChatSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    model: { type: 'string', description: 'Model to use (e.g. talocode/auto, talocode/fast, talocode/coding)' },
    messages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['user', 'assistant', 'system'] },
          content: { type: 'string' },
        },
        required: ['role', 'content'],
      },
      description: 'Chat messages',
    },
    max_tokens: { type: 'number', description: 'Maximum tokens in response' },
    temperature: { type: 'number', description: 'Sampling temperature (0-2)' },
  },
  required: ['model', 'messages'],
  additionalProperties: false,
}

export const agentBrowserCheckSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to check' },
    screenshot: { type: 'boolean', description: 'Capture screenshot' },
    vision: { type: 'boolean', description: 'Use vision analysis' },
    sessionId: { type: 'string', description: 'Browser session ID' },
  },
  required: ['url'],
  additionalProperties: false,
}

export const agentBrowserScreenshotSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to screenshot' },
    fullPage: { type: 'boolean', description: 'Capture full page' },
    width: { type: 'number', description: 'Viewport width' },
    height: { type: 'number', description: 'Viewport height' },
    sessionId: { type: 'string', description: 'Browser session ID' },
  },
  required: ['url'],
  additionalProperties: false,
}

export const agentBrowserTraceReportSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to trace' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'Action type (click, type, navigate, etc.)' },
          selector: { type: 'string', description: 'CSS selector for target element' },
          value: { type: 'string', description: 'Value to type or input' },
        },
        required: ['action'],
      },
      description: 'Steps to execute',
    },
    sessionId: { type: 'string', description: 'Browser session ID' },
  },
  required: ['url', 'steps'],
  additionalProperties: false,
}

export const cliploopBriefGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string', description: 'Video concept or prompt' },
    channel: { type: 'string', enum: ['youtube', 'tiktok', 'instagram', 'twitter', 'linkedin'], description: 'Target platform' },
    tone: { type: 'string', description: 'Video tone' },
    duration: { type: 'number', description: 'Target duration in seconds' },
    cta: { type: 'string', description: 'Call to action' },
  },
  required: ['prompt'],
  additionalProperties: false,
}

export const cliploopScriptGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    briefId: { type: 'string', description: 'Brief ID from brief generation' },
    style: { type: 'string', description: 'Script style' },
  },
  required: ['briefId'],
  additionalProperties: false,
}

export const cliploopVideoRenderSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    scriptId: { type: 'string', description: 'Script ID from script generation' },
    format: { type: 'string', enum: ['portrait', 'landscape', 'square'], description: 'Video format' },
    quality: { type: 'string', enum: ['draft', 'standard', 'high'], description: 'Render quality' },
  },
  required: ['scriptId'],
  additionalProperties: false,
}

export const cliploopCampaignCreateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Campaign name' },
    platform: { type: 'string', description: 'Target platform' },
    schedule: { type: 'string', description: 'Schedule (ISO date or cron-like)' },
  },
  required: ['name', 'platform'],
  additionalProperties: false,
}

export const cliploopCampaignPackageSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    campaignId: { type: 'string', description: 'Campaign ID' },
  },
  required: ['campaignId'],
  additionalProperties: false,
}

export const cloudPricingSchema: McpToolInputSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
}

export const skillsGenerateProfileSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', description: 'GitHub username to generate skill from' },
    target: { type: 'string', enum: ['cursor', 'claude', 'opencode', 'codra'], description: 'Target AI agent platform' },
    focus: { type: 'array', items: { type: 'string' }, description: 'Focus areas for the skill' },
    includeRepositories: { type: 'boolean', description: 'Whether to include repo analysis' },
    maxRepositories: { type: 'number', description: 'Maximum number of repos to analyze' },
  },
  required: ['username'],
  additionalProperties: false,
}

export const skillsGenerateRepoSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    repoUrl: { type: 'string', description: 'Full GitHub repository URL' },
    target: { type: 'string', enum: ['cursor', 'claude', 'opencode', 'codra'], description: 'Target AI agent platform' },
    focus: { type: 'array', items: { type: 'string' }, description: 'Focus areas for the skill' },
  },
  required: ['repoUrl'],
  additionalProperties: false,
}

export const skillsGenerateDocsSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'Documentation URL to generate skill from' },
    target: { type: 'string', enum: ['cursor', 'claude', 'opencode', 'codra'], description: 'Target AI agent platform' },
    focus: { type: 'array', items: { type: 'string' }, description: 'Focus areas for the skill' },
  },
  required: ['url'],
  additionalProperties: false,
}

export const skillsGenerateTextSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Name for the generated skill' },
    content: { type: 'string', description: 'Text content to generate skill from' },
    target: { type: 'string', enum: ['cursor', 'claude', 'opencode', 'codra'], description: 'Target AI agent platform' },
    focus: { type: 'array', items: { type: 'string' }, description: 'Focus areas for the skill' },
  },
  required: ['name', 'content'],
  additionalProperties: false,
}

export const skillsExportCursorSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    skill: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name' },
        skillMd: { type: 'string', description: 'Skill markdown content' },
        title: { type: 'string', description: 'Skill title' },
        description: { type: 'string', description: 'Skill description' },
        metadata: { type: 'object', description: 'Optional metadata' },
      },
      required: ['name', 'skillMd'],
      description: 'Skill object to export',
    },
  },
  required: ['skill'],
  additionalProperties: false,
}

export const invoicelaneExtractSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Raw text from an invoice or receipt' },
    type: { type: 'string', enum: ['invoice', 'receipt', 'document', 'auto'], description: 'Document type hint' },
    currency: { type: 'string', description: 'Expected currency (e.g. NGN, USD)' },
    locale: { type: 'string', description: 'Locale for parsing (e.g. en-NG)' },
    fileUrl: { type: 'string', description: 'URL to a document file (OCR not available in v0.1)' },
  },
  required: [],
  additionalProperties: false,
}

export const invoicelaneExtractReceiptSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Raw receipt text' },
    currency: { type: 'string', description: 'Expected currency' },
    locale: { type: 'string', description: 'Locale for parsing' },
  },
  required: [],
  additionalProperties: false,
}

export const invoicelaneExtractInvoiceSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Raw invoice text' },
    currency: { type: 'string', description: 'Expected currency' },
    locale: { type: 'string', description: 'Locale for parsing' },
  },
  required: [],
  additionalProperties: false,
}

export const invoicelaneValidateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    documentType: { type: 'string', description: 'Type of document (invoice, receipt)' },
    fields: { type: 'object', description: 'Extracted fields to validate', additionalProperties: true },
  },
  required: ['documentType', 'fields'],
  additionalProperties: false,
}

export const invoicelaneExportCsvSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    rows: { type: 'array', items: { type: 'object' }, description: 'Array of row objects to export as CSV' },
  },
  required: ['rows'],
  additionalProperties: false,
}

export const webdatalaneFetchSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to fetch' },
    timeoutMs: { type: 'number', description: 'Request timeout in milliseconds' },
    userAgent: { type: 'string', description: 'Custom User-Agent string' },
    maxBytes: { type: 'number', description: 'Maximum response bytes' },
  },
  required: ['url'],
  additionalProperties: false,
}

export const webdatalaneExtractSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to extract from' },
    html: { type: 'string', description: 'Raw HTML to extract from' },
    include: { type: 'array', items: { type: 'string' }, description: 'Fields to include: metadata, links, markdown, headings, images, jsonLd, tables' },
    timeoutMs: { type: 'number', description: 'Request timeout' },
  },
  required: [],
  additionalProperties: false,
}

export const webdatalaneMarkdownSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to convert' },
    html: { type: 'string', description: 'Raw HTML to convert' },
    stripNavigation: { type: 'boolean', description: 'Strip nav/footer/header elements' },
    includeLinks: { type: 'boolean', description: 'Include links in output' },
  },
  required: [],
  additionalProperties: false,
}

export const webdatalaneMetadataSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to extract metadata from' },
    html: { type: 'string', description: 'Raw HTML' },
  },
  required: [],
  additionalProperties: false,
}

export const webdatalaneLinksSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to extract links from' },
    html: { type: 'string', description: 'Raw HTML' },
    internalOnly: { type: 'boolean', description: 'Only return internal links' },
  },
  required: [],
  additionalProperties: false,
}

export const webdatalaneStructuredSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to extract from' },
    html: { type: 'string', description: 'Raw HTML' },
    schema: { type: 'object', description: 'Schema of fields to extract (key: type)' },
    hints: { type: 'object', description: 'Hints for field extraction (key: [selectors])' },
  },
  required: ['schema'],
  additionalProperties: false,
}

export const webdatalaneCrawlPlanSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'Seed URL for crawl' },
    html: { type: 'string', description: 'Raw HTML' },
    maxPages: { type: 'number', description: 'Maximum pages to crawl' },
    sameDomainOnly: { type: 'boolean', description: 'Only include same-domain links' },
    includePatterns: { type: 'array', items: { type: 'string' }, description: 'URL patterns to include' },
    excludePatterns: { type: 'array', items: { type: 'string' }, description: 'URL patterns to exclude' },
  },
  required: ['url'],
  additionalProperties: false,
}

export const webdatalaneScreenshotSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to screenshot' },
    width: { type: 'number', description: 'Viewport width' },
    height: { type: 'number', description: 'Viewport height' },
    fullPage: { type: 'boolean', description: 'Capture full page' },
  },
  required: ['url'],
  additionalProperties: false,
}

export const signallaneXAnalyzeSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    handle: { type: 'string', description: 'X (Twitter) handle to analyze (without @)' },
    period: { type: 'string', enum: ['7d', '14d', '30d', '90d'], description: 'Analysis period' },
  },
  required: ['handle'],
  additionalProperties: false,
}

export const signallaneXContentPlanSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    handle: { type: 'string', description: 'X (Twitter) handle (without @)' },
    goals: { type: 'array', items: { type: 'string' }, description: 'Content goals (e.g. engagement, followers, authority)' },
    topics: { type: 'array', items: { type: 'string' }, description: 'Preferred topics to cover' },
    tone: { type: 'string', description: 'Content tone (e.g. professional, casual, witty)' },
  },
  required: ['handle'],
  additionalProperties: false,
}

export const signallaneXPostDraftsSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    handle: { type: 'string', description: 'X (Twitter) handle (without @)' },
    topic: { type: 'string', description: 'Topic for the post drafts' },
    tone: { type: 'string', description: 'Desired tone (e.g. informative, humorous, provocative)' },
    count: { type: 'number', description: 'Number of drafts to generate (default 5)' },
  },
  required: ['handle'],
  additionalProperties: false,
}

export const signallaneXExperimentsSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    handle: { type: 'string', description: 'X (Twitter) handle (without @)' },
    goal: { type: 'string', description: 'Experiment goal (e.g. increase engagement, grow followers)' },
    focus: { type: 'array', items: { type: 'string' }, description: 'Focus areas for experiments' },
  },
  required: ['handle'],
  additionalProperties: false,
}

export const signallaneXReportSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    handle: { type: 'string', description: 'X (Twitter) handle (without @)' },
    period: { type: 'string', enum: ['7d', '14d', '30d', '90d'], description: 'Report period' },
    include: { type: 'array', items: { type: 'string' }, description: 'Sections to include (metrics, content, competitors, recommendations)' },
  },
  required: ['handle'],
  additionalProperties: false,
}

export const ugclaneStrategyGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    goal: { type: 'string', description: 'Content strategy goal (e.g. grow, engage, convert)' },
    niche: { type: 'string', description: 'Target niche or industry' },
    platform: { type: 'string', description: 'Target platform (youtube, tiktok, instagram, twitter, linkedin)' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'Constraints to follow' },
  },
  required: ['goal'],
  additionalProperties: false,
}

export const ugclaneCompetitorAnalyzeSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    competitors: { type: 'array', items: { type: 'string' }, description: 'List of competitor identifiers (handles, channel names)' },
    niche: { type: 'string', description: 'Target niche' },
    depth: { type: 'string', enum: ['basic', 'detailed', 'deep'], description: 'Analysis depth' },
  },
  required: ['competitors'],
  additionalProperties: false,
}

export const ugclaneHooksGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string', description: 'Content topic for hook generation' },
    platform: { type: 'string', description: 'Target platform' },
    count: { type: 'number', description: 'Number of hooks to generate (default 5)' },
    tone: { type: 'string', description: 'Desired tone' },
  },
  required: ['topic'],
  additionalProperties: false,
}

export const ugclaneScriptsGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string', description: 'Script topic' },
    format: { type: 'string', enum: ['short', 'long', 'series'], description: 'Script format' },
    platform: { type: 'string', description: 'Target platform' },
    tone: { type: 'string', description: 'Desired tone' },
    cta: { type: 'string', description: 'Call to action' },
  },
  required: ['topic'],
  additionalProperties: false,
}

export const ugclaneAccountsPlanSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    platform: { type: 'string', description: 'Social platform' },
    goal: { type: 'string', description: 'Account goal' },
    metrics: { type: 'object', description: 'Current account metrics', additionalProperties: true },
    timeline: { type: 'string', description: 'Growth timeline (e.g. 30d, 90d)' },
  },
  required: ['platform', 'goal'],
  additionalProperties: false,
}

export const ugclaneCalendarGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    platform: { type: 'string', description: 'Target platform' },
    month: { type: 'string', description: 'Month for the calendar (YYYY-MM)' },
    goals: { type: 'array', items: { type: 'string' }, description: 'Content goals for the month' },
    themes: { type: 'array', items: { type: 'string' }, description: 'Content themes' },
    postFrequency: { type: 'string', description: 'Posting frequency (e.g. 3x week, daily)' },
  },
  required: ['platform'],
  additionalProperties: false,
}

export const ugclaneExperimentsGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    platform: { type: 'string', description: 'Target platform' },
    goal: { type: 'string', description: 'Experiment goal' },
    variables: { type: 'array', items: { type: 'string' }, description: 'Variables to test' },
    durationDays: { type: 'number', description: 'Experiment duration in days' },
  },
  required: ['platform', 'goal'],
  additionalProperties: false,
}

export const ugclaneReportGenerateSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    platform: { type: 'string', description: 'Target platform' },
    period: { type: 'string', description: 'Report period (e.g. 7d, 30d, 90d)' },
    metrics: { type: 'object', description: 'Metrics data for the report', additionalProperties: true },
    goal: { type: 'string', description: 'Content goal' },
  },
  required: ['platform', 'period', 'metrics'],
  additionalProperties: false,
}

export const ugclaneExportMarkdownSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    content: { type: 'object', description: 'Content data to export', additionalProperties: true },
    title: { type: 'string', description: 'Document title' },
    sections: { type: 'array', items: { type: 'string' }, description: 'Sections to include' },
  },
  required: ['content'],
  additionalProperties: false,
}

export const ugclaneExportJsonSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    content: { type: 'object', description: 'Content data to export', additionalProperties: true },
    format: { type: 'string', enum: ['pretty', 'compact'], description: 'JSON output format' },
  },
  required: ['content'],
  additionalProperties: false,
}

export const skillsExportClaudeSchema: McpToolInputSchema = {
  type: 'object',
  properties: {
    skill: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name' },
        skillMd: { type: 'string', description: 'Skill markdown content' },
        title: { type: 'string', description: 'Skill title' },
        description: { type: 'string', description: 'Skill description' },
        metadata: { type: 'object', description: 'Optional metadata' },
      },
      required: ['name', 'skillMd'],
      description: 'Skill object to export',
    },
  },
  required: ['skill'],
  additionalProperties: false,
}
