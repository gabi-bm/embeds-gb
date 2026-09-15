---
name: develop
description: Pick up a GitHub issue in gabi-bm/embeds-gb and carry it end-to-end from ticket to a PR ready to merge — a plan phase, then an isolated-worktree implementation phase with the repo's verify suite, a Conventional Commit, and gh pr create. Use this whenever the user says things like "work on ticket #4", "let's do issue 7", "pick up the next ticket", "implement #12", or otherwise asks to start work on a specific numbered issue in this repo. Also use it when they ask what to work on next — it can check the open issues and their dependencies first.
---

# develop

This repo tracks work as GitHub issues (see the Project board "Multi-Category Higher/Lower", #2), sized so each one is a single PR. This skill is the repeatable path from "work on ticket #N" to an open PR that's ready for CI and merge — so that path stays the same whether it's you running it or an unattended agent loop.

## Two phases: plan, then implement

Split every ticket into a **Plan** phase and an **Implement** phase, unless the ticket is genuinely tiny (a one-line config tweak, or adding one more entry to an already-established pattern — not "add a new category dataset," which still deserves a quick plan for where the file goes and how it gets registered). The point isn't ceremony: a wrong assumption caught before any code exists is cheap to fix, the same assumption caught after implementation means redoing work.

- **Plan** (`model: opus`) — read-only investigation and reasoning. Resolve the ticket, check its dependencies are closed, read the relevant context, and produce a concrete plan: which files change and how, and anything the acceptance criteria left implicit that needs a decision (e.g. issue #5's leaderboard-scope question). No code changes here.
- **Implement** (`model: sonnet`) — given the ticket and the plan, do the actual work: worktree/DB setup, code, verify suite, commit, PR.

The stronger model is worth it for the phase where a bad call is expensive to undo (architecture, scope, the acceptance criteria's implicit decisions); the faster model is fine once the plan has already resolved the hard questions.

**If you're a coordinator dispatching this** (e.g. via the `Agent` tool): run the two phases as separate subagent calls. Spawn the Plan subagent first, get its plan back, then spawn the Implement subagent with that plan included directly in its prompt — a fresh subagent has no memory of the Plan subagent's run, so the plan has to travel as text, not as a file left in a throwaway worktree.

**If you're working through this solo**, with no separate dispatch available: still treat Plan as a distinct step before writing any code, and switch your own model between phases if you're able to (e.g. `/model`), so the reasoning-heavy step actually runs on the stronger model.

For a genuinely tiny ticket, skip straight to Implement — say so explicitly rather than silently deciding, so the skip reads as a judgment call, not an oversight.

## Plan phase

1. Resolve the ticket:
   ```
   gh issue view <N> --repo gabi-bm/embeds-gb
   ```
   If asked to "pick up the next ticket" instead of a specific number, list open issues and use the lowest-numbered one whose dependencies are already closed — the earliest unblocked work.

2. Check dependencies. Read the issue body for a "Depends on #X, #Y" line, and for each one:
   ```
   gh issue view <X> --repo gabi-bm/embeds-gb --json state --jq .state
   ```
   If a dependency is still open, stop here and flag it — don't plan around a half-finished prerequisite. It's fine to ask whether to do the dependency first instead.

3. Read for context, not just the checklist: `docs/multi-category-design.md` for the architectural rationale (it explains *why*, e.g. `value` needs to be `numeric`/`bigint` not `integer` — that matters more than the checklist wording alone), and the existing code the ticket touches.

4. Write the plan: files/approach, and any implicit decisions the acceptance criteria left open. This is the output that gets handed to the Implement phase.

## Implement phase

Work from the plan and the issue's acceptance criteria, not from re-guessing scope — these tickets were deliberately cut to one PR each, and going beyond the checklist (or a dependency's ticket) reintroduces the scope-creep the ticket breakdown was meant to avoid.

**Isolated worktree**: if you're already running in one provided by your harness (e.g. dispatched via the `Agent` tool with `isolation: worktree`), don't create another — just run `npm install && npm run setup` in your current directory. Otherwise, per `AGENTS.md`:
```
git worktree add ../embeds-gb-issue-<N> -b <type>/issue-<N>-<short-slug>
cd ../embeds-gb-issue-<N>
npm install && npm run setup
```
`npm run setup` derives the DB name from the worktree directory, so each ticket gets its own Postgres DB automatically. Only pick a `PORT` if you'll actually run the dev server; most tickets don't need it.

Follow `AGENTS.md`'s conventions as you go: routes stay thin with logic in `game/`, schema changes go through `npm run db:generate` (never hand-edit `server/src/db/migrations/` — this repo's permission settings will block that edit anyway), tests sit next to the file they cover.

**Verify** — every ticket's acceptance criteria assumes this passes before it's "done," with an actual test asserting the new behavior, not "doesn't throw":
```
npm run lint
npm run typecheck
npm test
npm run build
```
All four are fast and non-interactive. `npx vitest run <path>` is fine as a quick loop while iterating, but run the full four before considering the ticket finished.

**Commit and open the PR**:
```
git add <files>
git commit -m "<type>: <summary>"
gh pr create --title "<same summary>" --body "..."
```
- Conventional Commits, per `AGENTS.md`.
- PR body: what changed and why (one or two sentences — the issue already has the acceptance criteria), ending with `Closes #<N>` so merging auto-closes the issue.
- `main` requires the `verify` CI check to pass before merging (branch protection, `enforce_admins` on, no required reviewers) — a red check blocks the merge button, not just a suggestion. Fix it on the same branch rather than merging around it.
- Open the PR and stop there — don't merge it yourself; merges happen manually.

## Edge cases worth pausing on

- **Uncommitted changes already in the worktree when you start**: don't overwrite them — check `git status` first, same as anywhere else.
- **The issue is already closed, or a PR already exists for it**: check `gh pr list --search "<N> in:body"` before redoing the work.
- **The ticket turns out to need more than its stated scope**: don't silently expand it — flag it. It may mean the original ticket breakdown missed something, worth fixing in the tracker, not just in code.
