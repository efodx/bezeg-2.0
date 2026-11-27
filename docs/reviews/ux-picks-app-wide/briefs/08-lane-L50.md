# Dispatch: task 08 lane L50 (analysis, 8 demonstrations), stream B

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`
(branch `lane-b`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, **common misses**). It is the authority for everything below that it covers. Recipe:
`docs/reviews/ux-picks-app-wide/briefs/notes/08-base-function.md` "Recipe" (worked examples `ExponentialFunctionGraph.tsx`,
function-inverse). Finished `BaseFunctionGraph` lanes on this branch: `git show --stat 7995cde3e` (quadrature, L18) and
`8f17c48a6` (interp-least-squares, L07); their notes are in `briefs/notes/08-lane-L18.md` / `08-lane-L07.md` if present.

## Lane

From `docs/reviews/ux-picks-app-wide/inventory/08-partition.json` lane `L50`. Lessons: `src/learning/content/analysisGuidedLessons.ts`
(only the frames of your demonstrations). Shared test: `src/learning/content/analysisGuidedLessons.test.ts`. Graphs in
`src/graphs/functions/`: Accumulation, Convexity, Darboux, Extrema, MeanValue, UniformConvergence (`BaseFunctionGraph`);
FixedPoint, Sequence (`IterativeFunctionGraph`). Two demonstrations per worker:

1. accumulation, convexity
2. darboux, extrema
3. fixed-point, sequence
4. mean-value, uniform-convergence

**Not owned**: `BaseFunctionGraph.tsx` and the shared function panels. `IterativeFunctionGraph.tsx` is shared with lanes L42
and L47 (stream A owns L42): a change there is limited to an opt-in hook that defaults to today's behaviour and keeps the
other subclasses undeclared and their tests green (as `HullTraceGraph.declaresHullWorkspace()` in `fa98874c4`); anything
more stops that demonstration and is reported with the exact change you want.

## Misses seen in earlier lanes (check each before reporting)

- Record parity before touching the graph; mark unmarked readout sentences `data-readout`/`data-readout-note` first (text unchanged).
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover every object the learner watches (both curves of a pair, tangents, secants, chords, sums, the iteration path),
  not only the first `plotted` function.
- Board-drawn captions (JSXGraph texts) are not marks: marks (and `followView`) cover every caption the learner reads.
  **Owner, 2026-11-27:** remove board caption lines (the `this.caption(...)` corner text and similar) that only repeat a
  legend entry or readout row, as Taylor (`e0bfe3576`); quote each removed line and the card entry that shows it in the
  notes; caption-only golden differences are reported, the handler re-records. Any remaining board text a lesson step tells the learner to read must be clear of cards: user-coordinate anchors go into
  `marks.must` for those steps; pixel-anchored text is re-anchored in user coordinates inside the followed frame (L37
  recursion-cobweb, `89e4245ee`, `captionFrame`/`cobwebFocus`). Browser-check that step at 1440 and 1280.
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key, bare keys go to the fragment.
- The multi-graph `*FirstTask.test.tsx` files: a control that becomes a puck updates its own case there (puck on `[data-puck-strip]`).
- JSXGraph drag handlers that write state need `runAs('learner', ...)`; tests writing a bound key outside the DOM wrap in it too.
  Since `cb59a901f` every declared graph binds `view`: test view writes go in `runAs('learner', ...)`, and a test of the graph's
  own Fit unsets the director first (`graph.setViewDirector(undefined)`, see `FortuneGraph.host.test.tsx`).
- Playback: a puck bound to a parameter that animates reads the live value through `puckLiveValue` (L23, `13468437e`);
  `src/graphs/ExportPausesPlayback.test.tsx` must keep passing unchanged.
- Lesson prose that names a moved control: reword with the control's label, no "drsnik"/"slider"; readouts are the Odčitki
  card, not "pod grafom". Correct Slovenian (pucks are *krmilniki*); quote every reworded sentence, old and new, sl and en.
- Shared preset tests applying states with an untagged `setState` may be wrapped in `runAs('learner', ...)` with asserted values
  unchanged (allowed). Any other change to a shared test: stop that parameter (leave it unbound) and report test:line.
- Red check breaks a value, `pressed` or visibility, not an id. Do not re-record goldens; report differences verbatim.

## Checks

The shared brief's step 4 and 8, plus `just unit src/graphs/functions src/graphs/ExportPausesPlayback.test.tsx src/learning/content src/localization src/graphs/base/declare`,
`just unit FirstTask`, and per demonstration `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`;
then once per session `just build` and `just smoke-lesson <each converted demonstration's lesson id> --port 4395 --workers=1`,
and the browser caption check: capture the lesson (`<route>?learn=1`, route from `runtime.ts`) after 2, 5 and 8 Next clicks at
1440x900 and 1280x720 on the running dev server `http://127.0.0.1:4484/bezeg-2.0/` (Playwright; see
`.command-logs/l54-cap.cjs`), read the images and state whether anything the learner reads is under a card. Do not start or stop
servers. Foreground, each command under 10 minutes, never a backgrounded script; long output to `.command-logs/l50-*.log`.

## Return

At most 300 words per the shared brief's report section. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L50.md`
(one section per session; write it as you go; on `HANDOFF` stop, write what is done, unverified and next, and return partial).
