import { Router } from 'express'
import { db } from '../db/client.ts'
import { categories } from '../db/schema.ts'

export const categoriesRouter = Router()

categoriesRouter.get('/', async (_req, res) => {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      unit: categories.unit,
    })
    .from(categories)
    .orderBy(categories.id)

  res.json({ categories: rows })
})
