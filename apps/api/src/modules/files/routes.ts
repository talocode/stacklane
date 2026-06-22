import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeLocalFile, readLocalFile, deleteLocalFile, validateMimeType, sanitizeFilenameForStorage } from '@stacklane/storage';

const uploadFileSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).optional(),
  mimeType: z.string(),
  data: z.string(),
  visibility: z.enum(['private', 'public']).optional(),
});

export async function fileRoutes(app: FastifyInstance) {
  app.post<{ Params: { projectId: string } }>('/v1/projects/:projectId/files', async (request, reply) => {
    const parse = uploadFileSchema.safeParse({ ...request.body, projectId: request.params.projectId });
    if (!parse.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parse.error.issues[0]?.message } });

    const { name, mimeType, data, visibility } = parse.data;

    if (!validateMimeType(mimeType)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: `Unsupported MIME type: ${mimeType}` } });
    }

    const filename = name || 'upload';
    const sanitizedName = sanitizeFilenameForStorage(filename);
    const buffer = Buffer.from(data, 'base64');

    const { storageKey } = writeLocalFile(request.params.projectId, sanitizedName, buffer, mimeType);

    return reply.status(201).send({
      ok: true,
      file: {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        projectId: request.params.projectId,
        name: sanitizedName,
        originalName: filename,
        mimeType,
        sizeBytes: buffer.length,
        storageKey,
        storageProvider: 'local',
        visibility: visibility || 'private',
        createdAt: new Date().toISOString(),
      },
    });
  });

  app.get<{ Params: { projectId: string } }>('/v1/projects/:projectId/files', async (request, reply) => {
    return reply.send({ ok: true, files: [] });
  });

  app.get<{ Params: { projectId: string; fileId: string } }>('/v1/projects/:projectId/files/:fileId', async (request, reply) => {
    return reply.send({ ok: true, file: { id: request.params.fileId, projectId: request.params.projectId } });
  });

  app.get<{ Params: { projectId: string; fileId: string } }>('/v1/projects/:projectId/files/:fileId/download', async (request, reply) => {
    const buffer = readLocalFile(`${request.params.projectId}/${request.params.fileId}`);
    if (!buffer) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    return reply.header('Content-Type', 'application/octet-stream').send(buffer);
  });

  app.delete<{ Params: { projectId: string; fileId: string } }>('/v1/projects/:projectId/files/:fileId', async (request, reply) => {
    const deleted = deleteLocalFile(`${request.params.projectId}/${request.params.fileId}`);
    return reply.send({ ok: true, deleted });
  });
}
