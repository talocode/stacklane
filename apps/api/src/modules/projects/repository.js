"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjects = exports.findProjectById = exports.createProject = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const createProject = async (db, input) => {
    const [project] = await db
        .insert(schema_1.projects)
        .values({
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug,
        status: "provisioning",
        createdByUserId: input.createdByUserId ?? null
    })
        .returning();
    await db.insert(schema_1.environments).values([
        {
            projectId: project.id,
            name: "production",
            kind: "production",
            status: "active"
        },
        {
            projectId: project.id,
            name: "development",
            kind: "development",
            status: "active"
        }
    ]);
    return project;
};
exports.createProject = createProject;
const findProjectById = async (db, id) => {
    const [project] = await db
        .select()
        .from(schema_1.projects)
        .where((0, drizzle_orm_1.eq)(schema_1.projects.id, id))
        .limit(1);
    if (!project) {
        return null;
    }
    const projectEnvironments = await db
        .select()
        .from(schema_1.environments)
        .where((0, drizzle_orm_1.eq)(schema_1.environments.projectId, project.id));
    return {
        ...project,
        environments: projectEnvironments
    };
};
exports.findProjectById = findProjectById;
const listProjects = async (db, organizationId) => {
    if (organizationId) {
        return db
            .select()
            .from(schema_1.projects)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.projects.organizationId, organizationId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.projects.createdAt));
    }
    return db.select().from(schema_1.projects).orderBy((0, drizzle_orm_1.desc)(schema_1.projects.createdAt));
};
exports.listProjects = listProjects;
//# sourceMappingURL=repository.js.map