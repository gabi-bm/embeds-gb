# Loop Engineering Audit — embeds-gb (Higher or Lower)

- **Date:** 2026-09-15
- **Commit:** `2618475` on `main`
- **Stack:** React 19 + Vite 8 (client) and Express 5 + Drizzle ORM (server) on Node 24, TypeScript throughout, Postgres 16. Single app, no workspaces: `src/` (client), `server/src/` (API).
- **Verdict:** 🟡 Partially ready
- **Blockers:** 0 · **Gaps:** 11 · **Unverifiable:** 1

Nothing here would hang or misdirect an unattended loop — there are zero blockers, every verify command is fast, non-interactive, and accurate, and the DB/worktree story is genuinely solid. The biggest single win is resolving the two committed lockfiles (`package-lock.json` and `pnpm-lock.yaml`): an agent or contributor could install with the wrong one and silently diverge from what CI actually tests. Everything else is small polish, not risk.

## Scorecard

| # | Dimension | Grade | Worst check | Evidence |
|---|---|---|---|---|
| 1 | Agent-facing context | 🟡 | 1.4 minor doc inaccuracy | `AGENTS.md:53` describes a manual proxy-update step that `vite.config.ts:6` already does automatically |
| 2 | Reproducible environment | 🟡 | 2.2 two committed lockfiles | `package-lock.json` and `pnpm-lock.yaml` both tracked |
| 3 | Fast deterministic verification | 🟡 | 3.7 focused run undocumented | `npx vitest run <path>` works, not mentioned in `AGENTS.md` |
| 4 | Test coverage as a safety net | 🟡 | 4.2 large untested areas | no test under `server/src/db/`; `src/game/useGame.ts`, `CountryCard.tsx`, `Leaderboard.tsx` only indirectly covered |
| 5 | Task definition surface | 🟡 | 5.6 no real-world usage yet | `gh issue list` / `gh pr list --state merged` both empty |
| 6 | CI & merge gates | 🟡 | 6.3 never actually run | `gh run list -b main` → 0 runs (commit not pushed) |
| 7 | Guardrails & safety | 🟡 | 7.3 no agent permission list | no `.claude/settings.json` |
| 8 | Parallel-session readiness | 🟡 | 8.7 conflict-surface line stale | `AGENTS.md:54` doesn't name `pnpm-lock.yaml` |

## Work Plan

Ordered: no blockers exist, so this is all leverage-ordered gaps (dimension 1 & 3 first, then 2, 6, 7, 8, 4, 5). Effort: S < 1 h · M ~ half a day · L > 1 day.

