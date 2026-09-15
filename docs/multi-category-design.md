# Multi-Category Higher/Lower — Design Doc

## Goal

Generalize the game from a single hardcoded "country population" comparison into a game with a **home page category picker** and a **per-category play page**, so we can add categories (GDP, area, movies, etc.) without touching the core comparison mechanic each time.

## Current architecture (as of `f22655d`)

- **Schema** (`server/src/db/schema.ts`): a single flat `countries` table (`id`, `name`, `population`). `runs` hardcodes `leftCountryId`/`rightCountryId` FKs into `countries`; no category concept anywhere.
- **Logic** (`server/src/game/logic.ts`): `evaluateGuess(leftPopulation, rightPopulation, pick)` and `pickNextCountryId(allIds, excludeIds)` — both already operate on plain numbers/ids, not on `Country` objects. This is good news: the comparison mechanic is already category-agnostic in practice, just named/typed around "country".
- **Routes**: `server/src/routes/runs.ts` and `leaderboard.ts` query the `countries` table directly and assume a single global leaderboard. No category filtering exists at the API layer.
- **Client**: no router at all — `src/main.tsx` renders `<App/>` directly, and `App.tsx` is a single component driven by a `Phase` state machine (`idle → loading → playing → revealed → ended`) from `src/game/useGame.ts`. There's no home/play split today; adding one requires introducing client-side routing.
- **Seed data**: `server/src/db/countries.data.ts` (static `{name, population}` array) + `server/src/db/seed.ts` (idempotent insert). This is the pattern any new category's dataset needs to replicate.

## Proposed data model

Replace the population-specific `countries` table with a generic pair:

- **`categories`**: `id`, `slug`, `name`, `unit` (e.g. `"people"`, `"USD"`, `"km²"`), `description`.
- **`items`**: `id`, `categoryId` FK, `name`, `value` — generalizes `countries`. `value` should be `numeric`/`bigint`, not `integer`: population fits `int32`, but GDP in USD does not.
- **`runs`**: rename `leftCountryId`/`rightCountryId` → `leftItemId`/`rightItemId`; add `categoryId` (denormalized for query simplicity, even though it's derivable via the item).
- **`leaderboard`**: segment by `categoryId` — decide open question below on whether a global leaderboard also survives.

Migration: create `categories`/`items`, backfill `items` from `countries` under a `population` category row, migrate `runs`/leaderboard, then drop `countries`. Per `AGENTS.md`, this goes through `npm run db:generate` with the generated SQL committed as-is.

## API changes

- `GET /api/categories` — list for the home page picker.
- `POST /api/runs` — takes `categoryId`, scopes item selection to it.
- `POST /api/runs/:id/guess` — unchanged logic, just loads `items` instead of `countries`.
- `GET /api/leaderboard?category=<slug>` — filtered.

## Client changes

- Introduce a router (react-router is the obvious choice — currently no routing dependency exists at all) for `/` (category picker) and `/play/:categorySlug`.
- `useGame` needs a `categoryId`/`categorySlug` threaded through `start()` and the API calls in `src/game/api.ts`.
- New home page component (category grid, fetches `/api/categories`, navigates on select).
- Per-category value formatting on the client — "1.4B people" vs "$21T" vs "9.8M km²" needs a formatter keyed by category unit, not just a raw number.

## First batch of categories (proposed)

Reusing the existing "guess which is bigger" mechanic, four to start:

1. **Country population** — existing dataset, migrated as-is.
2. **Country GDP (nominal, USD)** — public World Bank/IMF figures.
3. **Country land area (km²)** — public reference data.
4. **Movie box office gross (USD)** — a lighter, pop-culture category to prove the pattern isn't just "serious country stats."

Each needs its own `*.data.ts` seed file following the `countries.data.ts` pattern, and `seed.ts` needs to loop over categories instead of assuming one dataset.

## Open questions

- **Leaderboard scope**: ~~one leaderboard per category, a single global one, or both? Affects schema and home/play UI.~~ **Resolved** (issue #5): both — `GET /api/leaderboard` stays global and `GET /api/leaderboard?category=<slug>` narrows to one category; omitting `category` defaults to global because `bestStreak` is dimensionless (a count, not a category-scoped value), so mixing categories there is semantically sound.
- **Value type**: confirm `numeric`/`bigint` covers all planned categories (GDP in particular).
- **Category management**: seed-only/static for now, or admin-editable later? Assume static for v1.
- **Formatting**: does unit formatting live in a shared client util keyed by `category.unit`, or per-category config?

## Suggested phasing (→ GitHub issues)

1. Schema & migration: `categories`/`items` tables, backfill population data, update `runs`/leaderboard schema.
2. Server API generalization: category endpoint, route changes in `runs.ts`/`leaderboard.ts`.
3. Client routing & home page: add router, category picker page.
4. Client play page: parameterize `useGame`/`api.ts` by category, per-category value formatting.
5. New category content: GDP, area, movie box office seed data.
6. Polish: per-category leaderboard UI, empty/loading states, `AGENTS.md`/`README.md` updates.

## Tracking

GitHub Issues + Projects: one issue per phase item above, project board with a Status field (Backlog/In Progress/Done), each issue linked to its phase.
