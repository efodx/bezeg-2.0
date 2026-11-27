# Dispatch: task 08 lane L30 (counting-tree, lattice-paths), round 11

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). Closest finished lanes: `8006a3804` (complex-power: count puck, legend card replacing a board band,
lesson-test migration) and `23db56dc6` (complex-roots). Lessons from round 10: frames may highlight only rows present when
the step opens; off-grid typed values are snapped by the puck (assert the snap, never drop the case); retired catalog keys
are deleted, not exempted; a multi-graph `*FirstTask.test.tsx` case for a control that became a puck must move to the strip
(round 10 broke master CI by missing one).

## Lane (`inventory/08-partition.json`)

- Demonstrations `counting-tree` (`src/graphs/combinatorics/CountingTreeGraph.tsx`) then `lattice-paths`
  (`src/graphs/combinatorics/LatticePathGraph.tsx`), one at a time; lessons `src/learning/content/combinatoricsGuidedLessons.ts`,
  `combinatoricsRowGuidedLessons.ts` (these graphs' frames only).
- Own tests: `src/graphs/combinatorics/CombinatoricsFirstTask.test.tsx`, `CountingTreeGraph.test.tsx`,
  `CountingTreeLessonActions.host.test.tsx`, `LatticePathGraph.test.tsx`, `LatticePathLessonActions.host.test.tsx`,
  `combinatoricsPresetCollection.test.tsx`, `src/learning/content/combinatoricsGuidedLessons.test.ts`,
  `combinatoricsRowGuidedLessons.test.ts`. Standing owner permission for shared tests you hit: `runAs('learner', ...)`
  around untagged writes, values unchanged.
- Routes: the graphs' `runtime.ts` or the app route table (no leading slash for graph-check).
- Pucks only for what a lesson step asks the learner to set, flip or compare; name the step for each. Unused catalog keys:
  delete from `sl.ts`/`en.ts` in lockstep (grep first).

## Checks (per demonstration)

tsc; lint on changed files; declaration test (red once); `just graph-check <id> --route <route>`; golden check (report
verbatim, never re-record); `just unit src/graphs/combinatorics src/learning/content/combinatorics src/learning/content/declarationContract src/localization`;
`just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`; then
once for the lane `just build` and `just smoke-lesson <lesson id> --port 4391 --workers=1` per affected lesson. Foreground,
one heavy command at a time.

## Return

At most 300 words. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L30.md` (as you go; on `HANDOFF` write
done/unverified/next and return partial).
