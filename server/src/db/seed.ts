import { eq, sql } from 'drizzle-orm'
import { db, pool } from './client.ts'
import { categories, items } from './schema.ts'
import { POPULATION_SEED } from './population.data.ts'

const POPULATION_CATEGORY = {
  slug: 'population',
  name: 'Country population',
  unit: 'people',
  description: 'Which country has the bigger population?',
} as const

await db
  .insert(categories)
  .values(POPULATION_CATEGORY)
  .onConflictDoNothing({ target: categories.slug })

const [category] = await db
  .select({ id: categories.id })
  .from(categories)
  .where(eq(categories.slug, POPULATION_CATEGORY.slug))
if (!category) throw new Error('population category not found after upsert')

const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(items)
  .where(eq(items.categoryId, category.id))

if (count > 0) {
  console.log(`population items already seeded (${count} rows), skipping.`)
} else {
  await db.insert(items).values(
    POPULATION_SEED.map((p) => ({
      categoryId: category.id,
      name: p.name,
      value: BigInt(p.value),
    })),
  )
  console.log(`seeded ${POPULATION_SEED.length} population items.`)
}

await pool.end()
