import type { FastifyInstance } from 'fastify';

export async function assetRoutes(app: FastifyInstance) {
  app.post<{ Params: { projectId: string } }>('/v1/projects/:projectId/assets', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const asset = {
      id: 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      projectId: request.params.projectId,
      type: body.type || 'unknown',
      status: 'created',
      format: body.format || 'png',
      metadata: body.metadata || {},
      createdAt: new Date().toISOString(),
    };
    return reply.status(201).send({ ok: true, asset });
  });

  app.get<{ Params: { projectId: string } }>('/v1/projects/:projectId/assets', async (request, reply) => {
    return reply.send({ ok: true, assets: [] });
  });

  app.get<{ Params: { projectId: string; assetId: string } }>('/v1/projects/:projectId/assets/:assetId', async (request, reply) => {
    return reply.send({ ok: true, asset: { id: request.params.assetId, projectId: request.params.projectId } });
  });
}
