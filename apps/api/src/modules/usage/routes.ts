import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { listUsageEvents, recordUsageEvent, summarizeUsage, summarizeUsageByAction, summarizeUsageByCustomer, summarizeUsageByProduct } from '@stacklane/storage';

const createUsageSchema = z.object({
  customerId: z.string().optional(),
  apiKeyId: z.string().optional(),
  product: z.string().min(1),
  action: z.string().min(1),
  units: z.number().positive().default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function usageRoutes(app: FastifyInstance) {
  app.post('/v1/usage/events', async (request, reply) => {
    const parsed = createUsageSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    return reply.status(201).send({ ok: true, event: recordUsageEvent(parsed.data) });
  });

  app.get('/v1/usage/events', async (request, reply) => {
    const query = request.query as { customerId?: string; product?: string; action?: string; from?: string; to?: string };
    return reply.send({ ok: true, events: listUsageEvents(query) });
  });

  app.get('/v1/usage/summary', async (request, reply) => {
    const query = request.query as { customerId?: string; product?: string; action?: string; from?: string; to?: string };
    return reply.send({ ok: true, summary: summarizeUsage(query), byCustomer: summarizeUsageByCustomer(query), byProduct: summarizeUsageByProduct(query), byAction: summarizeUsageByAction(query) });
  });
}
