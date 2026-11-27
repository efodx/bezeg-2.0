# Dispatch: task 08 lane L29 (contour-map), round 10

You are a `bezeg-worker` (Opus: owner decision for lanes without a recipe). Worktree:
`C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`); stay in it, never
create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). No base recipe fits this graph (a 3D surface with a camera plus a contour map). Closest finished
examples: `4b5fcd5fa` (linear-program legend as a card, same `levelsets` family, shares panels), `9956d9e64` (complex-euler).
Triage decisions in `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`: vector parameters and 3D cameras stay in Orodja.

## Lane (`inventory/08-partition.json`)

- Demonstration `contour-map`; graph `src/graphs/levelsets/ContourMapGraph.tsx`; lessons
  `src/learning/content/levelSetsContourGuidedLessons.ts`, `levelSetsOptimizationGuidedLessons.ts` (contour-map frames only).
- Own tests: `src/graphs/levelsets/ContourLessonActions.host.test.tsx`, `ContourMapGraph.test.tsx`,
  `ContourMapPresetRoundTrip.test.tsx`, `src/learning/content/levelSetsContourGuidedLessons.test.ts`,
  `levelSetsOptimizationGuidedLessons.test.ts`. Shared test: `src/graphs/levelsets/levelSetsPresetFile.test.tsx`.
- Shared files used: `ContourPanels.tsx`; owned base `src/graphs/patches/SurfaceCameraPanel.tsx` (you may change it; other
  surface graphs use it, so run `src/graphs/patches` tests too and keep their behaviour).
- Standing owner permission: `runAs('learner', ...)` around untagged writes in shared tests, values unchanged.
- Pucks only for what a lesson step asks the learner to set, flip or compare; name the step for each. Unused catalog keys:
  delete from `sl.ts`/`en.ts` in lockstep.

## Checks

tsc; lint on changed files; declaration test (red once); `just graph-check contour-map --route <route>`; golden check
(report differences verbatim, never re-record); `just unit src/graphs/levelsets src/graphs/patches src/learning/content/levelSets src/learning/content/declarationContract src/localization`;
`just build`; `just smoke-lesson <each affected lesson id> --port 4391 --workers=1`. Foreground, one heavy command at a time.

## Return

At most 300 words. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L29.md` (as you go; on `HANDOFF` write
done/unverified/next and return partial).
