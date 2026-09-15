const MAGNITUDES: Array<{ threshold: number; divisor: number; suffix: string }> = [
  { threshold: 1e12, divisor: 1e12, suffix: 'T' },
  { threshold: 1e9, divisor: 1e9, suffix: 'B' },
  { threshold: 1e6, divisor: 1e6, suffix: 'M' },
  { threshold: 1e3, divisor: 1e3, suffix: 'K' },
]

function formatMagnitude(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  const magnitude = MAGNITUDES.find((m) => abs >= m.threshold)

  if (!magnitude) {
    return `${sign}${String(Math.round(abs))}`
  }

  const scaled = Math.round((abs / magnitude.divisor) * 10) / 10
  return `${sign}${String(scaled)}${magnitude.suffix}`
}

export function formatValue(value: number, unit?: string): string {
  const magnitudeString = formatMagnitude(value)

  if (!unit) {
    return magnitudeString
  }

  if (unit === 'USD') {
    return `$${magnitudeString}`
  }

  return `${magnitudeString} ${unit}`
}
