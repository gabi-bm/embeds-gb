---
name: develop
description: Pick up a GitHub issue in gabi-bm/embeds-gb and carry it end-to-end from ticket to merged PR — a plan phase, an isolated-worktree implementation phase with the repo's verify suite, an independent review phase, then a squash merge to main. Loops to the next unblocked issue afterward unless told otherwise. Use this whenever the user says things like "work on ticket #4", "let's do issue 7", "pick up the next ticket", "implement #12", or otherwise asks to start work on a specific numbered issue in this repo. Also use it when they ask what to work on next — it can check the open issues and their dependencies first.
---

# develop

This repo tracks work as GitHub issues (see the Project board "Multi-Category Higher/Lower", #2), sized so each one is a single PR. This skill is the repeatable path from "work on ticket #N" to a merged PR — so that path stays the same whether it's you running it or an unattended agent loop.

## Four phases: plan, implement, review, merge — then loop

Split every ticket into **Plan**, **Implement**, **Review**, and **Merge**, unless the ticket is genuinely tiny (a one-line config tweak, or adding one more entry to an already-established pattern — not "add a new category dataset," which still deserves a quick plan for where the file goes and how it gets registered). The point isn't ceremony: a wrong assumption caught before any code exists is cheap to fix, the same assumption caught after implementation means redoing work — and a bug caught before merge is cheap to fix, the same bug caught after means a revert on `main`.

- **Plan** (`model: opus`) — read-only investigation and reasoning. Resolve the ticket, check its dependencies are closed, read the relevant context, and produce a concrete plan: which files change and how, and anything the acceptance criteria left implicit that needs a decision (e.g. issue #5's leaderboard-scope question). No code changes here.
- **Implement** (`model: sonnet`) — given the ticket and the plan, do the actual work: worktree/DB setup, code, verify suite, commit, PR.
- **Review** (fresh agent, no memory of the Implement run) — independently checks the diff against the issue's acceptance criteria and `AGENTS.md` conventions before it touches `main`.
- **Merge** — once review is clean and CI is green, squash-merge and move on to the next ticket.

The stronger model is worth it for the phase where a bad call is expensive to undo (architecture, scope, the acceptance criteria's implicit decisions); the faster model is fine once the plan has already resolved the hard questions.

**If you're a coordinator dispatching this** (e.g. via the `Agent` tool): run each phase as a separate subagent call. Spawn Plan first, get its plan back, then spawn Implement with that plan included directly in its prompt, then spawn Review with the PR/diff and the issue's acceptance criteria in its prompt — each fresh subagent has no memory of the previous phase's run, so context has to travel as text, not as a file left in a throwaway worktree.

**If you're working through this solo**, with no separate dispatch available: still treat each phase as a distinct step, and switch your own model between phases if you're able to (e.g. `/model`), so the reasoning-heavy steps actually run on the stronger model. Review still has to happen as an independent pass — re-reading your own diff immediately after writing it catches far less than a fresh look (or a fresh subagent) does.

For a genuinely tiny ticket, skip straight to Implement (Review still applies — it's cheap and catches real mistakes). Say so explicitly rather than silently deciding, so the skip reads as a judgment call, not an oversight.

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
- Open the PR, then hand off to Review — don't merge from this phase.

## Review phase

A fresh agent (or, if working solo, a deliberately independent second pass — not a continuation of the same train of thought that just wrote the code) reviews the PR before it reaches `main`:

1. Read the issue's acceptance criteria and `gh pr diff <PR>` (or the worktree's diff against `main`).
2. Check: does the diff satisfy every acceptance-criteria line, does it stay inside the ticket's scope (no drive-by refactors, no scope creep into a dependent ticket), does it follow `AGENTS.md` conventions (thin routes, logic in `game/`, tests next to the file they cover, no hand-edited migrations), and are there correctness bugs, security issues, or missing test coverage a fast implementation pass could have missed.
3. Classify findings as **blocking** (acceptance criteria unmet, a real bug, a security issue, missing required test coverage) or **non-blocking** (style nits, optional follow-ups) — don't block a merge on taste.
4. Report findings back to the coordinator (or, solo, to yourself) rather than editing code directly — Review verifies, it doesn't implement.

**On blocking findings**: send them back to an Implement pass (same branch, same worktree) to fix, re-run the verify suite, then re-review. Repeat until clean, but cap it at 2 fix/re-review rounds — if it's still not clean after that, stop and flag it to the user rather than looping indefinitely. Same if a finding turns out to be unfixable within the ticket's own scope (e.g. it actually requires a dependency ticket's work): stop and flag it rather than merging around it or silently expanding scope.

**On a clean review** (no blocking findings): proceed to Merge.

## Merge phase

Once Review is clean and the PR's checks are green. Run all of this from the main repo directory, not from inside the ticket's worktree (the worktree is about to be removed, and `gh pr merge`'s branch deletion fails while the branch is checked out elsewhere):

```
cd <main repo directory>
gh pr checks <PR> --watch
gh pr merge <PR> --squash --delete-branch
```

This repo also runs non-required Vercel preview checks alongside `verify`; `gh pr checks --watch` waits on all of them together, which is fine (they're quick), but read the output for `verify` specifically — that's the one branch protection actually gates on. (`gh pr checks --required` looks appealing here but returns "no required checks reported" against this repo with a non-admin token, so don't rely on it.)

- Squash merge — one commit per ticket on `main`, matching the PR's Conventional Commit title.
- `--delete-branch` removes the remote branch (and the local one, once nothing has it checked out). If the ticket's worktree still exists, remove it too: `git worktree remove ../embeds-gb-issue-<N>` — this isn't an `AGENTS.md` rule, just hygiene so worktrees don't pile up.
- Merging auto-closes the issue via the PR body's `Closes #<N>`.
- If CI's `verify` check is red at this point, don't merge — fix it on the branch (back to Implement) and re-review before trying again.

## Loop

After a successful merge, go back to step 1 of the Plan phase and pick up the next unblocked ticket (lowest-numbered open issue whose dependencies are now closed) — merging the current one may have unblocked others. Keep going until one of:

- No open issues remain, or all remaining open issues have an open (unclosed) dependency.
- A review finding can't be resolved inside its ticket's scope. This is a hard stop for the whole loop, not just that ticket — leave its PR open, flag it to the user, and don't silently re-pick that same ticket next iteration (its dependencies being closed doesn't make it "unblocked" again; it's blocked on user input now).
- The user asked for a specific single ticket rather than "keep going" — in that case, stop after that ticket's merge and report back instead of picking up another.

## Edge cases worth pausing on

- **Uncommitted changes already in the worktree when you start**: don't overwrite them — check `git status` first, same as anywhere else.
- **The issue is already closed, or a PR already exists for it**: check `gh pr list --search "<N> in:body"` before redoing the work.
- **The ticket turns out to need more than its stated scope**: don't silently expand it — flag it. It may mean the original ticket breakdown missed something, worth fixing in the tracker, not just in code.
- **Local `main` behind `origin/main`** (e.g. after a previous loop iteration's merge, or someone else's merge): from the main repo directory, fast-forward it (`git merge --ff-only origin/main`) before branching the next worktree off it, so the new work starts from what's actually on `main`.
