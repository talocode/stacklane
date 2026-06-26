import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createAssetRecord, deleteAssetRecord, getAsset, listAssets, saveLocalFile } from '@stacklane/storage';

const createAssetSchema = z.object({
  customerId: z.string().optional(),
  product: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  dataBase64: z.string().optional(),
  publicUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function assetRoutes(app: FastifyInstance) {
  app.post('/v1/assets', async (request, reply) => {
    const parsed = createAssetSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    let storagePath = `${parsed.data.product}/${parsed.data.filename}`;
    let checksum: string | undefined;
    let sizeBytes = parsed.data.sizeBytes || 0;
    if (parsed.data.dataBase64) {
      const buffer = Buffer.from(parsed.data.dataBase64, 'base64');
      sizeBytes = buffer.byteLength;
      const stored = saveLocalFile({ product: parsed.data.product, filename: parsed.data.filename, buffer, contentType: parsed.data.contentType });
      storagePath = stored.storagePath;
      checksum = stored.checksum;
    }
    const asset = createAssetRecord({
      customerId: parsed.data.customerId,
      product: parsed.data.product,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      sizeBytes,
      storagePath,
      publicUrl: parsed.data.publicUrl,
      checksum,
      metadata: parsed.data.metadata,
    });
    return reply.status(201).send({ ok: true, asset });
  });

  app.get('/v1/assets', async (request, reply) => {
    const query = request.query as { customerId?: string; product?: string };
    return reply.send({ ok: true, assets: listAssets(query) });
  });

  app.get<{ Params: { id: string } }>('/v1/assets/:id', async (request, reply) => {
    const asset = getAsset(request.params.id);
    if (!asset) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    return reply.send({ ok: true, asset });
  });

  app.delete<{ Params: { id: string } }>('/v1/assets/:id', async (request, reply) => {
    const asset = deleteAssetRecord(request.params.id);
    if (!asset) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    return reply.send({ ok: true, deleted: true, asset });
  });
}
