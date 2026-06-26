import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { saveLocalFile } from '@stacklane/storage';

const uploadSchema = z.object({
  customerId: z.string().optional(),
  product: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  dataBase64: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function fileRoutes(app: FastifyInstance) {
  app.post('/v1/files', async (request, reply) => {
    const parsed = uploadSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    const buffer = Buffer.from(parsed.data.dataBase64, 'base64');
    try {
      const file = saveLocalFile({ product: parsed.data.product, filename: parsed.data.filename, buffer, contentType: parsed.data.contentType });
      return reply.status(201).send({ ok: true, file });
    } catch (error) {
      return reply.status(400).send({ error: { code: 'STORAGE_ERROR', message: error instanceof Error ? error.message : 'Failed to save local file' } });
    }
  });
}
