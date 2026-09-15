/**
 * Destructive: drops and recreates ONLY the database named in DATABASE_URL,
 * then re-runs migrate + seed. Never touches any other database on the
 * Postgres instance. See AGENTS.md "Never do this" before running by hand.
 */
import 'dotenv/config'
import { execSync } from 'node:child_process'
import { Client } from 'pg'

const url = new URL(process.env.DATABASE_URL ?? '')
const dbName = url.pathname.replace(/^\//, '')

if (!dbName) {
  throw new Error('DATABASE_URL has no database name — refusing to reset.')
}

const adminUrl = new URL(url)
adminUrl.pathname = '/postgres'

const client = new Client({ connectionString: adminUrl.toString() })
await client.connect()

await client.query(
  `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
  [dbName],
)
await client.query(`DROP DATABASE IF EXISTS "${dbName}"`)
await client.query(`CREATE DATABASE "${dbName}"`)
await client.end()

console.log(`recreated database "${dbName}", running migrate + seed...`)
execSync('npm run db:migrate && npm run db:seed', { stdio: 'inherit' })
