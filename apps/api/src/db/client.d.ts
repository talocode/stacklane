import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
export type StacklaneDb = NodePgDatabase<typeof schema>;
export declare const createDb: (databaseUrl: string) => {
    db: StacklaneDb;
    pool: Pool;
};
