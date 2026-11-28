# Dispatch: task 08 lane L56 (ph-cubic; owns BasePhBezierCurveGraph first)

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (all apply; replace lane ids). Recipe: `briefs/notes/08-curve-workspace.md` (point-controlled curves: control points are board-owned, shown as rows and legend; their row editors are the declared point rows). Closest finished work: L49 curve geometry (`git log --oneline --grep "lane L49"`), L44 splines.

## Lane (`inventory/08-partition.json`)

- Graph: `src/graphs/curves/ph/CubicPhBezierCurveGraph.tsx`.
- Owned base: `src/graphs/curves/ph/BasePhBezierCurveGraph.tsx` (first lane to own it). Later lanes L21 (uniform/weighted parameterization) and L45 (ph-quintic) inherit it: put shared declaration pieces in the base behind opt-in hooks; keep the subclasses' behaviour unchanged (run `src/graphs/curves/ph` and `src/graphs/curves/parametrisations` tests after a base edit). Shared file used: `HodographInputBox.tsx`.
- Lessons: `src/learning/content/guidedLessons.ts` (only the ph-cubic lesson entries).
- Own tests: `src/graphs/base/ControlsFollowGraph.test.tsx`, `src/graphs/base/GraphControlledControls.test.tsx`, `src/learning/content/guidedLessons.test.ts` (ph-cubic cases). Shared test: `src/graphs/curves/ph/PhOffsetControls.test.tsx`.
- Before declaring, grep `src/workspace` and `src/graphs/base` tests for ph-cubic as an "undeclared graph" fixture; if it is one, move the fixture to `ComplexMultiplicationGraph` or `rational-elevation` (L57, still undeclared), values unchanged.
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step); choices at most 4 options; setup in Orodja; mathematics untouched (PH condition, hodograph, offsets: run the existing tests).
- Parity report runs leave `src/graphs/**/__parity__/*.report.txt`: delete the ones you create, by name.
