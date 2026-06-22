import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { dbPlugin } from "./plugins/db";
import { organizationsRoutes } from "./modules/organizations/routes";
import { projectsRoutes } from "./modules/projects/routes";
import { tokenRoutes } from "./modules/tokens/routes";
import { databaseConnectionRoutes } from "./modules/database-connections/routes";
import { auditRoutes } from "./modules/audit/routes";

export type BuildAppOptions = {
  databaseUrl: string;
  corsOrigin: string;
};

export const buildApp = async (options: BuildAppOptions) => {
  const app = Fastify({
    logger: {
      level: "info"
    },
    // Avoid network interface enumeration which fails in Termux/Debian/PRoot
    // SystemError [ERR_SYSTEM_ERROR]: uv_interface_addresses returned Unknown system error 13
    listenTextResolver: (address) => {
      return `Server listening at ${address}`;
    }
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: options.corsOrigin
  });
  await app.register(dbPlugin, { databaseUrl: options.databaseUrl });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: error.flatten()
        }
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error"
      }
    });
  });

  app.get("/health", async () => {
    await app.db.execute(sql`select 1`);

    return {
      status: "ok",
      service: "stacklane-api",
      timestamp: new Date().toISOString(),
      database: "up"
    };
  });

  await app.register(organizationsRoutes);
  await app.register(projectsRoutes);
  await app.register(tokenRoutes);
  await app.register(databaseConnectionRoutes);
  await app.register(auditRoutes);

  return app;
};
