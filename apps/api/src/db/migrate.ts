import "dotenv/config";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { loadApiEnv } from "@stacklane/config";

const migrationTableSql = `
CREATE TABLE IF NOT EXISTS _stacklane_migrations (
  name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const run = async () => {
  const env = loadApiEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    await pool.query(migrationTableSql);

    const migrationsDir = path.resolve(__dirname, "../../migrations");
    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");

      const existing = await pool.query<{
        name: string;
        checksum: string;
      }>("SELECT name, checksum FROM _stacklane_migrations WHERE name = $1", [file]);

      if (existing.rowCount && existing.rows[0].checksum === checksum) {
        continue;
      }

      if (existing.rowCount && existing.rows[0].checksum !== checksum) {
        throw new Error(`Migration checksum mismatch for ${file}`);
      }

      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query(
          "INSERT INTO _stacklane_migrations (name, checksum) VALUES ($1, $2)",
          [file, checksum]
        );
        await pool.query("COMMIT");
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Migrations complete.");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
