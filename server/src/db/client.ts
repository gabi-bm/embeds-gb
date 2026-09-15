import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.ts'

function databaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Run `npm run setup` or copy .env.example to .env.',
    )
  }
  return url
}

export const pool = new Pool({ connectionString: databaseUrl() })
export const db = drizzle(pool, { schema })
