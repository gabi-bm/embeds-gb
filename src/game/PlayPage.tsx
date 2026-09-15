import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchCategories, type Category } from './api.ts'
import { CountryCard } from './CountryCard.tsx'
import { Leaderboard } from './Leaderboard.tsx'
import { useGame } from './useGame.ts'

function PlayPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const { state, start, guess, next, nickname, loadLeaderboard } = useGame(categorySlug)
  const [nicknameInput, setNicknameInput] = useState('')
  const [unit, setUnit] = useState<string | undefined>(undefined)
  const [category, setCategory] = useState<Category | undefined>(undefined)

  useEffect(() => {
    void loadLeaderboard()
  }, [loadLeaderboard])

  useEffect(() => {
    let cancelled = false

    fetchCategories()
      .then(({ categories }) => {
        if (cancelled) return
        const match = categories.find((c) => c.slug === categorySlug)
        setUnit(match?.unit)
        setCategory(match)
      })
      .catch(() => {
        // Ignore: numbers render unsuffixed and the game remains playable.
      })

    return () => {
      cancelled = true
    }
  }, [categorySlug])

  return (
    <main id="game">
      <header className="game-header">
        <h1>Higher or Lower</h1>
      </header>

      {state.phase === 'idle' && (
        <section className="panel">
          {state.error && (
            <>
              <p className="error">
                {state.error === 'not enough items seeded'
                  ? "This category isn't ready to play yet — it doesn't have enough items."
                  : state.error}
              </p>
              <Link to="/">Back to categories</Link>
            </>
          )}
          <button type="button" className="primary" onClick={() => void start(categorySlug)}>
            Play
          </button>
        </section>
      )}

      {state.phase === 'loading' && (
        <section className="panel">
          <p>Loading…</p>
        </section>
      )}

      {(state.phase === 'playing' || state.phase === 'revealed' || state.phase === 'ended') &&
        state.left &&
        state.right && (
          <section className="board">
            <div className="streak">
              Streak <strong>{state.streak}</strong>
              <span className="best">best {state.bestStreak}</span>
            </div>

            <p className="question">
              {category?.description ?? 'Which of these has the bigger value?'}
            </p>

            <div className="cards">
              <CountryCard
                name={state.left.name}
                value={
                  state.reveal && state.reveal.left.id === state.left.id
                    ? state.reveal.left.value
                    : undefined
                }
                unit={unit}
                onClick={state.phase === 'playing' ? () => void guess('left') : undefined}
                disabled={state.busy}
                result={
                  state.lastResult?.pick === 'left'
                    ? state.lastResult.correct
                      ? 'correct'
                      : 'incorrect'
                    : undefined
                }
              />
              <span className="versus">vs</span>
              <CountryCard
                name={state.right.name}
                value={
                  state.reveal && state.reveal.right.id === state.right.id
                    ? state.reveal.right.value
                    : undefined
                }
                unit={unit}
                onClick={state.phase === 'playing' ? () => void guess('right') : undefined}
                disabled={state.busy}
                result={
                  state.lastResult?.pick === 'right'
                    ? state.lastResult.correct
                      ? 'correct'
                      : 'incorrect'
                    : undefined
                }
              />
            </div>

            {state.error && <p className="error">{state.error}</p>}

            {state.phase === 'revealed' && (
              <button type="button" className="primary" onClick={() => next()}>
                Next round
              </button>
            )}

            {state.phase === 'ended' && (
              <div className="game-over">
                <p>Run ended with a streak of {state.streak}.</p>

                {!state.nicknameSubmitted ? (
                  <form
                    className="nickname-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (nicknameInput.trim()) void nickname(nicknameInput.trim())
                    }}
                  >
                    <input
                      value={nicknameInput}
                      maxLength={20}
                      placeholder="Your name"
                      onChange={(e) => setNicknameInput(e.target.value)}
                    />
                    <button type="submit">Submit score</button>
                  </form>
                ) : (
                  <p className="nickname-submitted">Score submitted!</p>
                )}

                <button type="button" className="primary" onClick={() => void start(categorySlug)}>
                  Play again
                </button>
              </div>
            )}
          </section>
        )}

      <section className="leaderboard-panel">
        <h2>{category ? `${category.name} leaderboard` : 'Leaderboard'}</h2>
        <Leaderboard entries={state.leaderboard} />
      </section>
    </main>
  )
}

export default PlayPage
