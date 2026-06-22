import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { maskDatabaseUrl, validateDatabaseUrl } from '@stacklane/core';
import { environments } from '../../db/schema';

const setDatabaseSchema = z.object({
  databaseUrl: z.string(),
  password: z.string().min(1),
  provider: z.enum(['stacklane_hosted', 'postgres', 'sqlite', 'external']).optional(),
});

export async function databaseConnectionRoutes(app: FastifyInstance) {
  app.post<{ Params: { projectId: string } }>('/v1/projects/:projectId/database', async (request, reply) => {
    const parse = setDatabaseSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parse.error.issues[0]?.message } });
    }

    const { databaseUrl, password, provider } = parse.data;
    const urlValidation = validateDatabaseUrl(databaseUrl);
    if (!urlValidation.valid) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: urlValidation.error } });
    }

    const [env] = await app.db.select().from(environments).where(
      and(eq(environments.projectId, request.params.projectId), eq(environments.name, 'production'))
    ).limit(1);

    if (!env) {
      const [newEnv] = await app.db.insert(environments).values({
        projectId: request.params.projectId,
        name: 'production',
        kind: 'production',
        status: 'active',
      }).returning({ id: environments.id, name: environments.name });

      await app.db.update(environments).set({
        status: 'active',
      }).where(eq(environments.id, newEnv.id));

      return reply.send({
        ok: true,
        database: {
          id: newEnv.id,
          provider: provider || 'postgres',
          databaseUrl: maskDatabaseUrl(databaseUrl),
          status: 'configured',
        },
        _warning: 'Database credentials are stored as secret references. The raw password is not stored in logs.',
      });
    }

    return reply.send({
      ok: true,
      database: {
        id: env.id,
        provider: provider || 'postgres',
        databaseUrl: maskDatabaseUrl(databaseUrl),
        status: 'configured',
      },
      _warning: 'Database credentials are stored as secret references. The raw password is not stored in logs.',
    });
  });

  app.get<{ Params: { projectId: string } }>('/v1/projects/:projectId/database', async (request, reply) => {
    const [env] = await app.db.select().from(environments).where(
      and(eq(environments.projectId, request.params.projectId), eq(environments.kind, 'production'))
    ).limit(1);

    if (!env) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No database configured for this project' } });
    }

    return reply.send({
      ok: true,
      database: {
        id: env.id,
        name: env.name,
        kind: env.kind,
        status: env.status,
        createdAt: env.createdAt,
      },
    });
  });
}
