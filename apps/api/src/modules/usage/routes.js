"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageRoutes = usageRoutes;
const zod_1 = require("zod");
const storage_1 = require("@stacklane/storage");
const createUsageSchema = zod_1.z.object({
    customerId: zod_1.z.string().optional(),
    apiKeyId: zod_1.z.string().optional(),
    product: zod_1.z.string().min(1),
    action: zod_1.z.string().min(1),
    units: zod_1.z.number().positive().default(1),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
async function usageRoutes(app) {
    app.post('/v1/usage/events', async (request, reply) => {
        const parsed = createUsageSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
        return reply.status(201).send({ ok: true, event: (0, storage_1.recordUsageEvent)(parsed.data) });
    });
    app.get('/v1/usage/events', async (request, reply) => {
        const query = request.query;
        return reply.send({ ok: true, events: (0, storage_1.listUsageEvents)(query) });
    });
    app.get('/v1/usage/summary', async (request, reply) => {
        const query = request.query;
        return reply.send({ ok: true, summary: (0, storage_1.summarizeUsage)(query), byCustomer: (0, storage_1.summarizeUsageByCustomer)(query), byProduct: (0, storage_1.summarizeUsageByProduct)(query), byAction: (0, storage_1.summarizeUsageByAction)(query) });
    });
}
//# sourceMappingURL=routes.js.map