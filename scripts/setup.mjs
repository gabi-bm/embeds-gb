#!/usr/bin/env node
// One-command setup: derives a per-worktree DB name, writes .env if missing,
// creates the database if needed, then migrates and seeds it. No prompts.
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Client } from 'pg'

const repoRoot = process.cwd()
const envPath = path.join(repoRoot, '.env')

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function parseEnvFile(text) {
  const env = {}
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match) env[match[1]] = match[2]
  }
  return env
}

let env
if (existsSync(envPath)) {
  console.log('.env already exists, leaving it as-is.')
  env = parseEnvFile(readFileSync(envPath, 'utf8'))
} else {
  const dbName = `higherlower_${slugify(path.basename(repoRoot))}`
  const pgUser = os.userInfo().username
  env = {
    DATABASE_URL: `postgres://${pgUser}@localhost:5432/${dbName}`,
    PORT: '4000',
  }
  const contents = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  writeFileSync(envPath, contents + '\n')
  console.log(`wrote ${envPath}`)
}

const targetUrl = new URL(env.DATABASE_URL)
const dbName = targetUrl.pathname.replace(/^\//, '')
const adminUrl = new URL(targetUrl)
adminUrl.pathname = '/postgres'

const admin = new Client({ connectionString: adminUrl.toString() })
await admin.connect()
const { rowCount } = await admin.query(
  'SELECT 1 FROM pg_database WHERE datname = $1',
  [dbName],
)
if (rowCount === 0) {
  await admin.query(`CREATE DATABASE "${dbName}"`)
  console.log(`created database "${dbName}"`)
} else {
  console.log(`database "${dbName}" already exists`)
}
await admin.end()

console.log('running migrations + seed...')
execSync('npm run db:migrate && npm run db:seed', { stdio: 'inherit' })

console.log('\nsetup complete. Run `npm run dev` to start the app.')
