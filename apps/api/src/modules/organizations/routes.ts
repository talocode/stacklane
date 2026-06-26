import type { FastifyPluginAsync } from "fastify";
import {
  createOrganizationInputSchema,
  organizationSchema
} from "@stacklane/types";
import { z } from "zod";
import {
  createOrganization,
  findOrganizationById
} from "./repository";

const idParamSchema = z.object({ id: z.string().uuid() });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const organizationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/organizations", async (request, reply) => {
    const input = createOrganizationInputSchema.parse(request.body);

    const organization = await createOrganization(fastify.db, {
      ...input,
      slug: input.slug ?? slugify(input.name)
    });

    return reply.status(201).send({
      data: organizationSchema.parse({
        ...organization,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString()
      })
    });
  });

  fastify.get("/organizations/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const organization = await findOrganizationById(fastify.db, id);

    if (!organization) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Organization not found"
        }
      });
    }

    return {
      data: organizationSchema.parse({
        ...organization,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString()
      })
    };
  });
};
