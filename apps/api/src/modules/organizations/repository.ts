import { eq } from "drizzle-orm";
import { organizations } from "../../db/schema";
import type { StacklaneDb } from "../../db/client";
import type { CreateOrganizationInput } from "@stacklane/types";

export const createOrganization = async (
  db: StacklaneDb,
  input: CreateOrganizationInput & { slug: string }
) => {
  const [organization] = await db
    .insert(organizations)
    .values({
      name: input.name,
      slug: input.slug
    })
    .returning();

  return organization;
};

export const findOrganizationById = async (db: StacklaneDb, id: string) => {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  return organization ?? null;
};
