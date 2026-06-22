import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { generateAccessToken, hashToken, verifyToken } from '@stacklane/core';
import { apiKeys } from '../../db/schema';

const createTokenSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
});

export async function tokenRoutes(app: FastifyInstance) {
  app.post<{ Params: { projectId: string } }>('/v1/projects/:projectId/tokens', async (request, reply) => {
    const parse = createTokenSchema.safeParse({ ...request.body, projectId: request.params.projectId });
    if (!parse.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parse.error.issues[0]?.message } });
    }

    const { projectId, name, scopes } = parse.data;

    const { rawToken, record } = generateAccessToken(projectId, name);

    const inserted = await app.db.insert(apiKeys).values({
      projectId: record.projectId,
      name: record.name,
      keyPrefix: record.tokenPrefix,
      hashedKey: record.tokenHash,
      scopes: scopes || record.scopes,
      status: 'active',
    }).returning({ id: apiKeys.id });

    return reply.status(201).send({
      ok: true,
      token: {
        id: inserted[0].id,
        rawToken,
        prefix: record.tokenPrefix,
        name: record.name,
        scopes: record.scopes,
        createdAt: record.createdAt,
      },
      _warning: 'Store rawToken securely. It will not be shown again.',
    });
  });

  app.post('/v1/tokens/verify', async (request, reply) => {
    const { token } = request.body as { token?: string };
    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'token is required' } });
    }

    const hashedToken = hashToken(token);
    const [key] = await app.db.select().from(apiKeys).where(
      and(eq(apiKeys.hashedKey, hashedToken), eq(apiKeys.status, 'active'))
    ).limit(1);

    if (!key) {
      return reply.status(401).send({ ok: false, valid: false, error: 'Invalid or revoked token' });
    }

    await app.db.update(apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiKeys.id, key.id));

    return reply.send({ ok: true, valid: true, projectId: key.projectId, scopes: key.scopes });
  });

  app.post<{ Params: { projectId: string; tokenId: string } }>('/v1/projects/:projectId/tokens/:tokenId/revoke', async (request, reply) => {
    const { projectId, tokenId } = request.params;

    const [key] = await app.db.select().from(apiKeys).where(
      and(eq(apiKeys.id, tokenId), eq(apiKeys.projectId, projectId))
    ).limit(1);

    if (!key) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Token not found' } });
    }

    await app.db.update(apiKeys).set({
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    }).where(eq(apiKeys.id, tokenId));

    return reply.send({ ok: true, message: 'Token revoked' });
  });
}
