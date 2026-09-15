import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchCategories, type Category } from './api.ts'

function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchCategories()
      .then(({ categories }) => {
        if (cancelled) return
        setCategories(categories)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError((err as Error).message)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main id="home">
      <h1>Higher or Lower</h1>
      <p>Pick a category to play.</p>

      {loading && <p>Loading…</p>}

      {!loading && error && <p className="error">{error}</p>}

      {!loading && !error && categories.length === 0 && <p>No categories available.</p>}

      {!loading && !error && categories.length > 0 && (
        <ul className="category-grid">
          {categories.map((category) => (
            <li key={category.id}>
              <Link className="category-card" to={`/play/${category.slug}`}>
                {category.name}
                <span className="category-unit">{category.unit}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default HomePage
