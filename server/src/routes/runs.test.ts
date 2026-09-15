import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../app.ts'
import { db } from '../db/client.ts'
import { categories, items, runs } from '../db/schema.ts'
import { evaluateGuess } from '../game/logic.ts'

const createdRunIds: string[] = []

afterEach(async () => {
  while (createdRunIds.length > 0) {
    const id = createdRunIds.pop()!
    await db.delete(runs).where(eq(runs.id, id))
  }
})

async function valueOf(itemId: number) {
  const [item] = await db
    .select({ value: items.value })
    .from(items)
    .where(eq(items.id, itemId))
  return Number(item!.value)
}

let fixtureCategoryId: number
let fixtureItemIds: number[] = []

beforeAll(async () => {
  const [fixtureCategory] = await db
    .insert(categories)
    .values({
      slug: 'test-runs-area',
      name: 'Test runs area',
      unit: 'km²',
      description: null,
    })
    .returning()
  fixtureCategoryId = fixtureCategory!.id

  const insertedItems = await db
    .insert(items)
    .values([
      { categoryId: fixtureCategoryId, name: 'Test runs item A', value: BigInt(100) },
      { categoryId: fixtureCategoryId, name: 'Test runs item B', value: BigInt(200) },
      { categoryId: fixtureCategoryId, name: 'Test runs item C', value: BigInt(300) },
    ])
    .returning()
  fixtureItemIds = insertedItems.map((item) => item.id)
})

afterAll(async () => {
  for (const id of fixtureItemIds) {
    await db.delete(items).where(eq(items.id, id))
  }
  await db.delete(categories).where(eq(categories.id, fixtureCategoryId))
})

describe('POST /api/runs and /api/runs/:id/guess', () => {
  it('accepts a correct guess, keeps the run alive and reports the new streak', async () => {
    const start = await request(app).post('/api/runs').expect(201)
    createdRunIds.push(start.body.runId)

    const leftValue = await valueOf(start.body.left.id)
    const rightValue = await valueOf(start.body.right.id)
    const pick = evaluateGuess(leftValue, rightValue, 'left') ? 'left' : 'right'

    const res = await request(app)
      .post(`/api/runs/${start.body.runId}/guess`)
      .send({ pick })
      .expect(200)

    expect(res.body.correct).toBe(true)
    expect(res.body.streak).toBe(1)
    expect(res.body.next.left.id).toBe(start.body.right.id)
  })

  it('ends the run on a wrong guess and lets the score join the leaderboard', async () => {
    const start = await request(app).post('/api/runs').expect(201)
    createdRunIds.push(start.body.runId)

    const leftValue = await valueOf(start.body.left.id)
    const rightValue = await valueOf(start.body.right.id)
    const wrongPick = evaluateGuess(leftValue, rightValue, 'left') ? 'right' : 'left'

    const guessRes = await request(app)
      .post(`/api/runs/${start.body.runId}/guess`)
      .send({ pick: wrongPick })
      .expect(200)
    expect(guessRes.body.correct).toBe(false)

    await request(app)
      .post(`/api/runs/${start.body.runId}/guess`)
      .send({ pick: 'left' })
      .expect(409)

    const nickname = `test-${start.body.runId.slice(0, 8)}`
    await request(app)
      .patch(`/api/runs/${start.body.runId}/nickname`)
      .send({ nickname })
      .expect(200)

    const board = await request(app).get('/api/leaderboard?limit=50').expect(200)
    expect(
      board.body.entries.some((e: { nickname: string }) => e.nickname === nickname),
    ).toBe(true)
  })

  it('creates a run wired to the population category by default when no category is sent', async () => {
    const start = await request(app).post('/api/runs').expect(201)
    createdRunIds.push(start.body.runId)

    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, 'population'))
    expect(category).toBeDefined()

    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, start.body.runId))
    expect(run!.categoryId).toBe(category!.id)

    const [leftItem] = await db
      .select({ categoryId: items.categoryId })
      .from(items)
      .where(eq(items.id, run!.leftItemId))
    const [rightItem] = await db
      .select({ categoryId: items.categoryId })
      .from(items)
      .where(eq(items.id, run!.rightItemId))

    expect(leftItem!.categoryId).toBe(category!.id)
    expect(rightItem!.categoryId).toBe(category!.id)
  })

  it('scopes a run to the requested category', async () => {
    const start = await request(app)
      .post('/api/runs')
      .send({ categorySlug: 'test-runs-area' })
      .expect(201)
    createdRunIds.push(start.body.runId)

    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, start.body.runId))

    expect(run!.categoryId).toBe(fixtureCategoryId)
    expect(fixtureItemIds).toContain(run!.leftItemId)
    expect(fixtureItemIds).toContain(run!.rightItemId)
  })

  it('keeps guesses within the scoped category', async () => {
    const start = await request(app)
      .post('/api/runs')
      .send({ categorySlug: 'test-runs-area' })
      .expect(201)
    createdRunIds.push(start.body.runId)

    const leftValue = await valueOf(start.body.left.id)
    const rightValue = await valueOf(start.body.right.id)
    const pick = evaluateGuess(leftValue, rightValue, 'left') ? 'left' : 'right'

    const res = await request(app)
      .post(`/api/runs/${start.body.runId}/guess`)
      .send({ pick })
      .expect(200)

    expect(res.body.correct).toBe(true)
    expect(fixtureItemIds).toContain(res.body.next.right.id)
  })

  it('reveals guessed items under a `value` key, not `population`', async () => {
    const start = await request(app)
      .post('/api/runs')
      .send({ categorySlug: 'test-runs-area' })
      .expect(201)
    createdRunIds.push(start.body.runId)

    const leftValue = await valueOf(start.body.left.id)
    const rightValue = await valueOf(start.body.right.id)
    const pick = evaluateGuess(leftValue, rightValue, 'left') ? 'left' : 'right'

    const res = await request(app)
      .post(`/api/runs/${start.body.runId}/guess`)
      .send({ pick })
      .expect(200)

    expect(typeof res.body.revealed.left.value).toBe('number')
    expect(res.body.revealed.left.value).toBe(leftValue)
    expect(res.body.revealed.left).not.toHaveProperty('population')
    expect(res.body.revealed.right).not.toHaveProperty('population')
  })

  it('404s for an unknown category slug', async () => {
    const res = await request(app)
      .post('/api/runs')
      .send({ categorySlug: 'does-not-exist' })
      .expect(404)

    expect(typeof res.body.error).toBe('string')
  })

  it('400s when categorySlug is not a string', async () => {
    const res = await request(app)
      .post('/api/runs')
      .send({ categorySlug: 123 })
      .expect(400)

    expect(typeof res.body.error).toBe('string')
  })
})
