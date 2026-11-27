# Dispatch: task 08 lane L28 (complex-reciprocal, complex-roots), round 10

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). Closest finished lane: commit `9956d9e64` (complex-euler, same family; its notes
`briefs/notes/08-lane-L26.md` list what went wrong there: frames highlighting rows absent when a step opens, off-grid typed
values now snapped by the puck — assert the snap, never drop the case).

## Lane (`inventory/08-partition.json`)

- Demonstrations `complex-reciprocal` (`src/graphs/complex/ComplexReciprocalGraph.tsx`) and `complex-roots`
  (`src/graphs/complex/ComplexRootsGraph.tsx`), in that order, one at a time; lessons `src/learning/content/complexMapsChapterLessons.ts`
  (only these two graphs' frames).
- Own tests: `src/graphs/complex/ComplexReciprocalGraph.test.ts`, `ComplexRootsGraph.test.ts`, `MapsFirstTask.test.tsx`
  (these two graphs' cases), `src/learning/content/complexMapsChapter.test.ts`. No shared tests listed; standing owner
  permission still applies to any shared test you hit (`runAs('learner', ...)` around untagged writes, values unchanged).
- Routes: the graphs' `runtime.ts` or the app route table (no leading slash for graph-check).
- Pucks only for what a lesson step of the graph asks the learner to set, flip or compare; name the step for each.
- Unused catalog keys your change leaves: delete them from `sl.ts`/`en.ts` in lockstep (grep first).

## Checks (per demonstration)

tsc; lint on changed files; declaration test (red once); `just graph-check <id> --route <route>`; golden check for the id
(report differences verbatim, never re-record); `just unit src/graphs/complex src/learning/content/complexMapsChapter.test.ts src/learning/content/declarationContract src/localization`;
then once for the lane `just build` and `just smoke-lesson <lesson id> --port 4391 --workers=1` for each affected lesson.
Foreground, one heavy command at a time.

## Return

At most 300 words. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L28.md` (as you go; on `HANDOFF` write
done/unverified/next and return partial).
