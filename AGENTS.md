# AGENTS.md

## What this is

"Higher or Lower": guess which country has the bigger population, streaks tracked server-side. React 19 + Vite (client) and Express 5 (API) on Node 24, TypeScript throughout, Postgres via Drizzle ORM. Single app, no monorepo: client in `src/`, server in `server/src/`.

## Setup

```bash
npm install
npm run setup   # creates a per-worktree DB, writes .env, migrates, seeds
```

Requires a local Postgres 16 running (e.g. `brew services start postgresql@16`). No prompts, no secrets — `npm run setup` derives `DATABASE_URL` from your OS username and the current directory name.

## Verify — run these before every PR

| Step | Command | Runtime |
|---|---|---|
| Lint | `npm run lint` | ~1 s |
| Typecheck | `npm run typecheck` | ~2 s |
| Tests (unit + integration, needs the DB from setup) | `npm test` | ~1 s |
| Build | `npm run build` | ~1 s |
| Single test file | `npx vitest run <path>` | seconds |

Never run bare `npm run test:watch` or `vite` expecting it to exit — both watch/serve forever.

## Conventions

- Server code lives in `server/src/`: routes in `routes/`, pure logic (no DB) in `game/`, DB access in `db/`. Route handlers should stay thin; put branching logic in testable pure functions like `game/logic.ts`.
- Client game code lives in `src/game/`; `src/App.tsx` is the top-level layout only.
- Tests sit next to the file they cover (`foo.ts` + `foo.test.ts`), run with Vitest. Server tests run in the `node` environment by default; a client test that needs the DOM adds `// @vitest-environment jsdom` as its first line.
- Schema changes: edit `server/src/db/schema.ts`, then `npm run db:generate` to produce a migration in `server/src/db/migrations/` — commit the generated SQL, never hand-edit it.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`). Branch from `main`.

## Adding a category

A category is just rows in two existing tables, not new tables — no migration needed. `categories` has `id, slug (unique), name, unit, description (nullable)`; `items` has `id, categoryId` (FK to `categories.id`), `name, value` (`numeric` column stored/returned as `bigint`).

Steps:

1. Copy `server/src/db/gdp.data.ts` to `server/src/db/<slug>.data.ts`. Export `<NAME>_CATEGORY` (`{ slug, name, unit, description } as const`) and `<NAME>_SEED` (`ReadonlyArray<{ name: string; value: number }>`), keeping the disclaimer JSDoc comment the other dataset files use above the seed array.
2. In `server/src/db/seed.ts`, import both exports and add one entry to `SEED_DEFINITIONS`: `{ category: <NAME>_CATEGORY, items: <NAME>_SEED }`.
3. Run `npm run db:seed`. `seedAll()` upserts the category by slug and only inserts items for a category that doesn't already have any, so it's safe to re-run and will only seed the new category.
4. Per the Definition of Done, consider extending `server/src/db/seed.test.ts` to cover the new category.

That's it — no migration and no client changes are needed beyond the data file and the registry line. `GET /api/categories` picks up any row generically, including an `itemCount` the client uses for empty-state UI; the home page renders any category and shows "Coming soon" for one with fewer than 2 items; the play page (`/play/:categorySlug`) works for any slug; the client's value formatter (`src/game/format.ts`) falls back to `"<magnitude> <unit>"` for any unit it doesn't special-case (only `USD` gets `$` treatment).

Gotchas:

- Values must be whole integers — `seedAll()` runs each one through `BigInt()`, which throws a `RangeError` on a fractional number. This has bitten prior PRs in this project.
- Use `_`-separated numeric literals (e.g. `1_100_000_000_000`) for readability, matching the existing dataset files.
- The slug must be URL-safe (lowercase, hyphens) and unique.
- A category needs at least 2 items to be playable.

See `docs/multi-category-design.md` for historical design context (it intentionally documents the pre-implementation state — don't edit it).

## Never do this

- `npm run db:reset` outside of your own local/worktree database — it drops and recreates whatever DB `DATABASE_URL` points at.
- Hand-edit files under `server/src/db/migrations/`.
- Commit `.env` (already gitignored) or any real credential.
- `git push --force` on `main`.

## Definition of done

- Lint, typecheck, tests, and build all green (table above).
- New behavior has a test asserting it, not just "doesn't throw".
- `AGENTS.md`/`README.md` updated if setup or commands changed.
- PR template checklist filled in.

## Worktrees / parallel sessions

- Create with `git worktree add ../embeds-gb-<task> -b <branch>` (worktrees live beside the repo, never inside it).
- Then `npm install && npm run setup` in the new worktree — the DB name is derived from the worktree's directory name, so it gets its own database automatically.
- Pick an unused `PORT` per session, e.g. `PORT=4001 npm run dev`. Both the server and the client's dev proxy read the same `PORT` env var, so setting it once covers both.
- Conflict surface: `server/src/db/migrations/` and `package-lock.json` are what most branches touch — regenerate/rebase rather than hand-merging either.
