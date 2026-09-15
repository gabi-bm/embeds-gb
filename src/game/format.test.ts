import { describe, expect, it } from 'vitest'
import { formatValue } from './format.ts'

describe('formatValue', () => {
  it('formats people with a B suffix', () => {
    expect(formatValue(1_400_000_000, 'people')).toBe('1.4B people')
  })

  it('formats USD with a T suffix and dollar prefix', () => {
    expect(formatValue(21_000_000_000_000, 'USD')).toBe('$21T')
  })

  it('formats km² with an M suffix', () => {
    expect(formatValue(9_800_000, 'km²')).toBe('9.8M km²')
  })

  it('trims a trailing .0 for whole-number magnitudes', () => {
    expect(formatValue(1_000_000, 'people')).toBe('1M people')
  })

  it('rounds to one decimal place', () => {
    expect(formatValue(1_234_567, 'people')).toBe('1.2M people')
  })

  it('renders below-1000 values as plain integers', () => {
    expect(formatValue(500, 'people')).toBe('500 people')
  })

  it('formats USD below 1M with a K suffix', () => {
    expect(formatValue(1_500, 'USD')).toBe('$1.5K')
  })

  it('formats zero', () => {
    expect(formatValue(0, 'people')).toBe('0 people')
  })

  it('falls back gracefully for an unrecognized unit', () => {
    expect(formatValue(2_000_000, 'films')).toBe('2M films')
  })

  it('omits the unit suffix when no unit is given', () => {
    expect(formatValue(2_000_000)).toBe('2M')
  })
})
