"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("@stacklane/config");
const client_1 = require("./client");
const schema_1 = require("./schema");
const run = async () => {
    const env = (0, config_1.loadApiEnv)();
    const { db, pool } = (0, client_1.createDb)(env.DATABASE_URL);
    try {
        console.log("Seeding database...");
        // Create a default user
        const [user] = await db
            .insert(schema_1.users)
            .values({
            email: "dev@stacklane.local",
            name: "Dev User"
        })
            .onConflictDoUpdate({
            target: schema_1.users.email,
            set: { updatedAt: new Date() }
        })
            .returning();
        // Create a default organization
        const [org] = await db
            .insert(schema_1.organizations)
            .values({
            name: "Acme Labs",
            slug: "acme-labs"
        })
            .onConflictDoUpdate({
            target: schema_1.organizations.slug,
            set: { updatedAt: new Date() }
        })
            .returning();
        // Create a default project
        await db
            .insert(schema_1.projects)
            .values({
            organizationId: org.id,
            name: "Starter Project",
            slug: "starter-project",
            status: "ready",
            createdByUserId: user.id
        })
            .onConflictDoUpdate({
            target: [schema_1.projects.organizationId, schema_1.projects.slug],
            set: { updatedAt: new Date() }
        });
        console.log("Seeding complete.");
        console.log(`Default organization ID: ${org.id}`);
    }
    finally {
        await pool.end();
    }
};
run().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map