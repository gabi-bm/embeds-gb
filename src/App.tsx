import { Route, Routes } from 'react-router'
import './App.css'
import HomePage from './game/HomePage.tsx'
import PlayPage from './game/PlayPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play/:categorySlug" element={<PlayPage />} />
    </Routes>
  )
}

export default App
