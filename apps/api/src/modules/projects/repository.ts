import { and, desc, eq } from "drizzle-orm";
import { environments, projects } from "../../db/schema";
import type { StacklaneDb } from "../../db/client";
import type { CreateProjectInput } from "@stacklane/types";

export const createProject = async (
  db: StacklaneDb,
  input: CreateProjectInput & { slug: string }
) => {
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      status: "provisioning",
      createdByUserId: input.createdByUserId ?? null
    })
    .returning();

  await db.insert(environments).values([
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

export const findProjectById = async (db: StacklaneDb, id: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) {
    return null;
  }

  const projectEnvironments = await db
    .select()
    .from(environments)
    .where(eq(environments.projectId, project.id));

  return {
    ...project,
    environments: projectEnvironments
  };
};

export const listProjects = async (
  db: StacklaneDb,
  organizationId?: string
) => {
  if (organizationId) {
    return db
      .select()
      .from(projects)
      .where(and(eq(projects.organizationId, organizationId)))
      .orderBy(desc(projects.createdAt));
  }

  return db.select().from(projects).orderBy(desc(projects.createdAt));
};
