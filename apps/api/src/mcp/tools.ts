import { createProductClient } from './product-client'
import { mapHttpStatusToMcpError, MCP_ERROR_CODES } from './errors'
import {
  teraWritingRewriteSchema,
  teraWritingDraftSchema,
  teraCodingExplainSchema,
  teraCodingReviewSchema,
  routerChatSchema,
  agentBrowserCheckSchema,
  agentBrowserScreenshotSchema,
  agentBrowserTraceReportSchema,
  cliploopBriefGenerateSchema,
  cliploopScriptGenerateSchema,
  cliploopVideoRenderSchema,
  cliploopCampaignCreateSchema,
  cliploopCampaignPackageSchema,
  cloudPricingSchema,
} from './schemas'
import type { McpToolDefinition, McpToolResult } from './types'

export interface ToolContext {
  apiKey: string
}

export async function callTool(
  tool: McpToolDefinition,
  args: Record<string, unknown> | undefined,
  ctx: ToolContext,
): Promise<McpToolResult> {
  const client = createProductClient(ctx.apiKey)

  const result = await client.request(tool.method, tool.route, args)

  if (!result.ok) {
    const mcpError = mapHttpStatusToMcpError(result.status, result.body)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ok: false, error: mcpError.message, code: mcpError.code, data: mcpError.data ?? null }),
        },
      ],
      isError: true,
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: true, data: result.body }),
      },
    ],
  }
}

export const ALL_TOOLS: McpToolDefinition[] = [
  {
    name: 'tera_writing_rewrite',
    description: 'Rewrite text with a specific style and tone using Tera. Provide text to rewrite and optional style/tone/maxLength parameters.',
    inputSchema: teraWritingRewriteSchema,
    route: '/v1/tera/writing/rewrite',
    method: 'POST',
    product: 'tera',
    action: 'writing.rewrite',
    estimatedCredits: 5,
  },
  {
    name: 'tera_writing_draft',
    description: 'Draft content (email, social post, announcement, article, doc) using Tera. Provide type and brief describing what to write.',
    inputSchema: teraWritingDraftSchema,
    route: '/v1/tera/writing/draft',
    method: 'POST',
    product: 'tera',
    action: 'writing.draft',
    estimatedCredits: 10,
  },
  {
    name: 'tera_coding_explain',
    description: 'Explain code at beginner, intermediate, or advanced level using Tera. Provide language and code snippet.',
    inputSchema: teraCodingExplainSchema,
    route: '/v1/tera/coding/explain',
    method: 'POST',
    product: 'tera',
    action: 'coding.explain',
    estimatedCredits: 10,
  },
  {
    name: 'tera_coding_review',
    description: 'Review code for issues, bugs, security, and performance using Tera. Provide language and code to review.',
    inputSchema: teraCodingReviewSchema,
    route: '/v1/tera/coding/review',
    method: 'POST',
    product: 'tera',
    action: 'coding.review',
    estimatedCredits: 20,
  },
  {
    name: 'router_chat',
    description: 'Send a chat completion to the Talocode router. Supports talocode/auto, talocode/fast, talocode/coding and provider-specific models.',
    inputSchema: routerChatSchema,
    route: '/v1/router/chat/completions',
    method: 'POST',
    product: 'router',
    action: 'chat.completions',
    estimatedCredits: null,
  },
  {
    name: 'agent_browser_check',
    description: 'Check a website URL for status, content, and optionally capture a screenshot or run vision analysis. Provide URL to check.',
    inputSchema: agentBrowserCheckSchema,
    route: '/v1/agent-browser/check',
    method: 'POST',
    product: 'agent_browser',
    action: 'browser.check',
    estimatedCredits: 5,
  },
  {
    name: 'agent_browser_screenshot',
    description: 'Capture a screenshot of a website URL. Optionally set fullPage, viewport width/height. Provide URL to screenshot.',
    inputSchema: agentBrowserScreenshotSchema,
    route: '/v1/agent-browser/screenshot',
    method: 'POST',
    product: 'agent_browser',
    action: 'browser.screenshot',
    estimatedCredits: 8,
  },
  {
    name: 'agent_browser_trace_report',
    description: 'Execute browser trace steps on a URL and report results. Provide URL and array of steps (click, type, navigate).',
    inputSchema: agentBrowserTraceReportSchema,
    route: '/v1/agent-browser/trace-report',
    method: 'POST',
    product: 'agent_browser',
    action: 'browser.trace_report',
    estimatedCredits: 15,
  },
  {
    name: 'cliploop_brief_generate',
    description: 'Generate a video brief for short-form content. Provide a prompt describing the video concept and optional channel/tone/duration.',
    inputSchema: cliploopBriefGenerateSchema,
    route: '/v1/cliploop/brief/generate',
    method: 'POST',
    product: 'cliploop',
    action: 'brief.generate',
    estimatedCredits: 15,
  },
  {
    name: 'cliploop_script_generate',
    description: 'Generate a video script from a brief. Provide the briefId from brief generation.',
    inputSchema: cliploopScriptGenerateSchema,
    route: '/v1/cliploop/script/generate',
    method: 'POST',
    product: 'cliploop',
    action: 'script.generate',
    estimatedCredits: 15,
  },
  {
    name: 'cliploop_video_render',
    description: 'Render a video from a script. Provide the scriptId from script generation and optional format/quality.',
    inputSchema: cliploopVideoRenderSchema,
    route: '/v1/cliploop/video/render',
    method: 'POST',
    product: 'cliploop',
    action: 'video.render',
    estimatedCredits: 200,
  },
  {
    name: 'cliploop_campaign_create',
    description: 'Create a ClipLoop campaign. Provide name and platform.',
    inputSchema: cliploopCampaignCreateSchema,
    route: '/v1/cliploop/campaign/create',
    method: 'POST',
    product: 'cliploop',
    action: 'campaign.create',
    estimatedCredits: 50,
  },
  {
    name: 'cliploop_campaign_package',
    description: 'Package a ClipLoop campaign for delivery. Provide campaignId.',
    inputSchema: cliploopCampaignPackageSchema,
    route: '/v1/cliploop/campaign/package',
    method: 'POST',
    product: 'cliploop',
    action: 'campaign.package',
    estimatedCredits: 400,
  },
  {
    name: 'cloud_pricing',
    description: 'Get the full Talocode Cloud pricing catalog with all products, actions, and credit costs.',
    inputSchema: cloudPricingSchema,
    route: '/api/v1/cloud/pricing',
    method: 'GET',
    product: 'cloud',
    action: 'pricing.list',
    estimatedCredits: null,
  },
]

export const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]))
export const TOOL_NAMES = ALL_TOOLS.map((t) => t.name)
