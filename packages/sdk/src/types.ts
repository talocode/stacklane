// ─── Common ───

export interface UsageMeta {
  credits: number
  action: string
}

export interface ApiErrorShape {
  code: string
  message: string
  requestId?: string
  details?: Record<string, unknown>
  required?: number
  available?: number
}

// ─── Tera API ───

export interface TeraRewriteInput {
  text: string
  style?: string
  tone?: string
  maxLength?: number
}

export interface TeraRewriteResult {
  text: string
  notes: string[]
}

export interface TeraDraftInput {
  type: 'email' | 'social_post' | 'announcement' | 'article' | 'doc' | 'custom'
  brief: string
  audience?: string
  tone?: string
  maxLength?: number
  customType?: string
  points?: string[]
}

export interface TeraDraftResult {
  text: string
  notes: string[]
}

export interface TeraExplainInput {
  language: string
  code: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  focus?: string[]
}

export interface TeraExplainResult {
  explanation: string
  keyConcepts: string[]
  suggestions?: string[]
}

export interface TeraReviewInput {
  language: string
  code: string
  focus?: string[]
  strictness?: 'gentle' | 'normal' | 'strict'
}

export interface TeraReviewResult {
  issues: TeraReviewIssue[]
  summary: string
  score: number
}

export interface TeraReviewIssue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  title: string
  description: string
  line?: number
  suggestion?: string
}

export interface TeraCapabilityEntry {
  id: string
  object: string
  description: string
  credits: number
  methods: string[]
  routes: string[]
}

export interface TeraPricingEntry {
  action: string
  credits: number
  usdValue: number
}

export interface TeraSuccessResponse<T> {
  id: string
  object: string
  result: T
  usage: UsageMeta
}

export interface TeraListResponse<T> {
  object: 'list'
  data: T[]
}

export interface TeraHealthResponse {
  status: string
  version: string
  endpoints: string[]
}

// ─── Router API ───

export interface RouterChatInput {
  model: string
  messages: RouterMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
  requestId?: string
}

export interface RouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface RouterChatResponse {
  id: string
  object: string
  created: number
  model: string
  provider: string
  choices: RouterChoice[]
  usage: RouterUsage
}

export interface RouterChoice {
  index: number
  message: RouterMessage
  finish_reason: string
}

export interface RouterUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface RouterModel {
  id: string
  object: string
  created: number
  owned_by: string
  context_length?: number
}

export interface RouterModelsResponse {
  object: 'list'
  data: RouterModel[]
}

export interface RouterHealthResponse {
  status: string
  provider: string
  model: string
  requestId: string
}

export interface RouterProviderInfo {
  name: string
  status: string
  models: string[]
}

export interface RouterProvidersResponse {
  object: 'list'
  data: RouterProviderInfo[]
}

// ─── Agent Browser API ───

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
  checks: AgentBrowserCheck[]
  durationMs: number
  url: string
  finalUrl?: string
}

export interface AgentBrowserCheck {
  name: string
  passed: boolean
  detail?: string
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
}

export interface AgentBrowserTraceReportInput {
  url: string
  sessionId?: string
  steps: { action: string; selector?: string; value?: string }[]
}

export interface AgentBrowserTraceReportResult {
  url: string
  steps: number
  passed: number
  failed: number
  durationMs: number
  reportUrl?: string
}

// ─── ClipLoop API ───

export interface ClipLoopBriefInput {
  prompt: string
  channel?: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin'
  tone?: string
  duration?: number
  cta?: string
}

export interface ClipLoopBriefResult {
  id: string
  brief: string
  channel: string
  estimatedDuration: number
}

export interface ClipLoopScriptInput {
  briefId: string
  style?: string
}

export interface ClipLoopScriptResult {
  id: string
  script: string
  scenes: ClipLoopScriptScene[]
}

export interface ClipLoopScriptScene {
  index: number
  visual: string
  narration: string
  duration: number
}

