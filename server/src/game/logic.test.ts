import { describe, expect, it } from 'vitest'
import { evaluateGuess, pickNextCountryId } from './logic.ts'

describe('evaluateGuess', () => {
  it('is correct when picking left and the left population is bigger', () => {
    expect(evaluateGuess(200, 100, 'left')).toBe(true)
  })

  it('is incorrect when picking left and the right population is bigger', () => {
    expect(evaluateGuess(100, 200, 'left')).toBe(false)
  })

  it('is correct when picking right and the right population is bigger', () => {
    expect(evaluateGuess(100, 200, 'right')).toBe(true)
  })

  it('is incorrect when picking right and the left population is bigger', () => {
    expect(evaluateGuess(200, 100, 'right')).toBe(false)
  })

  it('treats an exact tie as wrong either way', () => {
    expect(evaluateGuess(100, 100, 'left')).toBe(false)
    expect(evaluateGuess(100, 100, 'right')).toBe(false)
  })
})

describe('pickNextCountryId', () => {
  it('never returns an excluded id when other candidates exist', () => {
    for (let i = 0; i < 50; i++) {
      const next = pickNextCountryId([1, 2, 3, 4], [2, 3])
      expect([1, 4]).toContain(next)
    }
  })

  it('falls back to the full pool when everything is excluded', () => {
    const next = pickNextCountryId([1, 2], [1, 2])
    expect([1, 2]).toContain(next)
  })
})
