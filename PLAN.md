Summary: Turn the repo from a bare Vite/React scaffold (with an unrelated "embeds testing" mock page) into a small "Higher or Lower" country-population guessing game with a real Postgres-backed API, and bring the repo up to loop-engineering-ready state (AGENTS.md, reproducible setup, non-interactive verification, CI, task templates) so a later feature can be handed to an unattended agent loop.

Context (from exploration):
- Repo is a fresh `npm create vite` React 19 + TS scaffold. `src/App.tsx` is placeholder "embed testing sandbox" content unrelated to this project's real purpose — will be replaced by the game UI.
- No backend, no DB, no tests, no CI, no AGENTS.md/CLAUDE.md today.
- TS project uses references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`), both `noEmit: true`; `oxlint` is the linter (`.oxlintrc.json`); `package.json` scripts are `dev`/`build`/`lint`/`preview`.
- Node 24.12.0 is active (has stable `node:sqlite`, but user chose Postgres — noted below).
- **Docker is not actually usable on this machine**: `/usr/local/bin/docker` is a dangling symlink to a `Docker.app` that isn't installed, daemon isn't running. There **is** a native Homebrew Postgres 16 already running locally on `:5432` (trust auth, OS user `gabriel` is already a DB superuser role, no password). User confirmed: build against this local Postgres instead of Docker.
- `.agents/skills/loop-engineering-audit/references/rubric.md`, `agent-docs.md`, and `assets/AGENTS.example.md` define exactly what the later audit will grade — this plan is designed to satisfy Dimensions 1–7 at a reasonable (not gold-plated) level, and Dimension 8 (parallel/worktree readiness) via a DB-name-per-directory convention since we don't have Docker's automatic per-project isolation.

System Impact:
- Source of truth for game state (country data, run/streak/score) moves server-side into Postgres; the client becomes a thin view that never sees a country's population until the server reveals it — prevents client-side cheating and gives a real reason to have a backend.
- New long-lived local service dependency: Postgres must be running before `npm run dev`/tests. Setup is made one-command and idempotent (`npm run setup`) so this doesn't become a manual, undocumented step (rubric 2.3/2.6).
- New process topology: Vite dev server (client, :5173) + Express API server (:PORT, default 4000), joined by a Vite dev-proxy on `/api` — no CORS config needed, no separate deploy target introduced (out of scope per user's answer).
- Introduces migrations as the schema's source of truth (Drizzle schema.ts → generated SQL in `server/src/db/migrations/`, committed) — this becomes the one sanctioned way to change the DB shape, documented as a rule in AGENTS.md (rubric 7.6).
- Repo gains an agent-facing contract (AGENTS.md) that must stay accurate — every command it documents must actually exist, since a later loop/audit will check that literally.

Approach:
- **DB**: Postgres (already running locally), not Docker. `scripts/setup.mjs` derives a DB name from the working-directory basename (e.g. `higherlower_embeds_gb`, or `higherlower_embeds_gb_task123` in a worktree dir) so parallel worktrees don't collide on the same logical database (rubric 8.3) even without container-level isolation. No password needed locally (trust auth) → satisfies "no secrets required for local test run" (2.7).
- **Schema/migrations**: Drizzle ORM + drizzle-kit. Chosen over Prisma because it's pure SQL with no compiled query-engine binary to fetch/cache (friendlier to a sandboxed agent loop) and over raw `pg` because generated, committed migration files give an actual migration history to practice with.
- **API**: Express (most legible/familiar for a learning project) exposing 3 endpoints, DB is the only source of truth for correctness:
  - `POST /api/runs` — start a run: pick 2 random countries, return names only (no populations), create a `runs` row.
  - `POST /api/runs/:id/guess` — compare current pair server-side, update streak/best_streak, reveal the just-compared populations, return the next pair (names only) or mark the run ended.
  - `PATCH /api/runs/:id/nickname` — attach a nickname to an ended run so it can appear on the leaderboard.
  - `GET /api/leaderboard` — top N ended runs by `best_streak`.
- **Frontend**: replace `src/App.tsx`'s placeholder content with the game (two country cards, Higher/Lower buttons, streak display, game-over + nickname submission, leaderboard list). Existing `App.css`/assets get repurposed or trimmed as needed.
- **Loop-engineering readiness**, sized to what the rubric actually checks (not gold-plated):
  - `AGENTS.md` (+ one-line `CLAUDE.md` deferring to it) following `assets/AGENTS.example.md`'s shape: what this is, setup, verify commands with runtimes, conventions, forbidden actions, definition of done, worktree/parallel-session notes.
  - `.env.example` with placeholders (setup script resolves the real per-worktree `DATABASE_URL`).
  - `.node-version` (pin `24.12.0`) + `engines` in package.json.
  - Non-interactive scripts for lint (`oxlint`, already fine), typecheck (`tsc -b`), unit+integration tests (`vitest run`), build (`vite build` via existing `tsc -b && vite build`).
  - Tests: a pure-function unit test for the scoring logic (no DB needed) + one supertest integration test file hitting the real Express app against the local Postgres DB, self-cleaning (deletes only the rows it creates) rather than truncating shared tables.
  - `.github/workflows/ci.yml` using an actual `postgres:16` service container (matches local major version) — mirrors the same lint/typecheck/test/build commands AGENTS.md documents (rubric 6.2).
  - `.github/PULL_REQUEST_TEMPLATE.md` and one `.github/ISSUE_TEMPLATE/feature_task.md` with an acceptance-criteria section — directly useful for the "hand the loop a separate feature next" step.
  - A minimal `simple-git-hooks` pre-commit running `oxlint` (cheap, catches lint breaks before they reach the loop).
  - `db:reset` explicitly documented as fenced/destructive in AGENTS.md's "Never do this" list, even though it's scoped to the per-worktree DB name only.

Changes:
- `src/App.tsx`, `src/App.css` — replace embed-sandbox mock content with the game UI (fetch-based, talks to `/api/*`).
- `server/src/db/schema.ts` — Drizzle schema: `countries` (id, name, population), `runs` (id, left_country_id, right_country_id, streak, best_streak, status, nickname, timestamps).
- `server/src/db/client.ts` — Drizzle + `pg` Pool wired to `process.env.DATABASE_URL`.
- `server/src/db/migrate.ts` — applies pending migrations (used by `npm run db:migrate`, local and CI).
- `server/src/db/seed.ts` — idempotent insert of ~50 countries with population figures.
- `server/src/db/reset.ts` — drops/recreates only the DB named in `DATABASE_URL` (fenced, documented).
- `server/src/db/migrations/*.sql` — generated by `drizzle-kit generate`, committed.
- `server/src/game/logic.ts` + `logic.test.ts` — pure `evaluateGuess(leftPop, rightPop, guess)`, unit tested.
- `server/src/routes/runs.ts`, `server/src/routes/leaderboard.ts`, `server/src/routes/runs.test.ts` — route handlers + one supertest integration test.
- `server/src/app.ts` (exports Express app, no `listen`) / `server/src/index.ts` (calls `app.listen`) — split so tests can import the app without binding a port.
- `drizzle.config.ts` — drizzle-kit config (schema path, migrations out dir, `DATABASE_URL`).
- `scripts/setup.mjs` — one-command setup: resolve per-worktree DB name → write `.env` if missing → create DB if missing → run migrate → run seed.
- `vite.config.ts` — add `server.proxy['/api']` → `http://localhost:${PORT}`.
- `vitest.config.ts` — `environmentMatchGlobs` so `src/**` tests run in `jsdom`, `server/**` in `node`.
- `tsconfig.server.json` (+ add to `tsconfig.json` references) — typechecks `server/`.
- `package.json` — new deps (`express`, `drizzle-orm`, `pg`) + devDeps (`tsx`, `concurrently`, `drizzle-kit`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `supertest`, `simple-git-hooks`, relevant `@types/*`); scripts: `dev` (client+server via `concurrently`), `dev:client`, `dev:server`, `setup`, `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `typecheck`, `test`, `test:watch`.
- `.env.example`, `.node-version` — new.
- `AGENTS.md`, `CLAUDE.md` — new, following the audit skill's own template.
- `.github/workflows/ci.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/feature_task.md` — new.
- `.simple-git-hooks.json` (or equivalent) — new pre-commit hook running `oxlint`.
- `README.md` — trim Vite boilerplate, add a short "what is this / how to run" pointing at `AGENTS.md`.

Verification:
- `npm run setup` from a clean clone (or a `git worktree` checkout with a different directory name) creates its own DB, migrates, and seeds without prompts.
- `npm run dev` serves the game at `:5173`, guesses round-trip through `/api` to Postgres, streak/leaderboard persist across a page reload.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` each run non-interactively and exit non-zero on failure; confirm by intentionally breaking one file per command and seeing it fail, then reverting.
- `.github/workflows/ci.yml` is exercised by opening a throwaway PR (or `act`, if available) to confirm the Postgres service container + migrate/seed/lint/typecheck/test/build sequence goes green with no secrets.
- Manually re-run the specific rubric checks this plan targets (1.1–1.7, 2.1–2.7, 3.1–3.7, parts of 7) against the finished repo to sanity-check before eventually invoking `loop-engineering-audit` for real.
