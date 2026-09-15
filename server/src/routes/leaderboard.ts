import { and, desc, eq, isNotNull, type SQL } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db/client.ts'
import { categories, runs } from '../db/schema.ts'

export const leaderboardRouter = Router()

leaderboardRouter.get('/', async (req, res) => {
  const rawLimit = Number(req.query.limit ?? 10)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50)
    : 10

  const categoryParam = req.query.category
  if (categoryParam !== undefined && typeof categoryParam !== 'string') {
    res.status(400).json({ error: 'category must be a single slug' })
    return
  }

  let categoryId: number | undefined
  if (categoryParam !== undefined) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categoryParam))
    if (!category) {
      res.status(404).json({ error: 'category not found' })
      return
    }
    categoryId = category.id
  }

  const conditions: SQL[] = [
    eq(runs.status, 'ended'),
    isNotNull(runs.nickname),
  ]
  if (categoryId !== undefined) {
    conditions.push(eq(runs.categoryId, categoryId))
  }

  const entries = await db
    .select({
      nickname: runs.nickname,
      bestStreak: runs.bestStreak,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .where(and(...conditions))
    .orderBy(desc(runs.bestStreak), runs.createdAt)
    .limit(limit)

  res.json({ entries })
})
