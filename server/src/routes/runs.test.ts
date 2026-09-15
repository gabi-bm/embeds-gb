import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { app } from '../app.ts'
import { db } from '../db/client.ts'
import { countries, runs } from '../db/schema.ts'
import { evaluateGuess } from '../game/logic.ts'

const createdRunIds: string[] = []

afterEach(async () => {
  while (createdRunIds.length > 0) {
    const id = createdRunIds.pop()!
    await db.delete(runs).where(eq(runs.id, id))
  }
})

async function populationOf(countryId: number) {
  const [country] = await db
    .select({ population: countries.population })
    .from(countries)
    .where(eq(countries.id, countryId))
  return country!.population
}

describe('POST /api/runs and /api/runs/:id/guess', () => {
  it('accepts a correct guess, keeps the run alive and reports the new streak', async () => {
    const start = await request(app).post('/api/runs').expect(201)
    createdRunIds.push(start.body.runId)

    const leftPop = await populationOf(start.body.left.id)
    const rightPop = await populationOf(start.body.right.id)
    const pick = evaluateGuess(leftPop, rightPop, 'left') ? 'left' : 'right'

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

    const leftPop = await populationOf(start.body.left.id)
    const rightPop = await populationOf(start.body.right.id)
    const wrongPick = evaluateGuess(leftPop, rightPop, 'left') ? 'right' : 'left'

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
})
