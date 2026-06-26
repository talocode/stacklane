import fp from "fastify-plugin";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { createDb } from "../db/client";

export const dbPlugin: FastifyPluginAsync<{ databaseUrl: string }> = fp(
  async (
    fastify: FastifyInstance,
    options: { databaseUrl: string }
  ) => {
    const { db, pool } = createDb(options.databaseUrl);

    fastify.decorate("db", db);

    fastify.addHook("onClose", async () => {
      await pool.end();
    });
  }
);
