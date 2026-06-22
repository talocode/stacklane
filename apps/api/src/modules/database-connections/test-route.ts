import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { testDatabaseConnection, redactUrl } from '@stacklane/core';
import { environments } from '../../db/schema';

export async function databaseTestRoutes(app: FastifyInstance) {
  app.post<{ Params: { projectId: string } }>('/v1/projects/:projectId/database/test', async (request, reply) => {
    const { projectId } = request.params;

    const [env] = await app.db.select().from(environments).where(
      and(eq(environments.projectId, projectId), eq(environments.kind, 'production'))
    ).limit(1);

    if (!env) {
      return reply.send({
        ok: true,
        result: {
          ok: false,
          status: 'not_configured',
          provider: 'external',
          message: 'No database configured for this project.',
        },
      });
    }

    const databaseUrl = (env as any).database_url || (env as any).connectionString || '';
    const provider = (env as any).provider || 'postgres';

    if (!databaseUrl) {
      return reply.send({
        ok: true,
        result: {
          ok: false,
          status: 'not_configured',
          provider,
          message: 'Database URL is not configured.',
        },
      });
    }

    const startTime = Date.now();
    const result = await testDatabaseConnection(databaseUrl, provider);
    const latencyMs = Date.now() - startTime;

    return reply.send({
      ok: true,
      result: {
        ...result,
        latencyMs: result.latencyMs || latencyMs,
      },
    });
  });
}
