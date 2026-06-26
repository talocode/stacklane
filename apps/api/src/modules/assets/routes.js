"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetRoutes = assetRoutes;
const zod_1 = require("zod");
const storage_1 = require("@stacklane/storage");
const createAssetSchema = zod_1.z.object({
    customerId: zod_1.z.string().optional(),
    product: zod_1.z.string().min(1),
    filename: zod_1.z.string().min(1),
    contentType: zod_1.z.string().min(1),
    sizeBytes: zod_1.z.number().int().nonnegative().optional(),
    dataBase64: zod_1.z.string().optional(),
    publicUrl: zod_1.z.string().url().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
async function assetRoutes(app) {
    app.post('/v1/assets', async (request, reply) => {
        const parsed = createAssetSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
        let storagePath = `${parsed.data.product}/${parsed.data.filename}`;
        let checksum;
        let sizeBytes = parsed.data.sizeBytes || 0;
        if (parsed.data.dataBase64) {
            const buffer = Buffer.from(parsed.data.dataBase64, 'base64');
            sizeBytes = buffer.byteLength;
            const stored = (0, storage_1.saveLocalFile)({ product: parsed.data.product, filename: parsed.data.filename, buffer, contentType: parsed.data.contentType });
            storagePath = stored.storagePath;
            checksum = stored.checksum;
        }
        const asset = (0, storage_1.createAssetRecord)({
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
        const query = request.query;
        return reply.send({ ok: true, assets: (0, storage_1.listAssets)(query) });
    });
    app.get('/v1/assets/:id', async (request, reply) => {
        const asset = (0, storage_1.getAsset)(request.params.id);
        if (!asset)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
        return reply.send({ ok: true, asset });
    });
    app.delete('/v1/assets/:id', async (request, reply) => {
        const asset = (0, storage_1.deleteAssetRecord)(request.params.id);
        if (!asset)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
        return reply.send({ ok: true, deleted: true, asset });
    });
}
//# sourceMappingURL=routes.js.map