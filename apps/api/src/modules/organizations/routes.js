"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationsRoutes = void 0;
const types_1 = require("@stacklane/types");
const zod_1 = require("zod");
const repository_1 = require("./repository");
const idParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
const organizationsRoutes = async (fastify) => {
    fastify.post("/organizations", async (request, reply) => {
        const input = types_1.createOrganizationInputSchema.parse(request.body);
        const organization = await (0, repository_1.createOrganization)(fastify.db, {
            ...input,
            slug: input.slug ?? slugify(input.name)
        });
        return reply.status(201).send({
            data: types_1.organizationSchema.parse({
                ...organization,
                createdAt: organization.createdAt.toISOString(),
                updatedAt: organization.updatedAt.toISOString()
            })
        });
    });
    fastify.get("/organizations/:id", async (request, reply) => {
        const { id } = idParamSchema.parse(request.params);
        const organization = await (0, repository_1.findOrganizationById)(fastify.db, id);
        if (!organization) {
            return reply.status(404).send({
                error: {
                    code: "NOT_FOUND",
                    message: "Organization not found"
                }
            });
        }
        return {
            data: types_1.organizationSchema.parse({
                ...organization,
                createdAt: organization.createdAt.toISOString(),
                updatedAt: organization.updatedAt.toISOString()
            })
        };
    });
};
exports.organizationsRoutes = organizationsRoutes;
//# sourceMappingURL=routes.js.map