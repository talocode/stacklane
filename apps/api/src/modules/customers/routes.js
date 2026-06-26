"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRoutes = customerRoutes;
const zod_1 = require("zod");
const storage_1 = require("@stacklane/storage");
const createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional(),
    externalRef: zod_1.z.string().optional(),
});
const updateCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    externalRef: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'suspended', 'deleted']).optional(),
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
});
const createApiKeySchema = zod_1.z.object({
    customerId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    scopes: zod_1.z.array(zod_1.z.string()).default(['*']),
    mode: zod_1.z.enum(['dev', 'live']).default('dev'),
});
async function customerRoutes(app) {
    app.post('/v1/customers', async (request, reply) => {
        const parsed = createCustomerSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
        return reply.status(201).send({ ok: true, customer: (0, storage_1.createCustomer)(parsed.data) });
    });
    app.get('/v1/customers', async (_request, reply) => {
        return reply.send({ ok: true, customers: (0, storage_1.listCustomers)() });
    });
    app.get('/v1/customers/:id', async (request, reply) => {
        const customer = (0, storage_1.getCustomer)(request.params.id);
        if (!customer)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
        return reply.send({ ok: true, customer });
    });
    app.patch('/v1/customers/:id', async (request, reply) => {
        const parsed = updateCustomerSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
        const customer = (0, storage_1.updateCustomer)(request.params.id, parsed.data);
        if (!customer)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
        return reply.send({ ok: true, customer });
    });
    app.post('/v1/api-keys', async (request, reply) => {
        const parsed = createApiKeySchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
        const { rawKey, apiKey } = (0, storage_1.createApiKeyRecord)(parsed.data);
        return reply.status(201).send({ ok: true, apiKey, rawKey, warning: 'Store this key securely. It will not be shown again.' });
    });
    app.get('/v1/api-keys', async (request, reply) => {
        const query = request.query;
        return reply.send({ ok: true, apiKeys: (0, storage_1.listApiKeys)(query) });
    });
    app.post('/v1/api-keys/:id/revoke', async (request, reply) => {
        const apiKey = (0, storage_1.revokeApiKey)(request.params.id);
        if (!apiKey)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
        return reply.send({ ok: true, apiKey });
    });
    app.post('/v1/api-keys/verify', async (request, reply) => {
        const key = request.body?.key;
        if (!key || typeof key !== 'string')
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'key is required' } });
        const apiKey = (0, storage_1.verifyStoredApiKey)(key);
        if (!apiKey)
            return reply.status(401).send({ ok: false, error: { code: 'INVALID_API_KEY', message: 'Missing, invalid, or revoked API key' } });
        (0, storage_1.touchApiKeyLastUsed)(apiKey.id);
        return reply.send({ ok: true, valid: true, apiKeyId: apiKey.id, customerId: apiKey.customerId, scopes: apiKey.scopes });
    });
}
//# sourceMappingURL=routes.js.map