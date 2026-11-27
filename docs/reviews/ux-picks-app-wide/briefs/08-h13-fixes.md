# Handler 13 fixes: undeclared-graph fixtures and fourier-coefficients parity

Role: `bezeg-worker` (Sonnet). Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`, branch `board-workspace-2`. Never commit, push, stash, or create a worktree. Another worker (lane L39, waves) is editing in the same tree: do not touch `src/localization/sl.ts`, `en.ts`, `fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx` or any waves file. Run one heavy command at a time, in the foreground.

## 1. Undeclared-graph fixtures (blocks the publish)

`FixedPointGraph` now has a `declaration()` (commit 8a47d502d), so two tests that used it as "an undeclared graph" fail:
- `src/workspace/presenter/BoardCards.test.tsx:403-410` "Orodja is the only card, starts open and holds the panels" (`expected true to be false` at :409).
- `src/workspace/presenter/LessonCard.test.tsx:136-139` "an undeclared graph keeps Orodja open beside the lesson card at any width" (route `/bezeg-2.0/analysis/fixed-point?learn=1`; times out at :139).

Swap the fixture to a graph that has no `declaration()` (neither its own nor an inherited one) and, for LessonCard, has a guided lesson with a `?learn=1` route. Prefer one that will stay undeclared longest: check `docs/reviews/ux-picks-app-wide/inventory/08-partition.json` and the lane table in `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`. Avoid stream B lanes (L54, L50, L49, L44, L47: mean-value, uniform-convergence and the other analysis graphs) and L39/L43. A candidate is `ComplexMultiplicationGraph` if it qualifies. Keep the assertions unchanged. Add a short comment naming why the fixture is undeclared, so the next conversion knows to move it. Also grep `src/` tests for other fixtures that rely on a graph being undeclared (search "undeclared" and `FixedPointGraph`, `SequenceGraph` in `src/workspace` and `src/graphs/base`) and fix the same way.

Check: `just unit src/workspace/presenter` passes (log `.command-logs/h13fix-presenter.log`).

## 2. fourier-coefficients parity

`BEZEG_PARITY_CHECK=1 just unit src/graphs/base/declare/parity.test.tsx -t fourier-coefficients` fails: `state 2 (constant term a0): extra row a0 declared "Koeficient a₀ 3,14159"`. Caption sweep batch 2 (`1b62cab55`, on master) changed fourier-coefficients rows. Decide from the code which side is right: either the declaration shows a row the old panel never showed (fix the declaration in `src/graphs/functions/FourierCoefficients*`), or the row legitimately replaced a removed caption (then the recording `src/graphs/functions/__parity__/fourier-coefficients.json` is stale: re-record only that id with `BEZEG_PARITY_RECORD=1 BEZEG_PARITY_ID=fourier-coefficients` and show the diff is that one row). Use `git show 1b62cab55 -- <files>` and the notes `docs/reviews/ux-picks-app-wide/briefs/notes/08-caption-sweep.md` batch 2. Then the same parity command passes.

## 3. extrema parity recording (report only)

`BEZEG_PARITY_CHECK=1 just unit src/graphs/base/declare/parity.test.tsx -t extrema` failed once on "records deterministically and every state changes a shown value". Run it three times; report pass/fail and the assertion text. Do not edit.

## Then

`npx tsc --noEmit --pretty false`; `npx eslint <changed files>`.

## Return

≤200 words with `file:line` per change, check results with log paths, the decision in 2 with its evidence.
