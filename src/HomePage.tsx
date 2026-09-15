import { Link } from 'react-router'

function HomePage() {
  return (
    <main id="home">
      <h1>Higher or Lower</h1>
      <p>Pick a category to play. (Category picker coming soon.)</p>
      {/* TODO(#7): replace with the real category picker */}
      <Link to="/play/population">Play country population</Link>
    </main>
  )
}

export default HomePage
