# Dispatch: task 08 lane L21 (uniform-parameterization, weighted-parameterization)

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash. Uniform first; leave the tree consistent before starting weighted.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (all apply; replace lane ids). Recipe: `briefs/notes/08-curve-workspace.md`. Closest finished work: lane L56 ph-cubic (`git log --oneline --grep "lane L56"`, notes `briefs/notes/08-lane-L56.md`): it added the opt-in `declaresPhWorkspace()` to `BasePhBezierCurveGraph.tsx` (offset puck d, arc-length row, offset legend, follow view). Your graphs extend that base: opt in where it fits, keep ph-cubic and ph-quintic unchanged (run `src/graphs/curves/ph` tests and ph-cubic graph-check after any base edit).

## Lane (`inventory/08-partition.json`)

- Graphs: `src/graphs/curves/parametrisations/UniformParamBezierCurveGraph.tsx`, `AlphaParamBezierCurveGraph.tsx` (weighted).
- Shared files used: `src/graphs/curves/ph/BasePhBezierCurveGraph.tsx`, `HodographInputBox.tsx`.
- Lessons: `src/learning/content/parameterizationGuidedLessons.ts`.
- Own tests: `src/graphs/curves/parametrisations/AlphaParamBezierCurveGraph.test.ts`, `UniformParamBezierCurveGraph.test.ts`, `src/learning/content/parameterizationGuidedLessons.test.ts`.
- Shared test: `src/graphs/curves/ph/PhOffsetControls.test.tsx`, and `PhHodographFirst.test.tsx` (its uniform-parameterization case: d moves to the puck strip only if your graph opts in).
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step), e.g. the weight α if a step varies it; choices at most 4 options; setup in Orodja; mathematics untouched (parameterizations, arc length: run the existing tests).
- Parity report runs leave `src/graphs/**/__parity__/*.report.txt`: delete the ones you create, by name.
