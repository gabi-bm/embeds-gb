import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../app.ts'
import { db } from '../db/client.ts'
import { categories, items, runs } from '../db/schema.ts'

const areaNickname = `lb-area-${Date.now()}`
const popNickname = `lb-pop-${Date.now()}`

let areaCategoryId: number
let areaItemIds: number[] = []
let areaRunId: string
let popRunId: string

beforeAll(async () => {
  const [areaCategory] = await db
    .insert(categories)
    .values({
      slug: 'test-area',
      name: 'Test area',
      unit: 'km²',
      description: null,
    })
    .returning()
  areaCategoryId = areaCategory!.id

  const insertedAreaItems = await db
    .insert(items)
    .values([
      { categoryId: areaCategoryId, name: 'Test item A', value: BigInt(100) },
      { categoryId: areaCategoryId, name: 'Test item B', value: BigInt(200) },
    ])
    .returning()
  areaItemIds = insertedAreaItems.map((item) => item.id)

  const [areaRun] = await db
    .insert(runs)
    .values({
      categoryId: areaCategoryId,
      leftItemId: areaItemIds[0]!,
      rightItemId: areaItemIds[1]!,
      status: 'ended',
      streak: 0,
      bestStreak: 7,
      nickname: areaNickname,
    })
    .returning()
  areaRunId = areaRun!.id

  const [popCategory] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, 'population'))
  const popItems = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.categoryId, popCategory!.id))
    .limit(2)

  const [popRun] = await db
    .insert(runs)
    .values({
      categoryId: popCategory!.id,
      leftItemId: popItems[0]!.id,
      rightItemId: popItems[1]!.id,
      status: 'ended',
      streak: 0,
      bestStreak: 5,
      nickname: popNickname,
    })
    .returning()
  popRunId = popRun!.id
})

afterAll(async () => {
  await db.delete(runs).where(eq(runs.id, areaRunId))
  await db.delete(runs).where(eq(runs.id, popRunId))
  for (const id of areaItemIds) {
    await db.delete(items).where(eq(items.id, id))
  }
  await db.delete(categories).where(eq(categories.id, areaCategoryId))
})

function hasNickname(entries: Array<{ nickname: string }>, nickname: string) {
  return entries.some((entry) => entry.nickname === nickname)
}

describe('GET /api/leaderboard', () => {
  it('filters to the requested category', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=test-area&limit=50')
      .expect(200)

    expect(hasNickname(res.body.entries, areaNickname)).toBe(true)
    expect(hasNickname(res.body.entries, popNickname)).toBe(false)
  })

  it('filters to a different category independently', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=population&limit=50')
      .expect(200)

    expect(hasNickname(res.body.entries, popNickname)).toBe(true)
    expect(hasNickname(res.body.entries, areaNickname)).toBe(false)
  })

  it('returns the global leaderboard across categories when category is omitted', async () => {
    const res = await request(app).get('/api/leaderboard?limit=50').expect(200)

    expect(hasNickname(res.body.entries, areaNickname)).toBe(true)
    expect(hasNickname(res.body.entries, popNickname)).toBe(true)
  })

  it('404s for an unknown category slug', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=does-not-exist')
      .expect(404)

    expect(typeof res.body.error).toBe('string')
  })

  it('400s when category is repeated', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=a&category=b')
      .expect(400)

    expect(typeof res.body.error).toBe('string')
  })
})
