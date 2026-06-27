import { z } from 'zod'

export const mcpConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  mode: z.enum(['local']).default('local'),
})

export type McpConfig = z.infer<typeof mcpConfigSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const baseUrl = env.STACKLANE_MCP_BASE_URL || 'http://localhost:7331'
  const apiKey = env.STACKLANE_MCP_API_KEY || undefined
  const mode = env.STACKLANE_MCP_MODE || 'local'

  const parsed = mcpConfigSchema.safeParse({ baseUrl, apiKey, mode })
  if (!parsed.success) {
    throw new Error(`Invalid Stacklane MCP config: ${parsed.error.issues[0]?.message}`)
  }
  return parsed.data
}

export interface ConfigStatus {
  baseUrl: string
  mode: string
  apiKeyPresent: boolean
  apiKeyValue: never
}

export function describeConfig(config: McpConfig): ConfigStatus {
  return {
    baseUrl: config.baseUrl,
    mode: config.mode,
    apiKeyPresent: Boolean(config.apiKey),
    apiKeyValue: undefined as never,
  }
}
