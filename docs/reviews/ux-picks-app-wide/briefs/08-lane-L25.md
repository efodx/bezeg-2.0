# Dispatch: task 08 lane L25 (logistic-map), round 9

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, **common misses**). It is the authority for everything below that it covers. Finished lanes of
plain `BaseGraph` shape on this branch: `git show --stat a47d30bbf` (unit-circle) and `5b6fd2f20` (bspline-deboor).

## Lane

From `docs/reviews/ux-picks-app-wide/inventory/08-partition.json`:
- Demonstration `logistic-map`; graph `src/graphs/dynamics/LogisticMapGraph.tsx`; lessons
  `src/learning/content/phasePortraitsGuidedLessons.ts` (only the logistic-map frames).
- Own tests: `src/graphs/dynamics/LogisticMapGraph.perf.test.tsx`, `LogisticMapGraph.test.tsx`,
  `LogisticMapLessonActions.host.test.tsx`, `PhasePortraitLessonActions.host.test.tsx`, `dynamicsPresetCollection.test.tsx`
  (all in `src/graphs/dynamics/`), `src/learning/content/phasePortraitsGuidedLessons.test.ts`.
- Shared test: `src/graphs/ExportPausesPlayback.test.tsx`.
- Route: find it in the graph's `runtime.ts` (graph-check `--route` takes no leading slash).

## Misses seen in earlier lanes (check each before reporting)

- Record parity before touching the graph; mark unmarked readout sentences `data-readout`/`data-readout-note` first (text unchanged).
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover every object the learner watches (cobweb, the curve and diagonal, the orbit/bifurcation plot), not only the first.
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key, bare keys go to the fragment.
- JSXGraph drag handlers that write state need `runAs('learner', ...)`; tests writing a bound key outside the DOM wrap in it too.
- Playback: a puck bound to a parameter that animates reads the live value through `puckLiveValue` (see L23
  arc-length-param, `13468437e`); `ExportPausesPlayback.test.tsx` must keep passing unchanged (stop and report if not).
- Lesson prose that names a moved control: reword with the control's label, no "drsnik"/"slider"; write correct Slovenian
  (avoid case errors like "pri Podani podatki"; quote every reworded sentence, old and new, sl and en, in your report).
  Update the pinning tests. Phase-portrait frames in the same lesson file belong to another lane: do not touch them.
- Shared preset tests applying states with an untagged `setState` may be wrapped in `runAs('learner', ...)` (allowed here).
  Any other change to a shared test: stop that parameter (leave it unbound) and report test:line.
- Red check breaks a value, `pressed` or visibility, not an id.
- Do not re-record goldens; report golden differences verbatim.

## Checks

The shared brief's step 4 and 8, plus `just unit src/graphs/dynamics src/graphs/ExportPausesPlayback.test.tsx src/learning/content src/localization src/graphs/base/declare`,
then `just build` and `just smoke-lesson <the logistic-map lesson id> --port 4391 --workers=1`. Foreground, long timeouts,
one heavy command at a time.

## Return

At most 300 words per the shared brief's report section. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L25.md`
(write it as you go; on `HANDOFF` stop, write what is done, unverified and next, and return partial).
