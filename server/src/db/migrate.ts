import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { db, pool } from './client.ts'

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
)

await migrate(db, { migrationsFolder })
await pool.end()

console.log('Migrations applied.')
