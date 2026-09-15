import { and, eq, ne } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db/client.ts'
import { categories, items, runs } from '../db/schema.ts'
import { evaluateGuess, pickNextItemId, type Side } from '../game/logic.ts'

export const runsRouter = Router()

const DEFAULT_CATEGORY_SLUG = 'population'

async function resolveCategoryId(slug: string): Promise<number | null> {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
  return category?.id ?? null
}

async function loadItemIds(categoryId: number): Promise<number[]> {
  const rows = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.categoryId, categoryId))
  return rows.map((r) => r.id)
}

async function loadItem(id: number) {
  const [item] = await db.select().from(items).where(eq(items.id, id))
  if (!item) throw new Error(`item ${id} not found`)
  return { id: item.id, name: item.name, value: Number(item.value) }
}

runsRouter.post('/', async (req, res) => {
  const raw = req.body?.categorySlug ?? DEFAULT_CATEGORY_SLUG
  if (typeof raw !== 'string') {
    res.status(400).json({ error: 'categorySlug must be a string' })
    return
  }

  const categoryId = await resolveCategoryId(raw)
  if (categoryId === null) {
    res.status(404).json({ error: 'category not found' })
    return
  }

  const ids = await loadItemIds(categoryId)
  if (ids.length < 2) {
    res.status(503).json({ error: 'not enough items seeded' })
    return
  }

  const leftId = ids[Math.floor(Math.random() * ids.length)]!
  const rightId = pickNextItemId(ids, [leftId])

  const [left, right] = await Promise.all([
    loadItem(leftId),
    loadItem(rightId),
  ])

  const [run] = await db
    .insert(runs)
    .values({ categoryId, leftItemId: left.id, rightItemId: right.id })
    .returning()

  res.status(201).json({
    runId: run!.id,
    streak: run!.streak,
    left: { id: left.id, name: left.name },
    right: { id: right.id, name: right.name },
  })
})

runsRouter.post('/:id/guess', async (req, res) => {
  const pick = req.body?.pick as Side | undefined
  if (pick !== 'left' && pick !== 'right') {
    res.status(400).json({ error: 'pick must be "left" or "right"' })
    return
  }

  const [run] = await db.select().from(runs).where(eq(runs.id, req.params.id!))
  if (!run) {
    res.status(404).json({ error: 'run not found' })
    return
  }
  if (run.status !== 'active') {
    res.status(409).json({ error: 'run has already ended' })
    return
  }

  const [left, right] = await Promise.all([
    loadItem(run.leftItemId),
    loadItem(run.rightItemId),
  ])

  const correct = evaluateGuess(left.value, right.value, pick)
  const revealed = {
    left: { id: left.id, name: left.name, population: left.value },
    right: { id: right.id, name: right.name, population: right.value },
  }

  if (!correct) {
    await db
      .update(runs)
      .set({ status: 'ended', updatedAt: new Date() })
      .where(eq(runs.id, run.id))

    res.json({
      correct: false,
      finalStreak: run.streak,
      bestStreak: run.bestStreak,
      revealed,
    })
    return
  }

  const streak = run.streak + 1
  const bestStreak = Math.max(run.bestStreak, streak)
  const ids = await loadItemIds(run.categoryId)
  const nextId = pickNextItemId(ids, [run.leftItemId, run.rightItemId])
  const next = await loadItem(nextId)

  await db
    .update(runs)
    .set({
      leftItemId: right.id,
      rightItemId: next.id,
      streak,
      bestStreak,
      updatedAt: new Date(),
    })
    .where(eq(runs.id, run.id))

  res.json({
    correct: true,
    streak,
    bestStreak,
    revealed,
    next: {
      left: { id: right.id, name: right.name },
      right: { id: next.id, name: next.name },
    },
  })
})

runsRouter.patch('/:id/nickname', async (req, res) => {
  const nickname = String(req.body?.nickname ?? '').trim()
  if (nickname.length < 1 || nickname.length > 20) {
    res.status(400).json({ error: 'nickname must be 1-20 characters' })
    return
  }

  const [run] = await db.select().from(runs).where(eq(runs.id, req.params.id!))
  if (!run) {
    res.status(404).json({ error: 'run not found' })
    return
  }
  if (run.status !== 'ended') {
    res.status(409).json({ error: 'run must be ended before submitting a score' })
    return
  }
  if (run.nickname) {
    res.status(409).json({ error: 'nickname already submitted for this run' })
    return
  }

  await db
    .update(runs)
    .set({ nickname, updatedAt: new Date() })
    .where(and(eq(runs.id, run.id), ne(runs.status, 'active')))

  res.json({ ok: true })
})
