import type { FastifyInstance } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { usageEvents } from '../../db/schema';

export async function auditRoutes(app: FastifyInstance) {
  app.get<{ Params: { projectId: string } }>('/v1/projects/:projectId/audit', async (request, reply) => {
    const { projectId } = request.params;
    const limit = Math.min(Number((request.query as any)?.limit) || 50, 200);

    const events = await app.db.select().from(usageEvents)
      .where(eq(usageEvents.projectId, projectId))
      .orderBy(desc(usageEvents.createdAt))
      .limit(limit);

    return reply.send({
      ok: true,
      events: events.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        action: e.eventType,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
    });
  });
}
