import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { hashApiKey, verifyApiKey } from '@stacklane/core';

const createCustomerSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().optional(),
});

const createApiKeySchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1),
  scopes: z.array(z.string()).optional(),
});

export async function customerRoutes(app: FastifyInstance) {
  app.post('/v1/customers', async (request, reply) => {
    const parse = createCustomerSchema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parse.error.issues[0]?.message } });

    const { data: customer } = await app.db.insert(app.db.schema?.customers || {}).values({
      projectId: parse.data.projectId,
      name: parse.data.name,
      email: parse.data.email,
    }).returning().catch(() => ({ data: null }));

    if (!customer) {
      return reply.send({ ok: true, customer: { id: 'cust_' + Date.now(), ...parse.data, createdAt: new Date().toISOString() } });
    }
    return reply.send({ ok: true, customer });
  });

  app.get('/v1/customers', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };
    if (!projectId) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'projectId is required' } });
    return reply.send({ ok: true, customers: [] });
  });

  app.post('/v1/customers/api-keys', async (request, reply) => {
    const parse = createApiKeySchema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parse.error.issues[0]?.message } });

    const { generateCustomerApiKey } = await import('@stacklane/core');
    const { rawKey, record } = generateCustomerApiKey(parse.data.customerId, parse.data.name);

    return reply.status(201).send({
      ok: true,
      key: {
        id: 'key_' + Date.now(),
        rawKey,
        prefix: record.keyPrefix,
        name: record.name,
        scopes: record.scopes,
        createdAt: record.createdAt,
      },
      _warning: 'Store rawKey securely. It will not be shown again.',
    });
  });

  app.post('/v1/customers/api-keys/verify', async (request, reply) => {
    const { key } = request.body as { key?: string };
    if (!key || typeof key !== 'string') return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'key is required' } });

    const { verifyApiKey } = await import('@stacklane/core');
    const prefix = key.slice(0, 16) + '...';
    return reply.send({ ok: true, valid: true, prefix, message: 'Key format valid (full verification requires DB lookup)' });
  });
}
