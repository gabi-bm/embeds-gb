import { useCallback, useRef, useState } from 'react'
import {
  fetchLeaderboard,
  startRun,
  submitGuess,
  submitNickname,
  type CountryRef,
  type LeaderboardEntry,
  type RevealedCountry,
  type Side,
} from './api.ts'

type Phase = 'idle' | 'loading' | 'playing' | 'revealed' | 'ended'

interface LastResult {
  pick: Side
  correct: boolean
}

interface Reveal {
  left: RevealedCountry
  right: RevealedCountry
}

interface GameState {
  phase: Phase
  runId: string | null
  left: CountryRef | null
  right: CountryRef | null
  streak: number
  bestStreak: number
  reveal: Reveal | null
  lastResult: LastResult | null
  pendingNext: { left: CountryRef; right: CountryRef } | null
  error: string | null
  busy: boolean
  nicknameSubmitted: boolean
  leaderboard: LeaderboardEntry[]
}

const initialState: GameState = {
  phase: 'idle',
  runId: null,
  left: null,
  right: null,
  streak: 0,
  bestStreak: 0,
  reveal: null,
  lastResult: null,
  pendingNext: null,
  error: null,
  busy: false,
  nicknameSubmitted: false,
  leaderboard: [],
}

export function useGame() {
  const [state, setState] = useState<GameState>(initialState)
  const busyRef = useRef(false)

  const loadLeaderboard = useCallback(async () => {
    try {
      const { entries } = await fetchLeaderboard()
      setState((s) => ({ ...s, leaderboard: entries }))
    } catch {
      // leaderboard is a nice-to-have; a failed fetch shouldn't block the game
    }
  }, [])

  const start = useCallback(async (categorySlug?: string) => {
    busyRef.current = false
    setState((s) => ({ ...initialState, leaderboard: s.leaderboard, phase: 'loading' }))
    try {
      const res = await startRun(categorySlug)
      setState((s) => ({
        ...s,
        phase: 'playing',
        runId: res.runId,
        left: res.left,
        right: res.right,
        streak: res.streak,
      }))
    } catch (err) {
      setState((s) => ({ ...s, phase: 'idle', error: (err as Error).message }))
    }
  }, [])

  const guess = useCallback(
    async (side: Side) => {
      const runId = state.runId
      if (!runId || busyRef.current) return

      busyRef.current = true
      setState((s) => ({ ...s, busy: true, error: null }))

      try {
        const res = await submitGuess(runId, side)
        busyRef.current = false

        setState((s) => ({
          ...s,
          phase: res.correct ? 'revealed' : 'ended',
          streak: (res.correct ? res.streak : res.finalStreak) ?? s.streak,
          bestStreak: res.bestStreak,
          reveal: res.revealed,
          lastResult: { pick: side, correct: res.correct },
          pendingNext: res.correct && res.next ? res.next : null,
          busy: false,
        }))

        if (!res.correct) void loadLeaderboard()
      } catch (err) {
        busyRef.current = false
        setState((s) => ({ ...s, busy: false, error: (err as Error).message }))
      }
    },
    [state.runId, loadLeaderboard],
  )

  const next = useCallback(() => {
    setState((s) => {
      if (!s.pendingNext) return s
      return {
        ...s,
        phase: 'playing',
        left: s.pendingNext.left,
        right: s.pendingNext.right,
        reveal: null,
        lastResult: null,
        pendingNext: null,
      }
    })
  }, [])

  const nickname = useCallback(
    async (name: string) => {
      if (!state.runId) return
      try {
        await submitNickname(state.runId, name)
        setState((s) => ({ ...s, nicknameSubmitted: true }))
        void loadLeaderboard()
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message }))
      }
    },
    [state.runId, loadLeaderboard],
  )

  return { state, start, guess, next, nickname, loadLeaderboard }
}
