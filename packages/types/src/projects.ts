import { z } from "zod";

export const projectStatusSchema = z.enum([
  "provisioning",
  "ready",
  "failed",
  "archived"
]);

export const createProjectInputSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  createdByUserId: z.string().uuid().optional()
});

export const projectListQuerySchema = z.object({
  organizationId: z.string().uuid().optional()
});

export const environmentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  kind: z.enum(["production", "development", "preview"]),
  status: z.enum(["active", "disabled"]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const projectSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: projectStatusSchema,
  createdByUserId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  environments: z.array(environmentSchema).optional()
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
