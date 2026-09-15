export type Side = 'left' | 'right'

/** Does the picked side actually have the bigger population? */
export function evaluateGuess(
  leftPopulation: number,
  rightPopulation: number,
  pick: Side,
): boolean {
  if (pick === 'left') return leftPopulation > rightPopulation
  return rightPopulation > leftPopulation
}

/** Pick a random country id different from every id in `excludeIds`. */
export function pickNextCountryId(
  allIds: readonly number[],
  excludeIds: readonly number[],
): number {
  const candidates = allIds.filter((id) => !excludeIds.includes(id))
  const pool = candidates.length > 0 ? candidates : allIds
  return pool[Math.floor(Math.random() * pool.length)]!
}
