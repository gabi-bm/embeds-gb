// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()

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
              description: 'Which country has the bigger population?',
            },
          ],
        })
      }

      throw new Error(`unexpected fetch: ${url}`)
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the category picker at /', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByText('Country population')
  })

  it('renders the game at /play/:categorySlug', () => {
    render(
      <MemoryRouter initialEntries={['/play/population']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('renders the game for any category slug', () => {
    render(
      <MemoryRouter initialEntries={['/play/some-other-slug']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })
})
