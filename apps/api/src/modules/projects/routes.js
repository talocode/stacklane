"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsRoutes = void 0;
const types_1 = require("@stacklane/types");
const zod_1 = require("zod");
const repository_1 = require("../organizations/repository");
const repository_2 = require("./repository");
const idParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
const toProjectResponse = (project) => {
    return types_1.projectSchema.parse({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        environments: project.environments?.map((env) => types_1.environmentSchema.parse({
            ...env,
            createdAt: env.createdAt.toISOString(),
            updatedAt: env.updatedAt.toISOString()
        }))
    });
};
const projectsRoutes = async (fastify) => {
    fastify.post("/projects", async (request, reply) => {
        const input = types_1.createProjectInputSchema.parse(request.body);
        const organization = await (0, repository_1.findOrganizationById)(fastify.db, input.organizationId);
        if (!organization) {
            return reply.status(404).send({
                error: {
                    code: "NOT_FOUND",
                    message: "Organization not found"
                }
            });
        }
        const project = await (0, repository_2.createProject)(fastify.db, {
            ...input,
            slug: input.slug ?? slugify(input.name)
        });
        return reply.status(201).send({ data: toProjectResponse(project) });
    });
    fastify.get("/projects/:id", async (request, reply) => {
        const { id } = idParamSchema.parse(request.params);
        const project = await (0, repository_2.findProjectById)(fastify.db, id);
        if (!project) {
            return reply.status(404).send({
                error: {
                    code: "NOT_FOUND",
                    message: "Project not found"
                }
            });
        }
        return { data: toProjectResponse(project) };
    });
    fastify.get("/projects", async (request) => {
        const query = types_1.projectListQuerySchema.parse(request.query);
        const projects = await (0, repository_2.listProjects)(fastify.db, query.organizationId);
        return {
            data: projects.map((project) => toProjectResponse(project))
        };
    });
};
exports.projectsRoutes = projectsRoutes;
//# sourceMappingURL=routes.js.map