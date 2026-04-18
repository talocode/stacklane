import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.join(__dirname, '..', 'migrations')
const databaseUrl = process.env.DATABASE_URL || 'postgres://stacklane:stacklane@localhost:5432/stacklane'

const client = new Client({ connectionString: databaseUrl })

try {
  await client.connect()
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  const appliedRows = await client.query('SELECT id FROM schema_migrations')
  const applied = new Set(appliedRows.rows.map((row) => row.id))

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  for (const file of files) {
    if (applied.has(file)) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file])
    await client.query('COMMIT')
    console.log(`applied migration: ${file}`)
  }

  console.log('migrations complete')
} catch (error) {
  await client.query('ROLLBACK').catch(() => null)
  console.error(error)
  process.exitCode = 1
} finally {
  await client.end()
}
