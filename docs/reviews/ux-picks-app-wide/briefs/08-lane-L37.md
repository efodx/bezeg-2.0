# Dispatch: task 08 lane L37 (recursion-cobweb), round 13

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). Closest finished lanes: `42d9317ca` (recursion-growth, same folder), `8006a3804` (complex-power: count
puck, legend card replacing a board band, lesson-test migration), and L30 lattice-paths (latest commit on the branch:
view box marks plus `followView`; check the view director frames the board as on master in every view, in the browser).
Lessons from earlier rounds: frames may highlight only rows present when the step opens; off-grid typed values are snapped
by the puck (assert the snap, never drop the case); retired catalog keys are deleted, not exempted; a multi-graph
`*FirstTask.test.tsx` case for a control that became a puck must move to the strip; board captions are anchored in user
coordinates inside the marks so cards never cover them.

## Lane (`inventory/08-partition.json`)

- Demonstration `recursion-cobweb` (`src/graphs/recursion/RecursionCobwebGraph.tsx`); lessons
  `src/learning/content/recursionCobwebGuidedLessons.ts`.
- Own tests: `src/graphs/recursion/RecursionCobwebGraph.test.tsx`, `src/learning/content/recursionCobwebGuidedLessons.test.ts`.
  Shared tests: `src/graphs/ExportPausesPlayback.test.tsx`, `src/graphs/recursion/CobwebLessonActions.host.test.tsx`,
  `src/graphs/recursion/recursionPresetCollection.test.tsx`. Standing owner permission for shared tests you hit:
  `runAs('learner', ...)` around untagged writes, values unchanged.
- Route: the graph's `runtime.ts` or the app route table (no leading slash for graph-check).
- Pucks only for what a lesson step asks the learner to set, flip or compare; name the step for each. Unused catalog keys:
  delete from `sl.ts`/`en.ts` in lockstep (grep first). Slovenian control wording: *krmilnik*.

## Checks

tsc; lint on changed files; declaration test (red once); `just graph-check recursion-cobweb --route <route>`; golden check
`BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t recursion-cobweb` (report the diff
summary, never re-record); `just unit src/graphs/recursion src/learning/content/recursion src/learning/content/declarationContract src/localization`;
`just unit FirstTask`; `just unit src/graphs/ExportPausesPlayback`;
`BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t recursion-cobweb`; browser shots of
each lesson step that changes the view at 1440x900 and 1280x720 (`just shot`, dev server `http://127.0.0.1:4483/bezeg-2.0/`;
look at them, captions not under cards, board framed as on master); then `just build` and
`just smoke-lesson <lesson id> --port 4391 --workers=1` per affected lesson. Foreground, one heavy command at a time.

## Return

At most 300 words with `file:line`. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L37.md` (as you go; on
`HANDOFF` write done/unverified/next and return partial). Shots to `.command-logs/l37-*.png`.
