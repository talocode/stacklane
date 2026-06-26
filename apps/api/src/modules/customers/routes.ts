import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createApiKeyRecord, createCustomer, getCustomer, listApiKeys, listCustomers, revokeApiKey, touchApiKeyLastUsed, updateCustomer, verifyStoredApiKey } from '@stacklane/storage';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  externalRef: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  externalRef: z.string().optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

const createApiKeySchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  scopes: z.array(z.string()).default(['*']),
  mode: z.enum(['dev', 'live']).default('dev'),
});

export async function customerRoutes(app: FastifyInstance) {
  app.post('/v1/customers', async (request, reply) => {
    const parsed = createCustomerSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    return reply.status(201).send({ ok: true, customer: createCustomer(parsed.data) });
  });

  app.get('/v1/customers', async (_request, reply) => {
    return reply.send({ ok: true, customers: listCustomers() });
  });

  app.get<{ Params: { id: string } }>('/v1/customers/:id', async (request, reply) => {
    const customer = getCustomer(request.params.id);
    if (!customer) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    return reply.send({ ok: true, customer });
  });

  app.patch<{ Params: { id: string } }>('/v1/customers/:id', async (request, reply) => {
    const parsed = updateCustomerSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    const customer = updateCustomer(request.params.id, parsed.data);
    if (!customer) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    return reply.send({ ok: true, customer });
  });

  app.post('/v1/api-keys', async (request, reply) => {
    const parsed = createApiKeySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    const { rawKey, apiKey } = createApiKeyRecord(parsed.data);
    return reply.status(201).send({ ok: true, apiKey, rawKey, warning: 'Store this key securely. It will not be shown again.' });
  });

  app.get('/v1/api-keys', async (request, reply) => {
    const query = request.query as { customerId?: string };
    return reply.send({ ok: true, apiKeys: listApiKeys(query) });
  });

  app.post<{ Params: { id: string } }>('/v1/api-keys/:id/revoke', async (request, reply) => {
    const apiKey = revokeApiKey(request.params.id);
    if (!apiKey) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
    return reply.send({ ok: true, apiKey });
  });

  app.post('/v1/api-keys/verify', async (request, reply) => {
    const key = (request.body as { key?: string })?.key;
    if (!key || typeof key !== 'string') return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'key is required' } });
    const apiKey = verifyStoredApiKey(key);
    if (!apiKey) return reply.status(401).send({ ok: false, error: { code: 'INVALID_API_KEY', message: 'Missing, invalid, or revoked API key' } });
    touchApiKeyLastUsed(apiKey.id);
    return reply.send({ ok: true, valid: true, apiKeyId: apiKey.id, customerId: apiKey.customerId, scopes: apiKey.scopes });
  });
}
