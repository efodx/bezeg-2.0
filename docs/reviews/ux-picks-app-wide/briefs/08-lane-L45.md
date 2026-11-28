# Dispatch: task 08 lane L45 (rational, affine, ph-quintic; owns BaseRationalCurveGraph first)

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash. Order: ph-quintic (reuses L56's opt-in), then rational (owns the base), then affine; leave the tree green after each graph.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (all apply). Recipe: `briefs/notes/08-curve-workspace.md`. Closest finished work: L56 ph-cubic and L21 parameterization (`git log --oneline -E --grep "lane L(56|21)"`; notes `08-lane-L56.md`, `08-lane-L21.md`): `declaresPhWorkspace()` in `BasePhBezierCurveGraph.tsx` gives the offset puck d, arc-length row, offset legend and follow view. Gotcha from L56: the golden check reads the first `<id>.golden.json` anywhere under `src/graphs`, and some step-3 goldens sit under `src/graphs/bernstein/__parity__/` (e.g. `ph-quintic.golden.json`): report which file the check reads.

## Lane (`inventory/08-partition.json`)

- Graphs: `src/graphs/curves/ph/QuinticPhBezierCurveGraph.tsx`, `src/graphs/curves/rational/RationalBezierCurveGraph.tsx`, `src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx`.
- Owned base: `src/graphs/curves/rational/BaseRationalCurveGraph.tsx` (first lane to own it). Stream B's L48 (circle, decasteljau-alternative, farin) may use it later: shared declaration pieces behind opt-in hooks, other subclasses unchanged (run `src/graphs/curves/rational` tests after an edit). Shared, used: `BasePhBezierCurveGraph.tsx`, `HodographInputBox.tsx` (ph-cubic and the parameterizations must stay green: run `src/graphs/curves/ph` and `parametrisations` tests and the ph-cubic golden after a base edit).
- Weights of a rational curve belong with the control points (the point rows / row editor), not a puck per weight, unless a lesson step asks the learner to vary one weight (name the step).
- Lessons: `src/learning/content/expansionGuidedLessons.ts`.
- Own tests: `src/graphs/base/SelectedCurveTools.test.tsx`, `src/graphs/curves/bezier/AffineComparison.test.tsx`, `AffineTransformsBezierCurveGraph.test.ts`, `src/learning/content/expansionGuidedLessons.test.ts`. Shared: `src/learning/chapter/activities.test.ts`; `src/graphs/curves/ph/PhHodographFirst.test.tsx` (quintic case).
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`, `tests/guided-lessons.smoke.spec.cjs`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step); choices at most 4 options; setup in Orodja; mathematics untouched (rational evaluation, affine invariance, PH condition: run the existing tests).
- Parity report runs leave `src/graphs/**/__parity__/*.report.txt`: delete the ones you create, by name.
