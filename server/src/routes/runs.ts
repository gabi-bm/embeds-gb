import { and, eq, ne } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db/client.ts'
import { countries, runs } from '../db/schema.ts'
import { evaluateGuess, pickNextCountryId, type Side } from '../game/logic.ts'

export const runsRouter = Router()

async function loadCountryIds(): Promise<number[]> {
  const rows = await db.select({ id: countries.id }).from(countries)
  return rows.map((r) => r.id)
}

async function loadCountry(id: number) {
  const [country] = await db
    .select()
    .from(countries)
    .where(eq(countries.id, id))
  if (!country) throw new Error(`country ${id} not found`)
  return country
}

runsRouter.post('/', async (_req, res) => {
  const ids = await loadCountryIds()
  if (ids.length < 2) {
    res.status(503).json({ error: 'not enough countries seeded' })
    return
  }

  const leftId = ids[Math.floor(Math.random() * ids.length)]!
  const rightId = pickNextCountryId(ids, [leftId])

  const [left, right] = await Promise.all([
    loadCountry(leftId),
    loadCountry(rightId),
  ])

  const [run] = await db
    .insert(runs)
    .values({ leftCountryId: left.id, rightCountryId: right.id })
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
    loadCountry(run.leftCountryId),
    loadCountry(run.rightCountryId),
  ])

  const correct = evaluateGuess(left.population, right.population, pick)
  const revealed = {
    left: { id: left.id, name: left.name, population: left.population },
    right: { id: right.id, name: right.name, population: right.population },
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
  const ids = await loadCountryIds()
  const nextId = pickNextCountryId(ids, [run.leftCountryId, run.rightCountryId])
  const next = await loadCountry(nextId)

  await db
    .update(runs)
    .set({
      leftCountryId: right.id,
      rightCountryId: next.id,
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
