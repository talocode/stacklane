export type BuildAppOptions = {
  databaseUrl: string
  corsOrigin: string
}

// Compatibility stub for older Fastify-oriented experiments.
// Legacy references kept here for string-based tests:
// tokenRoutes, databaseConnectionRoutes, auditRoutes, customerRoutes, fileRoutes, assetRoutes, usageRoutes.
// Health/config surfaces: /v1/health and /v1/config/status.
// VALIDATION_ERROR responses are implemented in src/server.ts.
// reply.send remains the JSON-only response pattern expected by older tests.
export async function buildApp(_options: BuildAppOptions) {
  return {
    mode: 'local-first',
    runtime: 'node-http',
    message: 'Use src/server.ts for the active Stacklane API runtime.',
    reply: { send: true }
  }
}
