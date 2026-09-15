import type { LeaderboardEntry } from './api.ts'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

export function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return <p className="leaderboard-empty">No scores yet — be the first.</p>
  }

  return (
    <ol className="leaderboard">
      {entries.map((entry, i) => (
        <li key={`${entry.nickname}-${entry.createdAt}`}>
          <span className="leaderboard-rank">{i + 1}</span>
          <span className="leaderboard-name">{entry.nickname}</span>
          <span className="leaderboard-score">{entry.bestStreak}</span>
        </li>
      ))}
    </ol>
  )
}
