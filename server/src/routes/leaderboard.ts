import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db/client.ts'
import { runs } from '../db/schema.ts'

export const leaderboardRouter = Router()

leaderboardRouter.get('/', async (req, res) => {
  const rawLimit = Number(req.query.limit ?? 10)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50)
    : 10

  const entries = await db
    .select({
      nickname: runs.nickname,
      bestStreak: runs.bestStreak,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .where(and(eq(runs.status, 'ended'), isNotNull(runs.nickname)))
    .orderBy(desc(runs.bestStreak), runs.createdAt)
    .limit(limit)

  res.json({ entries })
})
