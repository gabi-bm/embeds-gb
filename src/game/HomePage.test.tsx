// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage.tsx'

const CATEGORIES = [
  { id: 1, slug: 'population', name: 'Country population', unit: 'people' },
  { id: 2, slug: 'gdp', name: 'Country GDP', unit: 'USD' },
]

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function PlayStub() {
  const { categorySlug } = useParams()
  return <p>play:{categorySlug}</p>
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/:categorySlug" element={<PlayStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/categories') {
        return jsonResponse({ categories: CATEGORIES })
      }

      throw new Error(`unexpected fetch: ${url}`)
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('shows a loading state while categories are being fetched', () => {
    renderHome()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders the fetched categories', async () => {
    renderHome()

    await screen.findByRole('link', { name: /Country population/ })
    expect(screen.getByText('Country GDP')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
  })

  it('navigates to the play page when a category is selected', async () => {
    const user = userEvent.setup()
    renderHome()

    await screen.findByRole('link', { name: /Country population/ })
    await user.click(screen.getByRole('link', { name: /Country GDP/ }))

    await screen.findByText('play:gdp')
  })

  it('shows an error message when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ error: 'boom' }, 500)),
    )

    renderHome()

    await screen.findByText(/boom/)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
