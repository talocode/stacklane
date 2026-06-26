import "dotenv/config";
import { loadApiEnv } from "@stacklane/config";
import { createDb } from "./client";
import { organizations, projects, users } from "./schema";
import { sql } from "drizzle-orm";

const run = async () => {
  const env = loadApiEnv();
  const { db, pool } = createDb(env.DATABASE_URL);

  try {
    console.log("Seeding database...");

    // Create a default user
    const [user] = await db
      .insert(users)
      .values({
        email: "dev@stacklane.local",
        name: "Dev User"
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { updatedAt: new Date() }
      })
      .returning();

    // Create a default organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: "Acme Labs",
        slug: "acme-labs"
      })
      .onConflictDoUpdate({
        target: organizations.slug,
        set: { updatedAt: new Date() }
      })
      .returning();

    // Create a default project
    await db
      .insert(projects)
      .values({
        organizationId: org.id,
        name: "Starter Project",
        slug: "starter-project",
        status: "ready",
        createdByUserId: user.id
      })
      .onConflictDoUpdate({
        target: [projects.organizationId, projects.slug],
        set: { updatedAt: new Date() }
      });

    console.log("Seeding complete.");
    console.log(`Default organization ID: ${org.id}`);
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
