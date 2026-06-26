import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type StacklaneDb = NodePgDatabase<typeof schema>;

export const createDb = (databaseUrl: string): { db: StacklaneDb; pool: Pool } => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, pool };
};
