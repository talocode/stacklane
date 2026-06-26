"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileRoutes = fileRoutes;
const zod_1 = require("zod");
const storage_1 = require("@stacklane/storage");
const uploadSchema = zod_1.z.object({
    customerId: zod_1.z.string().optional(),
    product: zod_1.z.string().min(1),
    filename: zod_1.z.string().min(1),
    contentType: zod_1.z.string().min(1),
    dataBase64: zod_1.z.string().min(1),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
async function fileRoutes(app) {
    app.post('/v1/files', async (request, reply) => {
        const parsed = uploadSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
        const buffer = Buffer.from(parsed.data.dataBase64, 'base64');
        try {
            const file = (0, storage_1.saveLocalFile)({ product: parsed.data.product, filename: parsed.data.filename, buffer, contentType: parsed.data.contentType });
            return reply.status(201).send({ ok: true, file });
        }
        catch (error) {
            return reply.status(400).send({ error: { code: 'STORAGE_ERROR', message: error instanceof Error ? error.message : 'Failed to save local file' } });
        }
    });
}
//# sourceMappingURL=routes.js.map