import express from 'express'
import { leaderboardRouter } from './routes/leaderboard.ts'
import { runsRouter } from './routes/runs.ts'

export const app = express()

app.use(express.json())
app.use('/api/runs', runsRouter)
app.use('/api/leaderboard', leaderboardRouter)

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ error: 'internal server error' })
  },
)
