import crypto from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from './client.ts'
import { categories, items } from './schema.ts'
import { SEED_DEFINITIONS, seedAll, type SeedDefinition } from './seed.ts'

describe('SEED_DEFINITIONS', () => {
  it('registers the population and gdp datasets', () => {
    expect(SEED_DEFINITIONS.length).toBeGreaterThanOrEqual(2)

    const population = SEED_DEFINITIONS.find((d) => d.category.slug === 'population')
    const gdp = SEED_DEFINITIONS.find((d) => d.category.slug === 'gdp')

    expect(population).toBeDefined()
    expect(gdp).toBeDefined()
    expect(population!.category.unit).toBe('people')
    expect(gdp!.category.unit).toBe('USD')
    expect(population!.items.length).toBeGreaterThan(0)
    expect(gdp!.items.length).toBeGreaterThan(0)
  })
})

describe('seedAll', () => {
  it('is idempotent against the already-seeded population dataset', async () => {
    const [{ id: categoryId }] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, 'population'))

    const [{ count: countBefore }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.categoryId, categoryId))

    const results = await seedAll()

    expect(results.find((r) => r.slug === 'population')).toEqual({
      slug: 'population',
      inserted: 0,
      skipped: true,
    })

    const populationCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, 'population'))
    expect(populationCategories).toHaveLength(1)

    const [{ count: countAfter }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.categoryId, categoryId))
    expect(countAfter).toBe(countBefore)
  })

  describe('with a throwaway definition', () => {
    const tempSlug = `seed-test-${crypto.randomUUID()}`
    const tempDef: SeedDefinition = {
      category: {
        slug: tempSlug,
        name: 'Seed test category',
        unit: 'widgets',
        description: 'Temporary category used by seed.test.ts',
      },
      items: [
        { name: 'Alpha', value: 111 },
        { name: 'Beta', value: 222 },
      ],
    }

    afterAll(async () => {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, tempSlug))

      if (category) {
        await db.delete(items).where(eq(items.categoryId, category.id))
        await db.delete(categories).where(eq(categories.id, category.id))
      }
    })

    it('inserts a new category and items, then skips on re-run', async () => {
      const firstRun = await seedAll([tempDef])
      expect(firstRun).toEqual([{ slug: tempSlug, inserted: 2, skipped: false }])

      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, tempSlug))
      expect(category).toBeDefined()

      const insertedItems = await db
        .select({ name: items.name, value: items.value })
        .from(items)
        .where(eq(items.categoryId, category.id))
      expect(insertedItems).toHaveLength(2)

      for (const fixture of tempDef.items) {
        const match = insertedItems.find((row) => row.name === fixture.name)
        expect(match).toBeDefined()
        expect(BigInt(match!.value)).toBe(BigInt(fixture.value))
      }

      const secondRun = await seedAll([tempDef])
      expect(secondRun).toEqual([{ slug: tempSlug, inserted: 0, skipped: true }])

      const itemsAfterSecondRun = await db
        .select({ id: items.id })
        .from(items)
        .where(eq(items.categoryId, category.id))
      expect(itemsAfterSecondRun).toHaveLength(2)

      const categoriesAfterSecondRun = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, tempSlug))
      expect(categoriesAfterSecondRun).toHaveLength(1)
    })
  })
})
