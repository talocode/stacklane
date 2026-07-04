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
