export type Side = 'left' | 'right'

export interface CountryRef {
  id: number
  name: string
}

export interface RevealedCountry extends CountryRef {
  population: number
}

export interface StartRunResponse {
  runId: string
  streak: number
  left: CountryRef
  right: CountryRef
}

export interface GuessResponse {
  correct: boolean
  streak?: number
  finalStreak?: number
  bestStreak: number
  revealed: { left: RevealedCountry; right: RevealedCountry }
  next?: { left: CountryRef; right: CountryRef }
}

export interface LeaderboardEntry {
  nickname: string
  bestStreak: number
  createdAt: string
}

export interface Category {
  id: number
  slug: string
  name: string
  unit: string
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `request failed with ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function startRun(): Promise<StartRunResponse> {
  return fetch('/api/runs', { method: 'POST' }).then((res) =>
    asJson<StartRunResponse>(res),
  )
}

export function submitGuess(runId: string, pick: Side): Promise<GuessResponse> {
  return fetch(`/api/runs/${runId}/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pick }),
  }).then((res) => asJson<GuessResponse>(res))
}

export function submitNickname(runId: string, nickname: string): Promise<void> {
  return fetch(`/api/runs/${runId}/nickname`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  }).then((res) => asJson<void>(res))
}

export function fetchLeaderboard(
  limit = 10,
): Promise<{ entries: LeaderboardEntry[] }> {
  return fetch(`/api/leaderboard?limit=${limit}`).then((res) =>
    asJson<{ entries: LeaderboardEntry[] }>(res),
  )
}

export function fetchCategories(): Promise<{ categories: Category[] }> {
  return fetch('/api/categories').then((res) =>
    asJson<{ categories: Category[] }>(res),
  )
}
