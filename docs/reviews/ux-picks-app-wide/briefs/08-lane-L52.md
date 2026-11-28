# Dispatch: task 08 lane L52 (bspline-basis)

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, tough choices, common misses) and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (all apply; replace lane ids). Recipes: `briefs/notes/08-base-function.md` (basis functions over a parameter axis) and `08-curve-workspace.md` for the knot vector. Guide `docs/guides/converting-a-graph.md` by section. Closest finished work: the other B-spline graphs already converted (`git log --oneline --grep "bspline"`; fragments `bspline-*.ts`).

## Lane (`inventory/08-partition.json`)

- Graph: `src/graphs/curves/bspline/BSplineBasisGraph.tsx`; shared file used: `src/graphs/curves/bspline/KnotEditor.tsx` (used by other converted B-spline graphs: keep their behaviour; run their tests if you touch it).
- Lessons: `src/learning/content/bsplineBasisGuidedLessons.ts`.
- Own tests: `src/graphs/curves/bspline/BSplineBasisGraph.test.tsx`, `src/learning/content/bsplineBasisGuidedLessons.test.tsx`.
- Shared tests: `src/graphs/curves/BsplineFirstTask.test.tsx`, `src/graphs/curves/bspline/standaloneSceneLifecycle.test.tsx`.
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step); choices at most 4 options; setup in Orodja; mathematics untouched (basis values, partition of unity, support: run the existing tests).
