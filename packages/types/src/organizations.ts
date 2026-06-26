import { z } from "zod";

export const organizationStatusSchema = z.enum(["active", "suspended"]);

export const createOrganizationInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional()
});

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: organizationStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
export type Organization = z.infer<typeof organizationSchema>;
