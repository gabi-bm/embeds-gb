---
name: develop
description: Pick up a GitHub issue in gabi-bm/embeds-gb and carry it end-to-end from ticket to a PR ready to merge — isolated worktree, implementation, the repo's verify suite, a Conventional Commit, and gh pr create. Use this whenever the user says things like "work on ticket #4", "let's do issue 7", "pick up the next ticket", "implement #12", or otherwise asks to start work on a specific numbered issue in this repo. Also use it when they ask what to work on next — it can check the open issues and their dependencies first.
---

# develop

This repo tracks work as GitHub issues (see the Project board "Multi-Category Higher/Lower", #2), sized so each one is a single PR. This skill is the repeatable path from "work on ticket #N" to an open PR that's ready for CI and merge — so that path stays the same whether it's you running it or an unattended agent loop.

## 1. Resolve the ticket

Get the issue's full context before touching code — the acceptance criteria are the actual definition of done, not a suggestion:

```
gh issue view <N> --repo gabi-bm/embeds-gb
```

If the user said "pick up the next ticket" instead of naming a number, list open issues and use the lowest-numbered one whose dependencies are already closed (see below) — that's the earliest unblocked work.

Read the issue body for a "Depends on #X, #Y" line. For each one, check it's closed:

```
gh issue view <X> --repo gabi-bm/embeds-gb --json state --jq .state
```

If a dependency is still open, stop and tell the user — don't implement around a half-finished prerequisite. It's fine to ask whether they want you to do the dependency first instead.

## 2. Set up an isolated worktree

Per `AGENTS.md`, every task gets its own worktree so its DB, `.env`, and dev server port don't collide with other work in flight:

```
git worktree add ../embeds-gb-issue-<N> -b <type>/issue-<N>-<short-slug>
cd ../embeds-gb-issue-<N>
npm install && npm run setup
```

- Branch type prefix matches the issue's nature (`feat`, `fix`, `chore`) — most of these tickets are `feat`.
- `npm run setup` derives the DB name from the worktree directory, so `embeds-gb-issue-<N>` gets its own Postgres DB automatically — no manual naming needed.
- Only pick a `PORT` if you'll actually run the dev server (`PORT=<unused> npm run dev`); most tickets don't need it running to implement and verify.

## 3. Implement against the acceptance criteria

Work from the issue's checklist, not from guessing at scope — these tickets were deliberately cut to one PR each, and going beyond the checklist (or a dependency's ticket) reintroduces the scope-creep the ticket breakdown was meant to avoid. If the issue references `docs/multi-category-design.md`, read the relevant section for the architectural rationale before writing code — it explains *why* (e.g. `value` needs to be `numeric`/`bigint`, not `integer`), which matters more than the checklist wording alone.

Follow `AGENTS.md`'s conventions as you go: routes stay thin with logic in `game/`, schema changes go through `npm run db:generate` (never hand-edit `server/src/db/migrations/` — this repo's permission settings will block that edit anyway), tests sit next to the file they cover.

## 4. Verify

Every ticket's acceptance criteria assumes this passes before it's "done" — not "doesn't throw," an actual test asserting the new behavior:

```
npm run lint
npm run typecheck
npm test
npm run build
```

All four are fast and non-interactive. If you only touched one test file while iterating, `npx vitest run <path>` is fine as a quick loop, but run the full four before considering the ticket finished.

## 5. Commit and open the PR

```
git add <files>
git commit -m "<type>: <summary>"
gh pr create --title "<same summary>" --body "..."
```

- Conventional Commits, per `AGENTS.md`.
- The PR body should say what changed and why (one or two sentences is enough — the issue itself already has the acceptance criteria), and end with `Closes #<N>` so merging the PR auto-closes the issue.
- `main` requires the `verify` CI check to pass before merging (branch protection, `enforce_admins` on, no required reviewers) — so a red check blocks the merge button, not just a suggestion. If CI is red, fix it on the same branch rather than merging around it.

## Edge cases worth pausing on

- **Uncommitted changes already in the worktree when you start**: don't overwrite them — check `git status` first, same as anywhere else.
- **The issue is already closed, or a PR already exists for it**: check `gh pr list --search "<N> in:body"` before redoing the work.
- **The ticket turns out to need more than its stated scope**: don't silently expand it — flag it to the user. It may mean the original ticket breakdown missed something, which is worth fixing in the tracker, not just in code.
