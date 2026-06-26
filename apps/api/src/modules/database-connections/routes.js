"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConnectionRoutes = databaseConnectionRoutes;
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("@stacklane/core");
const schema_1 = require("../../db/schema");
const setDatabaseSchema = zod_1.z.object({
    databaseUrl: zod_1.z.string(),
    password: zod_1.z.string().min(1),
    provider: zod_1.z.enum(['stacklane_hosted', 'postgres', 'sqlite', 'external']).optional(),
});
async function databaseConnectionRoutes(app) {
    app.post('/v1/projects/:projectId/database', async (request, reply) => {
        const parse = setDatabaseSchema.safeParse(request.body);
        if (!parse.success) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parse.error.issues[0]?.message } });
        }
        const { databaseUrl, password, provider } = parse.data;
        const urlValidation = (0, core_1.validateDatabaseUrl)(databaseUrl);
        if (!urlValidation.valid) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: urlValidation.error } });
        }
        const [env] = await app.db.select().from(schema_1.environments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.environments.projectId, request.params.projectId), (0, drizzle_orm_1.eq)(schema_1.environments.name, 'production'))).limit(1);
        if (!env) {
            const [newEnv] = await app.db.insert(schema_1.environments).values({
                projectId: request.params.projectId,
                name: 'production',
                kind: 'production',
                status: 'active',
            }).returning({ id: schema_1.environments.id, name: schema_1.environments.name });
            await app.db.update(schema_1.environments).set({
                status: 'active',
            }).where((0, drizzle_orm_1.eq)(schema_1.environments.id, newEnv.id));
            return reply.send({
                ok: true,
                database: {
                    id: newEnv.id,
                    provider: provider || 'postgres',
                    databaseUrl: (0, core_1.maskDatabaseUrl)(databaseUrl),
                    status: 'configured',
                },
                _warning: 'Database credentials are stored as secret references. The raw password is not stored in logs.',
            });
        }
        return reply.send({
            ok: true,
            database: {
                id: env.id,
                provider: provider || 'postgres',
                databaseUrl: (0, core_1.maskDatabaseUrl)(databaseUrl),
                status: 'configured',
            },
            _warning: 'Database credentials are stored as secret references. The raw password is not stored in logs.',
        });
    });
    app.get('/v1/projects/:projectId/database', async (request, reply) => {
        const [env] = await app.db.select().from(schema_1.environments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.environments.projectId, request.params.projectId), (0, drizzle_orm_1.eq)(schema_1.environments.kind, 'production'))).limit(1);
        if (!env) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No database configured for this project' } });
        }
        return reply.send({
            ok: true,
            database: {
                id: env.id,
                name: env.name,
                kind: env.kind,
                status: env.status,
                createdAt: env.createdAt,
            },
        });
    });
}
//# sourceMappingURL=routes.js.map