| # | Dim | Grade | Task | Effort | Evidence |
|---|---|---|---|---|---|
| 1 | 1 | 🟡 | Edit `AGENTS.md`'s worktree section to drop the "update the corresponding proxy target" line — both `server/src/index.ts` and `vite.config.ts` already read the same `PORT` env var, so setting it once already covers both | S | `AGENTS.md:53`, `vite.config.ts:6`, `server/src/index.ts:3` |
| 2 | 3 | 🟡 | Add a "Single test file" row to `AGENTS.md`'s Verify table: `` npx vitest run <path> `` | S | verified working: `npx vitest run server/src/game/logic.test.ts` → 7 passed |
| 3 | 2 | 🟡 | Delete `pnpm-lock.yaml` (or add it to `.gitignore` if pnpm is intentionally supported) — `package.json` scripts, `AGENTS.md`, and CI all assume npm; a second lockfile risks an agent installing with the wrong tool and silently drifting from what CI tests | S | `git ls-files \| grep lock` → both `package-lock.json` and `pnpm-lock.yaml` tracked |
| 4 | 6 | 🟡 | Push the local commit (`git push`) so CI actually runs once, and confirm the `verify` job goes green on GitHub | S | `gh run list -b main -L 5` → empty; `git log origin/main..HEAD` → 1 unpushed commit |
| 5 | 7 | 🟡 | Add `.claude/settings.json` with a narrow `permissions.allow`/`deny` list (allow lint/typecheck/test/build/git-commit/gh-pr-create; deny `db:reset`, force-push, deploy) | M | no `.claude/settings.json` in repo |
| 6 | 8 | 🟡 | Update `AGENTS.md`'s "Conflict surface" line to also name `pnpm-lock.yaml` — or better, do #3 first so there's only one lockfile to name | S | `AGENTS.md:54` |
| 7 | 4 | 🟡 | Add unit tests for `server/src/db/client.ts` config parsing and `src/game/useGame.ts`'s state transitions (start → guess → reveal/ended), plus a component test for `CountryCard.tsx`'s click/disabled/result-badge states | M | `find src server -name "*.test.ts*"` → only 3 test files, none under `server/src/db/` or targeting `useGame.ts`/`CountryCard.tsx`/`Leaderboard.tsx` directly |
| 8 | 4 | 🟡 | Add `@vitest/coverage-v8` and a coverage threshold in `vitest.config.ts` so 4.2 gaps show up automatically instead of by inspection | S | no coverage tool configured |
| 9 | 5 | 🟡 | Add a stated branch-naming convention to `AGENTS.md` (e.g. `<type>/<slug>`, from `main`) | S | `AGENTS.md:33` states only "Branch from `main`", no naming pattern |
| 10 | 5 | 🟡 | Decide and note a label policy (repo currently only has GitHub's default label set, no custom taxonomy or project board) | S | `gh label list` → only default labels; no board found |
| 11 | 5 | 🟡 | File at least one real issue and PR through the templates to establish that the AC/checklist convention is actually followed, not just present | S | `gh issue list` / `gh pr list --state merged` → both empty |

## Automation map

Statuses: Automated · Assisted · Manual · Human by design · Absent. Not grades — never in the Scorecard, never in the verdict.

| # | Stage | Status | Evidence | Loop candidate |
|---|---|---|---|---|
| 1 | Task intake & refinement | Assisted | `.github/ISSUE_TEMPLATE/feature_task.md` has an AC section, but `gh issue list` is empty — never exercised | — |
| 2 | Implementation | Manual | no `.claude/agents/`, no agent-triggering workflow in `.github/workflows/` | Issue → PR implementation loop |
| 3 | Local verification | Assisted | `npm run lint/typecheck/test/build` all exist and are fast; a `simple-git-hooks` pre-commit hook (`package.json` `"simple-git-hooks"`) auto-runs lint, but typecheck/test/build still require a human to invoke | — |
| 4 | Code review | Manual | no `CODEOWNERS`, no review bot, zero PRs to date | — |
| 5 | Merge | Manual | branch protection unreadable/absent (`gh api repos/gabi-bm/embeds-gb/branches/main/protection` → 404); no auto-merge config | — |
| 6 | Release / changelog | Absent | no `CHANGELOG.md`, no tags (`gh release list` empty) | — |
| 7 | Deploy | Absent | no `fly.toml`/`vercel.json`/`Procfile`/`render.yaml`/deploy workflow | — |
| 8 | Post-deploy verification | Absent | no deploy exists to verify | — |
| 9 | Dependency & security maintenance | Absent | no `dependabot.yml`/`renovate.json`; CI doesn't run `npm audit`; a manual `npm audit` this session found 4 moderate dev-only advisories in `drizzle-kit`'s transitive `esbuild` | — |
| 10 | Repo hygiene (flaky tests, doc drift, lint debt) | Manual | this audit found the two-lockfile drift and one stale `AGENTS.md` line; nothing in the repo checks for that automatically | Docs & `AGENTS.md` drift-sync loop |

## Recommended loops

_Advisory — not part of the Work Plan, not counted in the verdict._

| # | Loop | Risk | Why here (evidence) | Blocked by |
|---|---|---|---|---|
| L1 | Docs & `AGENTS.md` drift-sync | L1 Contained | 8.7 🟡 — `AGENTS.md:54`'s conflict-surface line already doesn't name `pnpm-lock.yaml` | #3 |
| L2 | Test-backfill | L1 Contained | 4.1 🟢 (a real Vitest setup) but 4.2 🟡 — `server/src/db/` has 6 files and 0 tests | #2, #3 |
| L3 | Issue → PR implementation loop | L1 Contained | 5.1 🟢 and 6.2 🟢 hold; this is the loop the project exists to rehearse next | #3, #7 |

**L1 · Docs & `AGENTS.md` drift-sync loop** — L1 Contained

- **Trigger:** `push` to `main` touching `package.json`, `server/**`, `.github/workflows/**`; plus a monthly cron.
- **Unit → done:** one doc file. Done when every backticked command in `AGENTS.md`/`README.md` resolves and the commands the loop ran exit 0.
- **Guardrails:** docs-only path allowlist; corrects the claim to match reality, never the reverse; never touches the "Never do this" policy list — that's a human's call.
- **Configure:** a CI step that extracts backticked commands from `AGENTS.md` and asserts each exists; the docs-only path allowlist; the monthly cron.
- **Maintain:** owner: repo owner · monthly review · kill switch: disable the workflow.

**L2 · Test-backfill loop** — L1 Contained

- **Trigger:** campaign kickoff naming `server/src/db/` as the target directory.
- **Unit → done:** one source file. Done when new tests pass, that file's coverage increases, and the diff touches test files only.
- **Guardrails:** production code is on the path denylist for this loop — a PR touching it gets closed, not merged; one module per PR; never skips or deletes an existing test to go green.
- **Configure:** a checked-in target list (start with `client.ts`, `migrate.ts`, `seed.ts`, `reset.ts`); add `@vitest/coverage-v8` (Work Plan #8) so the done signal is measurable; the denylist in `AGENTS.md`.
- **Maintain:** owner: repo owner · runs until the target list is empty, then retires.

**L3 · Issue → PR implementation loop** — L1 Contained

- **Trigger:** an `agent-ready` label added to an issue.
- **Unit → done:** one issue. Done when lint, typecheck, test, and build all exit 0 on the branch and a PR is open against `main` linking the issue.
- **Guardrails:** one issue per run; never merges; a path denylist on `server/src/db/migrations/**`, `.github/**`; a cap of 3 verification cycles then stop and comment.
- **Configure:** the `agent-ready` label; `.github/workflows/agent-implement.yml` on `issues: [labeled]`; narrow `.claude/settings.json` permissions (Work Plan #5); branch protection requiring the CI check plus one human approval.
- **Maintain:** owner: repo owner · monthly review of merged-vs-closed PRs · kill switch: drain the label or disable the workflow.

## Findings by dimension

### 1. Agent-facing context — 🟡

- 🟡 **1.4 Minor doc inaccuracy** — `AGENTS.md:53` tells a reader to "update the corresponding proxy target" when changing `PORT`, but `vite.config.ts:6` (`process.env.PORT ?? '4000'`) already reads the same env var, so no manual update is actually needed. Evidence: read both files side by side. Fix: delete that clause.
- 🟢 1.1, 1.2, 1.3, 1.5, 1.6, 1.7

### 2. Reproducible environment — 🟡

- 🟡 **2.2 Two committed lockfiles** — `package-lock.json` and `pnpm-lock.yaml` are both tracked (`git ls-files | grep lock`), but every documented workflow (`package.json` scripts, `AGENTS.md`, `.github/workflows/ci.yml`) assumes npm. Evidence: `pnpm-lock.yaml` exists and is newer than `package-lock.json` (`ls -la`), meaning someone or something ran `pnpm install` after the npm-based setup — an agent could do the same and silently diverge. Fix: delete `pnpm-lock.yaml`, or explicitly adopt pnpm everywhere and drop `package-lock.json`.
- 🟢 2.1, 2.3, 2.4, 2.5, 2.6, 2.7

### 3. Fast deterministic verification — 🟡

| Command | Source | Documented | Non-interactive | Exit code | Runtime |
|---|---|---|---|---|---|
| lint | `npm run lint` (`oxlint`) | ✅ `AGENTS.md` | ✅ | 0 | 0.16s |
| typecheck | `npm run typecheck` (`tsc -b`) | ✅ `AGENTS.md` | ✅ | 0 | 0.94s |
| test | `npm test` (`vitest run`) | ✅ `AGENTS.md` | ✅ | 0 | 0.79s (10 tests, 3 files) |
| build | `npm run build` (`tsc -b && vite build`) | ✅ `AGENTS.md` | ✅ | 0 | 1.25s |

- 🟡 **3.7 Focused run undocumented** — `npx vitest run server/src/game/logic.test.ts` works (verified: 7 passed) but isn't mentioned anywhere in `AGENTS.md`. Fix: add it to the Verify table.
- 🟢 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

### 4. Test coverage as a safety net — 🟡

- 🟡 **4.2 Untested areas** — `server/src/db/` (`client.ts`, `migrate.ts`, `seed.ts`, `reset.ts`, `schema.ts`) has zero test files; `src/game/useGame.ts`, `CountryCard.tsx`, and `Leaderboard.tsx` have no dedicated test, only indirect coverage through `src/App.test.tsx`'s single rendered scenario. Evidence: `find src server -name "*.test.ts*"` returns exactly 3 files (`logic.test.ts`, `runs.test.ts`, `App.test.tsx`). Fix: see Work Plan #7.
- 🟡 **4.5 No coverage tooling** (informational, never blocking) — no `@vitest/coverage-v8` or threshold configured. Fix: Work Plan #8.
- 🟢 4.1, 4.3, 4.4 — `logic.test.ts` and `runs.test.ts` assert real behavior (not snapshot/assertion-free), and `runs.test.ts` is a genuine API-level integration test against the real Postgres DB.

### 5. Task definition surface — 🟡

- 🟡 **5.4 No branch-naming convention** — `AGENTS.md:33` states "Branch from `main`" but no naming pattern. Fix: Work Plan #9.
- 🟡 **5.5 No label taxonomy or board** — `gh label list` shows only GitHub's default set; no project board found. Fix: Work Plan #10 (low priority for a solo project).
- 🟡 **5.6 Templates unexercised** — `gh issue list -L 10` and `gh pr list -L 10 --state merged` are both empty, so there's no real-world evidence the AC/checklist conventions are followed under actual use (not a fault of the templates themselves). Fix: Work Plan #11.
- 🟢 5.1, 5.2, 5.3 — issue template has an AC section, PR template has a checklist, and the one real commit (`feat: game`) follows the stated Conventional Commits format.

### 6. CI & merge gates — 🟡

- 🟡 **6.3 CI has never run** — `gh run list -b main -L 5` returns zero runs; the commit adding `ci.yml` hasn't been pushed yet (`git log origin/main..HEAD` shows 1 local-only commit). Fix: Work Plan #4.
- 🟢 6.1, 6.2, 6.5 — `.github/workflows/ci.yml` exists, runs the exact same `lint`/`typecheck`/`test`/`build` commands `AGENTS.md` documents, spins up its own `postgres:16` service container, and needs no `secrets.*`.

### 7. Guardrails & safety — 🟡

- 🟡 **7.3 No agent tool permission list** (informational) — no `.claude/settings.json`. Fix: Work Plan #5.
- 🟢 7.1, 7.2, 7.4, 7.5, 7.6 — no secrets in the repo (`git grep` for key-shaped strings is clean, `.env` gitignored and untracked), `db:reset` is documented as fenced and is itself scoped to only the database named in `DATABASE_URL`, a `simple-git-hooks` pre-commit hook runs lint, `node_modules`/`dist` are gitignored, and the migration policy ("edit `schema.ts`, regenerate, never hand-edit the SQL") is stated.

### 8. Parallel-session readiness — 🟡

- 🟡 **8.7 Conflict-surface line is stale** — `AGENTS.md:54` names `server/src/db/migrations/` and `package-lock.json` as the files most branches touch, but doesn't mention `pnpm-lock.yaml`, which is also tracked. Fix: Work Plan #6 (resolve after #3).
- 🟢 8.1, 8.2, 8.3, 8.4, 8.5, 8.6 — `.env.example` + `npm run setup` regenerate `.env` from scratch; no hardcoded absolute paths anywhere (`grep -rnE "/Users/|/home/"` on `scripts`, `server`, `.github`, configs is clean); `scripts/setup.mjs` derives the Postgres database name from the working directory's basename, so each worktree gets its own DB; `PORT` is an env var with a documented per-session convention matching the rubric's own accepted Rails/Node pattern; `npm install` benefits from npm's global package cache; `simple-git-hooks` writes to the shared `.git/hooks` (no `core.hooksPath` override), which is common across linked worktrees; the "Worktrees / parallel sessions" section in `AGENTS.md` documents the create/setup/port/conflict-surface workflow end to end.

## Unverifiable from code

- ⚪ **6.4 Branch protection** — `gh api repos/gabi-bm/embeds-gb/branches/main/protection` returned 404, which GitHub returns identically for "no protection configured" and "insufficient permission to read it" (the active `gh` account, `gbartesaghi`, may not have admin rights on `gabi-bm/embeds-gb`). Ask: is branch protection intentionally off, or does the audit need to run as an account with admin access to `gabi-bm/embeds-gb` to see the real answer?

---
_Generated by the `loop-engineering-audit` skill · dimensions disabled by config: none · loops: 3 recommended (advisory), 0 candidates filtered by cap/risk · commands executed: `npm run lint`, `npm run typecheck`, `npm test` (`CI=1`), `npm run build`, `npx vitest run server/src/game/logic.test.ts`, `npm audit` (read-only report, no install)_
