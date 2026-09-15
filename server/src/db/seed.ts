import { sql } from 'drizzle-orm'
import { db, pool } from './client.ts'
import { countries } from './schema.ts'
import { COUNTRY_SEED } from './countries.data.ts'

const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(countries)

if (count > 0) {
  console.log(`countries already seeded (${count} rows), skipping.`)
} else {
  await db.insert(countries).values([...COUNTRY_SEED])
  console.log(`seeded ${COUNTRY_SEED.length} countries.`)
}

await pool.end()
