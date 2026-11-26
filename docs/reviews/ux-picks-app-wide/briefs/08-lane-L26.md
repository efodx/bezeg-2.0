# Dispatch: task 08 lane L26 (complex-euler), round 10

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push. Another worker edits Taylor files
in the same tree: do not touch them.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). Template of a finished lane: `briefs/08-lane-L25.md` and commit `6f18bd710` (logistic-map: range pucks,
playback actions, lesson rewording, notes-only golden); `a47d30bbf` (unit-circle) for switch pucks.

## Lane (`inventory/08-partition.json`)

- Demonstration `complex-euler`; graph `src/graphs/complex/EulerCircleGraph.tsx`; lessons `src/learning/content/complexEulerGuidedLessons.ts`.
- Own tests: `src/graphs/complex/EulerCircleGraph.test.tsx`, `EulerCircleLessonActions.host.test.tsx`,
  `src/learning/content/complexEulerGuidedLessons.test.ts`.
- Shared tests: `src/graphs/ExportPausesPlayback.test.tsx`, `src/graphs/complex/batchD/batchDPresetFile.test.tsx`,
  `src/graphs/complex/legendBand.test.tsx`. Standing owner permission: wrap untagged writes in shared tests in
  `runAs('learner', ...)` with asserted values unchanged; any other shared-test change stops that parameter (report test:line).
  `legendBand.test.tsx` pins a board legend band: if a declared legend card replaces it for this graph, change only this
  graph's case there and say so.
- Route: in the graph's `runtime.ts` or the app route table (no leading slash for graph-check).

## Reminders

Parity before touching the graph (mark unmarked readout sentences first); declared legend replaces any own legend panel or
board band; marks cover everything watched; JSXGraph drag handlers and test writes outside the DOM in `runAs('learner')`;
animated parameters read live through `puckLiveValue`; lesson prose naming a moved control uses its label (Slovenian term for
pucks: *krmilnik*; quote old/new sl+en); red check breaks a value; never re-record goldens.

## Checks

tsc; lint on changed files; declaration test (red once); `just graph-check complex-euler --route <route>`; golden check for
the id; `just unit src/graphs/complex src/graphs/ExportPausesPlayback.test.tsx src/learning/content/complexEulerGuidedLessons.test.ts src/learning/content/declarationContract src/localization`;
`just build`; `just smoke-lesson complex-euler --port 4391 --workers=1` (or the lesson id it lists). Foreground, one heavy
command at a time.

## Return

At most 300 words. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L26.md` (as you go; on `HANDOFF` write
done/unverified/next and return partial).
