# Dispatch: task 08 lane L22 (unit-circle), round 9

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, **common misses**). It is the authority for everything below that it covers.

## Lane

From `docs/reviews/ux-picks-app-wide/inventory/08-partition.json`:
- Demonstration `unit-circle`; graph `src/graphs/trig/UnitCircleGraph.tsx`; lessons `src/learning/content/trigUnitCircleGuidedLessons.ts`.
- Own tests: `src/graphs/trig/UnitCircleGraph.test.tsx`, `src/graphs/trig/UnitCircleLessonActions.host.test.tsx`,
  `src/learning/content/trigUnitCircleGuidedLessons.test.ts`. Shared test: `src/graphs/trig/trigPresetCollection.test.tsx`.
- Route: find it in the graph's `runtime.ts` (graph-check `--route` takes no leading slash).

## Misses seen in earlier lanes (check each before reporting)

- Record parity before touching the graph; mark unmarked readout sentences `data-readout`/`data-readout-note` first (text unchanged).
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover every object the learner watches (angle point, sine/cosine segments, the arc), not only the first.
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key, bare keys go to the fragment.
- Lesson prose that names a moved control: reword with the control's label, no "drsnik"/"slider"; write correct Slovenian
  (earlier lanes wrote "pri Podani podatki", "krmilnik Lega točke": avoid such case errors; quote every reworded sentence
  in your report so the handler can check it). Update the pinning tests.
- `trigPresetCollection.test.tsx` applying states with an untagged `setState` may be wrapped in `runAs('learner', ...)` (allowed
  here). Any other change to a shared test: stop that parameter (leave it unbound) and report test:line.
- Red check breaks a value, `pressed` or visibility, not an id.
- Do not re-record goldens; report golden differences verbatim.

## Checks

The shared brief's step 4 and 8, plus `just unit src/graphs/trig src/learning/content src/localization src/graphs/base/declare`,
then `just build` and `just smoke-lesson unit-circle --port 4391 --workers=1` (if the lesson id differs, use the one the smoke
command lists). Foreground, long timeouts, one heavy command at a time.

## Return

At most 300 words per the shared brief's report section. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L22.md`
(write it as you go; on `HANDOFF` stop, write what is done, unverified and next, and return partial).
