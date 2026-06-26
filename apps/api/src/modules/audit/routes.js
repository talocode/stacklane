"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRoutes = auditRoutes;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
async function auditRoutes(app) {
    app.get('/v1/projects/:projectId/audit', async (request, reply) => {
        const { projectId } = request.params;
        const limit = Math.min(Number(request.query?.limit) || 50, 200);
        const events = await app.db.select().from(schema_1.usageEvents)
            .where((0, drizzle_orm_1.eq)(schema_1.usageEvents.projectId, projectId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.usageEvents.createdAt))
            .limit(limit);
        return reply.send({
            ok: true,
            events: events.map((e) => ({
                id: e.id,
                projectId: e.projectId,
                action: e.eventType,
                metadata: e.metadata,
                createdAt: e.createdAt,
            })),
        });
    });
}
//# sourceMappingURL=routes.js.map