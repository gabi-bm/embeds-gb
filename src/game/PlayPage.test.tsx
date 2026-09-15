// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlayPage from './PlayPage.tsx'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function renderPlay(slug = 'population') {
  return render(
    <MemoryRouter initialEntries={[`/play/${slug}`]}>
      <Routes>
        <Route path="/play/:categorySlug" element={<PlayPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      const method = init?.method ?? 'GET'

      if (url.startsWith('/api/leaderboard')) {
        const category = new URL(url, 'http://localhost').searchParams.get('category')
        if (category === 'gdp') {
          return jsonResponse({
            entries: [{ nickname: 'GdpAce', bestStreak: 7, createdAt: '2024-01-01T00:00:00.000Z' }],
          })
        }
        if (category === 'population') {
          return jsonResponse({
            entries: [{ nickname: 'PopAce', bestStreak: 3, createdAt: '2024-01-02T00:00:00.000Z' }],
          })
        }
        if (category && category !== 'gdp' && category !== 'population') {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'category not found' }), { status: 404 }),
          )
        }
        return jsonResponse({ entries: [] })
      }
      if (url === '/api/categories') {
        return jsonResponse({
          categories: [
            {
              id: 1,
              slug: 'population',
              name: 'Country population',
              unit: 'people',
              description: 'Which thing is bigger, really?',
              itemCount: 50,
            },
          ],
        })
      }
      if (url === '/api/runs' && method === 'POST') {
        return jsonResponse({
          runId: 'run-1',
          streak: 0,
          left: { id: 1, name: 'Testlandia' },
          right: { id: 2, name: 'Mockovia' },
        })
      }
      if (url === '/api/runs/run-1/guess' && method === 'POST') {
        return jsonResponse({
          correct: true,
          streak: 1,
          bestStreak: 1,
          revealed: {
            left: { id: 1, name: 'Testlandia', value: 10 },
            right: { id: 2, name: 'Mockovia', value: 20 },
          },
          next: {
            left: { id: 2, name: 'Mockovia' },
            right: { id: 3, name: 'Placeholderia' },
          },
        })
      }

      throw new Error(`unexpected fetch: ${method} ${url}`)
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PlayPage', () => {
  it('plays a round and advances the streak on a correct guess', async () => {
    const user = userEvent.setup()
    renderPlay()

    await user.click(screen.getByRole('button', { name: 'Play' }))

    await screen.findByText('Testlandia')
    expect(screen.getByText('Mockovia')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Mockovia/ }))

    await screen.findByText('20 people')
    expect(screen.getByText('10 people')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('1', { selector: '.streak strong' })).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Next round' }))

    await screen.findByText('Placeholderia')
  })

  it("renders the active category's description instead of a hardcoded question", async () => {
    const user = userEvent.setup()
    renderPlay()

    await user.click(screen.getByRole('button', { name: 'Play' }))

    await screen.findByText('Testlandia')

    await screen.findByText('Which thing is bigger, really?')
    expect(
      screen.queryByText('Which of these countries has the bigger population?'),
    ).toBeNull()
  })

  it("sends the route's category slug when starting a run", async () => {
    const user = userEvent.setup()
    renderPlay('gdp')

    await user.click(screen.getByRole('button', { name: 'Play' }))

    await screen.findByText('Testlandia')

    const runsCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => {
        const url = typeof input === 'string' ? input : input.toString()
        return url === '/api/runs'
      })

    expect(runsCall).toBeDefined()
    expect(JSON.parse(String(runsCall?.[1]?.body))).toEqual({ categorySlug: 'gdp' })
  })

  it('shows the leaderboard scoped to the current category', async () => {
    renderPlay('gdp')

    await screen.findByText('GdpAce')
    expect(screen.queryByText('PopAce')).toBeNull()

    const leaderboardCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => {
        const url = typeof input === 'string' ? input : input.toString()
        return url.startsWith('/api/leaderboard')
      })

    expect(leaderboardCall).toBeDefined()
    const url = typeof leaderboardCall?.[0] === 'string' ? leaderboardCall[0] : leaderboardCall?.[0]?.toString()
    expect(url).toContain('category=gdp')
  })

  it('degrades to the empty state when the category leaderboard 404s', async () => {
    renderPlay('not-a-real-category')

    await screen.findByText('No scores yet — be the first.')
  })

  it('shows a friendly empty-category message and an escape hatch when the category has too few items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        const method = init?.method ?? 'GET'

        if (url.startsWith('/api/leaderboard')) {
          return jsonResponse({ entries: [] })
        }
        if (url === '/api/categories') {
          return jsonResponse({
            categories: [
              {
                id: 1,
                slug: 'population',
                name: 'Country population',
                unit: 'people',
                description: 'Which thing is bigger, really?',
                itemCount: 50,
              },
            ],
          })
        }
        if (url === '/api/runs' && method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'not enough items seeded' }), { status: 503 }),
          )
        }

        throw new Error(`unexpected fetch: ${method} ${url}`)
      }),
    )

    const user = userEvent.setup()
    renderPlay()

    await user.click(screen.getByRole('button', { name: 'Play' }))

    await screen.findByText(/isn't ready to play yet/)
    expect(screen.getByRole('link', { name: /Back to categories/ })).toBeInTheDocument()
  })
})
