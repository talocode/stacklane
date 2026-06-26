import type { FastifyPluginAsync } from "fastify";
import {
  createProjectInputSchema,
  environmentSchema,
  projectListQuerySchema,
  projectSchema
} from "@stacklane/types";
import { z } from "zod";
import { findOrganizationById } from "../organizations/repository";
import { createProject, findProjectById, listProjects } from "./repository";

const idParamSchema = z.object({ id: z.string().uuid() });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const toProjectResponse = (
  project: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    status: "provisioning" | "ready" | "failed" | "archived";
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    environments?: {
      id: string;
      projectId: string;
      name: string;
      kind: "production" | "development" | "preview";
      status: "active" | "disabled";
      createdAt: Date;
      updatedAt: Date;
    }[];
  }
) => {
  return projectSchema.parse({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    environments: project.environments?.map((env) =>
      environmentSchema.parse({
        ...env,
        createdAt: env.createdAt.toISOString(),
        updatedAt: env.updatedAt.toISOString()
      })
    )
  });
};

export const projectsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/projects", async (request, reply) => {
    const input = createProjectInputSchema.parse(request.body);

    const organization = await findOrganizationById(fastify.db, input.organizationId);
    if (!organization) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Organization not found"
        }
      });
    }

    const project = await createProject(fastify.db, {
      ...input,
      slug: input.slug ?? slugify(input.name)
    });

    return reply.status(201).send({ data: toProjectResponse(project) });
  });

  fastify.get("/projects/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await findProjectById(fastify.db, id);

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
    const query = projectListQuerySchema.parse(request.query);
    const projects = await listProjects(fastify.db, query.organizationId);

    return {
      data: projects.map((project) => toProjectResponse(project))
    };
  });
};
