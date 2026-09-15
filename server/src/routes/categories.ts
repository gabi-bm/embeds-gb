import { count, eq } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db/client.ts'
import { categories, items } from '../db/schema.ts'

export const categoriesRouter = Router()

categoriesRouter.get('/', async (_req, res) => {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      unit: categories.unit,
      description: categories.description,
      itemCount: count(items.id),
    })
    .from(categories)
    .leftJoin(items, eq(items.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.id)

  res.json({ categories: rows })
})
