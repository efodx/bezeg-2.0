# Dispatch: task 08 lane L34 (polynomial-zeros, rational-function)

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash. One graph per session if the budget runs short: polynomial-zeros first, leave the tree consistent.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, tough choices, common misses) and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (all apply; replace lane ids). Recipe: `briefs/notes/08-base-function.md`. Guide `docs/guides/converting-a-graph.md` by section. Closest finished work: L46 school functions (`git log --oneline --grep "lane L46"`), L42 conic-focal/geometric-series `57b6d3224`, `85c4efe8a` (same lesson family `schoolFunctionGraphsBatch*`).

## Lane (`inventory/08-partition.json`)

- Graphs: `src/graphs/functions/PolynomialZerosGraph.tsx`, `RationalFunctionGraph.tsx`; shared file used: `src/graphs/functions/ZeroListEditor.tsx` (a list of zeros: per the controls catalogue a point/value list stays a row editor, not pucks).
- Lessons: `src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.ts`.
- Own tests: `src/graphs/functions/PolynomialZerosGraph.host.test.tsx`, `RationalFunctionGraph.host.test.tsx`, `src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.test.ts`.
- Shared test: `src/graphs/functions/FunctionsFirstTask.test.tsx` (your graphs' cases only).
- `src/graphs/functions/BaseFunctionGraph.authority.test.tsx` uses an undeclared `ObservedBinomialGraph` fixture on purpose; leave it.
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step); choices at most 4 options; setup in Orodja; mathematics untouched (zeros, multiplicities, asymptotes, sign: run the existing tests).
- Parity report runs leave `src/graphs/**/__parity__/*.report.txt`: delete the ones you create, by name.
