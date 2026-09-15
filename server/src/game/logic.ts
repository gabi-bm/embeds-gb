export type Side = 'left' | 'right'

/** Does the picked side actually have the bigger value? */
export function evaluateGuess(
  leftValue: number,
  rightValue: number,
  pick: Side,
): boolean {
  if (pick === 'left') return leftValue > rightValue
  return rightValue > leftValue
}

/** Pick a random item id different from every id in `excludeIds`. */
export function pickNextItemId(
  allIds: readonly number[],
  excludeIds: readonly number[],
): number {
  const candidates = allIds.filter((id) => !excludeIds.includes(id))
  const pool = candidates.length > 0 ? candidates : allIds
  return pool[Math.floor(Math.random() * pool.length)]!
}
