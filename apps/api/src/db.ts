import pg from 'pg'
import { config } from './config'

const { Pool } = pg
const schema = /^[a-z][a-z0-9_]*$/.test(process.env.DATABASE_SCHEMA || '')
  ? process.env.DATABASE_SCHEMA!
  : 'stacklane'

export const db = new Pool({
  connectionString: config.databaseUrl,
  options: `-c search_path=${schema},public`,
  ssl: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false'
    ? { rejectUnauthorized: false }
    : undefined,
})
