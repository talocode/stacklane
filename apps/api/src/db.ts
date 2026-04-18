import pg from 'pg'
import { config } from './config'

const { Pool } = pg

export const db = new Pool({ connectionString: config.databaseUrl })
