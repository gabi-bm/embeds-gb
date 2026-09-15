# Higher or Lower

Guess which country has the bigger population. Streaks and a leaderboard are tracked server-side in Postgres so the client can't cheat.

React 19 + Vite on the client, Express 5 + Drizzle ORM on the server, TypeScript throughout.

## Running it

```bash
npm install
npm run setup   # requires a local Postgres 16 running
npm run dev     # client on :5173, API on :4000
```

See `AGENTS.md` for the full setup, verification commands, conventions, and worktree/parallel-session notes — that file is the source of truth for how to work in this repo.
