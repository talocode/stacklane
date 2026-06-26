"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
const config_1 = require("@stacklane/config");
const migrationTableSql = `
CREATE TABLE IF NOT EXISTS _stacklane_migrations (
  name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
const run = async () => {
    const env = (0, config_1.loadApiEnv)();
    const pool = new pg_1.Pool({ connectionString: env.DATABASE_URL });
    try {
        await pool.query(migrationTableSql);
        const migrationsDir = node_path_1.default.resolve(__dirname, "../../migrations");
        const files = (await node_fs_1.promises.readdir(migrationsDir))
            .filter((file) => file.endsWith(".sql"))
            .sort((a, b) => a.localeCompare(b));
        for (const file of files) {
            const fullPath = node_path_1.default.join(migrationsDir, file);
            const sql = await node_fs_1.promises.readFile(fullPath, "utf8");
            const checksum = node_crypto_1.default.createHash("sha256").update(sql).digest("hex");
            const existing = await pool.query("SELECT name, checksum FROM _stacklane_migrations WHERE name = $1", [file]);
            if (existing.rowCount && existing.rows[0].checksum === checksum) {
                continue;
            }
            if (existing.rowCount && existing.rows[0].checksum !== checksum) {
                throw new Error(`Migration checksum mismatch for ${file}`);
            }
            await pool.query("BEGIN");
            try {
                await pool.query(sql);
                await pool.query("INSERT INTO _stacklane_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
                await pool.query("COMMIT");
                console.log(`Applied migration: ${file}`);
            }
            catch (error) {
                await pool.query("ROLLBACK");
                throw error;
            }
        }
        console.log("Migrations complete.");
    }
    finally {
        await pool.end();
    }
};
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map