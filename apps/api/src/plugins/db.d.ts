import type { FastifyPluginAsync } from "fastify";
export declare const dbPlugin: FastifyPluginAsync<{
    databaseUrl: string;
}>;
