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
