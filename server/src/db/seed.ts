import { eq, sql } from 'drizzle-orm'
import { db, pool } from './client.ts'
import { categories, items } from './schema.ts'
import { POPULATION_CATEGORY, POPULATION_SEED } from './population.data.ts'

export interface SeedDefinition {
  category: { slug: string; name: string; unit: string; description: string }
  items: ReadonlyArray<{ name: string; value: number }>
}

export const SEED_DEFINITIONS: ReadonlyArray<SeedDefinition> = [
  { category: POPULATION_CATEGORY, items: POPULATION_SEED },
]

export interface SeedResult {
  slug: string
  inserted: number
  skipped: boolean
}

export async function seedAll(
  definitions: ReadonlyArray<SeedDefinition> = SEED_DEFINITIONS,
): Promise<SeedResult[]> {
  const results: SeedResult[] = []

  for (const definition of definitions) {
    await db
      .insert(categories)
      .values(definition.category)
      .onConflictDoNothing({ target: categories.slug })

    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, definition.category.slug))
    if (!category)
      throw new Error(`${definition.category.slug} category not found after upsert`)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.categoryId, category.id))

    if (count > 0) {
      console.log(
        `${definition.category.slug} items already seeded (${count} rows), skipping.`,
      )
      results.push({ slug: definition.category.slug, inserted: 0, skipped: true })
    } else {
      await db.insert(items).values(
        definition.items.map((i) => ({
          categoryId: category.id,
          name: i.name,
          value: BigInt(i.value),
        })),
      )
      console.log(`seeded ${definition.items.length} ${definition.category.slug} items.`)
      results.push({
        slug: definition.category.slug,
        inserted: definition.items.length,
        skipped: false,
      })
    }
  }

  return results
}

if (import.meta.main) {
  await seedAll()
  await pool.end()
}
