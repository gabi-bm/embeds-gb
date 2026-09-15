import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../app.ts'

describe('GET /api/categories', () => {
  it('returns all categories including the seeded population category', async () => {
    const res = await request(app).get('/api/categories').expect(200)

    expect(Array.isArray(res.body.categories)).toBe(true)
    expect(res.body.categories.length).toBeGreaterThanOrEqual(1)

    const population = res.body.categories.find(
      (c: { slug: string }) => c.slug === 'population',
    )

    expect(population).toBeDefined()
    expect(typeof population.id).toBe('number')
    expect(population.name).toBe('Country population')
    expect(population.unit).toBe('people')
    expect(population.description).toBe('Which country has the bigger population?')
    expect(population.itemCount).toBeGreaterThan(1)
    expect(Object.keys(population).sort()).toEqual([
      'description',
      'id',
      'itemCount',
      'name',
      'slug',
      'unit',
    ])
  })
})
