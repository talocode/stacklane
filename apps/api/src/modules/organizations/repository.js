"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrganizationById = exports.createOrganization = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const createOrganization = async (db, input) => {
    const [organization] = await db
        .insert(schema_1.organizations)
        .values({
        name: input.name,
        slug: input.slug
    })
        .returning();
    return organization;
};
exports.createOrganization = createOrganization;
const findOrganizationById = async (db, id) => {
    const [organization] = await db
        .select()
        .from(schema_1.organizations)
        .where((0, drizzle_orm_1.eq)(schema_1.organizations.id, id))
        .limit(1);
    return organization ?? null;
};
exports.findOrganizationById = findOrganizationById;
//# sourceMappingURL=repository.js.map