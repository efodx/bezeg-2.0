# Dispatch: task 08 lane L27 (complex-power), round 11

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). Closest finished lane, same family and shared tests: commit `9956d9e64` (complex-euler) and its notes
`briefs/notes/08-lane-L26.md` (what went wrong there: frames highlighting rows absent when a step opens; off-grid typed
values now snapped by the puck — assert the snap, never drop the case; retired catalog keys deleted, not exempted).

## Lane (`inventory/08-partition.json`)

- Demonstration `complex-power`; graph `src/graphs/complex/ComplexPowerGraph.tsx`; lessons `src/learning/content/complexPowerGuidedLessons.ts`.
- Own tests: `src/graphs/complex/ComplexPowerGraph.test.tsx`, `ComplexPowerLessonActions.host.test.tsx`,
  `src/learning/content/complexPowerGuidedLessons.test.ts`.
- Shared tests: `src/graphs/ExportPausesPlayback.test.tsx`, `src/graphs/complex/batchD/batchDPresetFile.test.tsx`,
  `src/graphs/complex/legendBand.test.tsx` (if a legend card replaces this graph's band, remove only its cases there, as
  L26 did for Euler, and say so), and the all-graph `src/graphs/PresetRoundTrip.contract.test.tsx` (it moves complex-power
  to `{n: 3}` under `runAs('learner')`; must keep passing: `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t complex-power`).
  Standing owner permission: `runAs('learner', ...)` around untagged writes in shared tests, values unchanged; anything else
  stops that parameter (report test:line).
- Route: the graph's `runtime.ts` or the app route table (no leading slash for graph-check).
- Pucks only for what a lesson step asks the learner to set, flip or compare; name the step for each. Unused catalog keys
  your change leaves: delete from `sl.ts`/`en.ts` in lockstep (grep first).

## Checks

tsc; lint on changed files; declaration test (red once); `just graph-check complex-power --route <route>`; golden check
(report differences verbatim, never re-record); `just unit src/graphs/complex src/graphs/ExportPausesPlayback.test.tsx src/learning/content/complexPowerGuidedLessons.test.ts src/learning/content/declarationContract src/localization`;
the round-trip case above; `just build`; `just smoke-lesson complex-power --port 4391 --workers=1`. Foreground, one heavy
command at a time.

## Return

At most 300 words. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L27.md` (as you go; on `HANDOFF` write
done/unverified/next and return partial).
