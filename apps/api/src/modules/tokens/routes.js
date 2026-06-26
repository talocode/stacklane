"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenRoutes = tokenRoutes;
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("@stacklane/core");
const schema_1 = require("../../db/schema");
const createTokenSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    scopes: zod_1.z.array(zod_1.z.string()).optional(),
});
async function tokenRoutes(app) {
    app.post('/v1/projects/:projectId/tokens', async (request, reply) => {
        const parse = createTokenSchema.safeParse({ ...request.body, projectId: request.params.projectId });
        if (!parse.success) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parse.error.issues[0]?.message } });
        }
        const { projectId, name, scopes } = parse.data;
        const { rawToken, record } = (0, core_1.generateAccessToken)(projectId, name);
        const inserted = await app.db.insert(schema_1.apiKeys).values({
            projectId: record.projectId,
            name: record.name,
            keyPrefix: record.tokenPrefix,
            hashedKey: record.tokenHash,
            scopes: scopes || record.scopes,
            status: 'active',
        }).returning({ id: schema_1.apiKeys.id });
        return reply.status(201).send({
            ok: true,
            token: {
                id: inserted[0].id,
                rawToken,
                prefix: record.tokenPrefix,
                name: record.name,
                scopes: record.scopes,
                createdAt: record.createdAt,
            },
            _warning: 'Store rawToken securely. It will not be shown again.',
        });
    });
    app.post('/v1/tokens/verify', async (request, reply) => {
        const { token } = request.body;
        if (!token || typeof token !== 'string') {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'token is required' } });
        }
        const hashedToken = (0, core_1.hashToken)(token);
        const [key] = await app.db.select().from(schema_1.apiKeys).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.apiKeys.hashedKey, hashedToken), (0, drizzle_orm_1.eq)(schema_1.apiKeys.status, 'active'))).limit(1);
        if (!key) {
            return reply.status(401).send({ ok: false, valid: false, error: 'Invalid or revoked token' });
        }
        await app.db.update(schema_1.apiKeys).set({ lastUsedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.apiKeys.id, key.id));
        return reply.send({ ok: true, valid: true, projectId: key.projectId, scopes: key.scopes });
    });
    app.post('/v1/projects/:projectId/tokens/:tokenId/revoke', async (request, reply) => {
        const { projectId, tokenId } = request.params;
        const [key] = await app.db.select().from(schema_1.apiKeys).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.apiKeys.id, tokenId), (0, drizzle_orm_1.eq)(schema_1.apiKeys.projectId, projectId))).limit(1);
        if (!key) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Token not found' } });
        }
        await app.db.update(schema_1.apiKeys).set({
            status: 'revoked',
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(schema_1.apiKeys.id, tokenId));
        return reply.send({ ok: true, message: 'Token revoked' });
    });
}
//# sourceMappingURL=routes.js.map