export interface ClipLoopVideoRenderInput {
  scriptId: string
  format?: 'portrait' | 'landscape' | 'square'
  quality?: 'draft' | 'standard' | 'high'
}

export interface ClipLoopVideoRenderResult {
  id: string
  status: 'rendering' | 'completed' | 'failed'
  url?: string
  duration: number
  creditsCharged: number
}

export interface ClipLoopCampaignCreateInput {
  name: string
  platform: string
  schedule?: string
}

export interface ClipLoopCampaignResult {
  id: string
  name: string
  status: string
  videos: string[]
}

// ─── Codra API ───

export interface CodraFileInput {
  path: string
  content: string
}

export interface CodraRepoSummaryInput {
  files: CodraFileInput[]
  focus?: string[]
}

export interface CodraRepoSummaryResult {
  summary: string
  architecture: string[]
  risks: string[]
  nextSteps: string[]
}

export interface CodraExplainInput {
  language: string
  code: string
  level?: 'beginner' | 'intermediate' | 'expert'
}

export interface CodraExplainResult {
  explanation: string
  keyConcepts: string[]
  suggestions?: string[]
}

export interface CodraReviewInput {
  language: string
  code: string
  focus?: string[]
  strictness?: 'gentle' | 'normal' | 'strict'
}

export interface CodraReviewResult {
  issues: CodraReviewIssue[]
  summary: string
  score: number
}

export interface CodraReviewIssue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  title: string
  description: string
  line?: number
  suggestion?: string
}

export interface CodraPlanInput {
  task: string
  context?: string
  constraints?: string[]
}

export interface CodraPlanResult {
  plan: string
  steps: CodraPlanStep[]
  risks: string[]
  estimatedEffort: string
}

export interface CodraPlanStep {
  order: number
  title: string
  description: string
  files?: string[]
  effort: 'small' | 'medium' | 'large'
}

export interface CodraSuccessResponse<T> {
  id: string
  object: string
  result: T
  usage: {
    credits: number
    action: string
  }
}

// ─── Skills API ───

export interface SkillsGenerateProfileInput {
  username: string
  target: 'cursor' | 'claude' | 'opencode' | 'codra'
  focus?: string[]
  includeRepositories?: boolean
  maxRepositories?: number
}

export interface SkillsGenerateRepoInput {
  repoUrl: string
  target: 'cursor' | 'claude' | 'opencode' | 'codra'
  focus?: string[]
}

export interface SkillsGenerateDocsInput {
  url: string
  target: 'cursor' | 'claude' | 'opencode' | 'codra'
  focus?: string[]
}

export interface SkillsGenerateTextInput {
  name: string
  content: string
  target: 'cursor' | 'claude' | 'opencode' | 'codra'
  focus?: string[]
}

export interface SkillsExportInput {
  skill: {
    name: string
    skillMd: string
    metadata?: Record<string, unknown>
  }
}

export interface SkillsExportFile {
  path: string
  content: string
}

export interface SkillsExportResult {
  files: SkillsExportFile[]
}

export interface SkillsGenerated {
  name: string
  title: string
  description: string
  skillMd: string
  references?: { path: string; content: string }[]
  metadata: Record<string, unknown>
}

export interface SkillsGenerateResult {
  id: string
  object: string
  source: {
    type: 'github_profile' | 'github_repo' | 'docs' | 'text'
    username?: string
    repoUrl?: string
    url?: string
    name?: string
  }
  skill: SkillsGenerated
  exports: {
    cursor?: { files: SkillsExportFile[] }
    claude?: { files: SkillsExportFile[] }
  }
  usage: UsageMeta
}

export interface SkillsHealthResponse {
  status: string
  version: string
  endpoints: string[]
}

// ─── Tradia API ───

export interface TradiaHealthResponse {
  status: string
  version: string
  endpoints: string[]
}

export interface TradiaSuccessResponse {
  id: string
  object: string
  result: unknown
  usage: UsageMeta
}
