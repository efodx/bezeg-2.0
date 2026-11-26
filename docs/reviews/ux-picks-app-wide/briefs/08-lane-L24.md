# Dispatch: task 08 lane L24 (bspline-deboor), round 9

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, **common misses**). It is the authority for everything below that it covers. Worked example of
a finished lane in this family: commit `a47d30bbf` is unit-circle (a plain BaseGraph); for B-splines read the NURBS/B-spline
lanes already on the branch (`git log --oneline --grep "lane L0"` and the curve-workspace recipe).

## Lane

From `docs/reviews/ux-picks-app-wide/inventory/08-partition.json`:
- Demonstration `bspline-deboor`; graph `src/graphs/curves/bspline/DeBoorGraph.tsx`; lessons `src/learning/content/bsplineDeBoorGuidedLessons.ts`.
- Own tests: `src/graphs/curves/bspline/DeBoorGraph.test.tsx`, `src/learning/content/bsplineDeBoorGuidedLessons.test.tsx`.
- Shared tests: `src/graphs/base/presets/ConsumerPreparation.test.tsx`, `src/graphs/curves/BsplineFirstTask.test.tsx` (own case
  only), `src/graphs/curves/bspline/standaloneSceneLifecycle.test.tsx`. Shared files used, not owned:
  `BSplinePointList.tsx`, `KnotEditor.tsx`.
- Route: find it in the graph's `runtime.ts` (graph-check `--route` takes no leading slash).

## Misses seen in earlier lanes (check each before reporting)

- Record parity before touching the graph; mark unmarked readout sentences `data-readout`/`data-readout-note` first (text unchanged).
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover every object the learner watches (curve, control polygon, the de Boor construction and its point), not only the first.
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key, bare keys go to the fragment.
- JSXGraph drag handlers that write state need `runAs('learner', ...)` (L22's drag threw UntaggedWriteError).
- Lesson prose that names a moved control: reword with the control's label, no "drsnik"/"slider"; write correct Slovenian
  (avoid case errors like "pri Podani podatki"; quote every reworded sentence, old and new, sl and en, in your report).
  Update the pinning tests.
- Shared preset tests applying states with an untagged `setState` may be wrapped in `runAs('learner', ...)` (allowed here).
  `standaloneSceneLifecycle.test.tsx` calls `setT` untagged (NURBS lane L04 stopped on it): if binding the parameter `t`
  as a puck breaks that test in any way other than an untagged `setState`, leave `t` unbound (in Orodja) and report test:line.
- Red check breaks a value, `pressed` or visibility, not an id.
- Do not re-record goldens; report golden differences verbatim.

## Checks

The shared brief's step 4 and 8, plus `just unit src/graphs/curves src/learning/content src/localization src/graphs/base/declare src/graphs/base/presets/ConsumerPreparation.test.tsx`,
then `just build` and `just smoke-lesson bspline-deboor --port 4391 --workers=1` (if the lesson id differs, use the one the
smoke command lists). Foreground, long timeouts, one heavy command at a time.

## Return

At most 300 words per the shared brief's report section. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L24.md`
(write it as you go; on `HANDOFF` stop, write what is done, unverified and next, and return partial).
