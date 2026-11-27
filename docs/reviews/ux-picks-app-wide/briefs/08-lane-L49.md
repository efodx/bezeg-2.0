# Dispatch: task 08 lane L49 (curve geometry, 6 demonstrations), stream B

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`
(branch `lane-b`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, **common misses**). It is the authority for everything below that it covers. Recipes:
`docs/reviews/ux-picks-app-wide/briefs/notes/08-curve-workspace.md` "Recipe" (curve subclasses, `declaresCurveWorkspace()`,
`curveViewMarks()`) and `notes/08-bezier-parity.md` (parity for curve graphs without readouts); for readout rows, legends and
caption removal, the L50 function examples (`b9d478a81` extrema, `e67860b95` sequence, `17b84ef59` mean-value) and their
notes in `briefs/notes/08-lane-L50.md`.

## Lane

From `docs/reviews/ux-picks-app-wide/inventory/08-partition.json` lane `L49`. Lessons: `src/learning/content/curveGeometryGuidedLessons.ts`
(only the frames of your demonstration). Graphs: `CurveCombGraph` (curve-comb), `CurvatureBezierCurveGraph` (curve-curvature),
`CurveEnvelopeGraph` (curve-envelope), `CurveEvoluteGraph` (curve-evolute), `CurveOffsetGraph` (curve-offset),
`ParametricCurveGraph` (curve-parametric). **One demonstration per worker** (one fills the 175k budget).

Shared tests this lane edits (stream A holds L31/L32/L33 until L49 is picked): `src/graphs/curves/CurveGeometryFirstTask.test.tsx`,
`src/graphs/base/PlaybackRoutes.test.tsx`, `src/graphs/ExportPausesPlayback.test.tsx` (must keep passing unchanged).
Shared source: `CurvatureBezierCurveGraph.tsx` (base of evolute) and `offset/SpeedFactorPlot.tsx`; a change there keeps the
other users' tests green and is reported. **Not owned**: `BaseCurveGraph.tsx`, `AbstractJXGPointControlledCurve`, shared
curve panels; an opt-in hook defaulting to today's behaviour is allowed, anything more stops and is reported.

## Misses seen in earlier lanes (check each before reporting)

- Before declaring a graph, grep `src/workspace`, `src/graphs/base` and other shared tests for it used as an "undeclared
  graph" fixture (fixed-point broke `BoardCards.test.tsx` / `LessonCard.test.tsx`); report a hit, do not edit that test.
- Record parity before touching the graph (or record "parity n/a" per `08-bezier-parity.md` when nothing is shown).
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover every object the learner watches (curve, comb, osculating circle, evolute, envelope family, offset curve,
  speed plot), not only the first curve.
- Board captions (JSXGraph texts) are not marks. **Owner, 2026-11-27:** remove board caption lines that only repeat a legend
  entry or readout row (quote each removed line and the card entry that shows it in the notes; remove unused keys from
  `sl.ts`/`en.ts` in lockstep, new keys in a fragment). Remaining board text a lesson step tells the learner to read stays
  clear of cards: `marks.must`, or label placement measured against `this.boardView.intent().box` (extrema, notes 4c), or a
  declared `followView` box around what the learner watches (sequence, notes 6c).
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key, bare keys go to the fragment.
- `CurveGeometryFirstTask.test.tsx`: a control that becomes a puck updates its own case; a "pucks" test queries
  `#board-card-tools` after opening Orodja (the darboux case queried `#inspector-edit` and could not fail).
- JSXGraph drag handlers that write state need `runAs('learner', ...)`; tests writing a bound key outside the DOM wrap in it too.
  Every declared graph binds `view`: view writes in tests go in `runAs('learner', ...)`; restore views through `BoardView`, never raw `setBoundingBox`.
- `scripts/demonstration-preview-recipes.cjs` drives controls by Slovenian label (`button`, `toggle`, `field`): a row for
  your id that names a control which became a puck is only listed in the notes (stream A repoints all stale rows at
  once before the next clip capture; do not edit the script).
- Grep `tests/*.spec.cjs` for the id and the route and run each match (`tests/curve-ownership.smoke.spec.cjs` refits).
- `src/graphs/base/sharedControls.graphs.test.tsx`: a slider that becomes a puck moves its rows in the same lane.
- Playback: a puck bound to an animated parameter reads `puckLiveValue`; `PlaybackRoutes.test.tsx` and `ExportPausesPlayback.test.tsx` stay green.
- Lesson prose naming a moved control: "vklopi krmilnik X" / "turn on the X control", "s krmilnikom X"; readouts are
  "v kartici Odčitki" / "the Readouts card"; no "drsnik"/"slider"/"gumb". Quote every reworded sentence, old and new, sl and en.
- Red check per new assertion (value, `pressed` or visibility). Do not re-record goldens; report differences verbatim.

## Checks

The shared brief's step 4 and 8, plus `just unit src/graphs/curves src/graphs/ExportPausesPlayback.test.tsx src/graphs/base/PlaybackRoutes.test.tsx src/learning/content src/localization src/graphs/base/declare src/workspace`,
`just unit FirstTask`, `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`,
`npx tsc --noEmit --pretty false`, `just lint`, `just build`, `just smoke-lesson <lesson id> --port 4395 --workers=1`, and the
browser caption check: the lesson (`<route>?learn=1`) after Next clicks 2, 5, a middle one and the last, at 1440x900 and
1280x720 on the running dev server `http://127.0.0.1:4484/bezeg-2.0/` (adapt `.command-logs/l50-meanvalue-cap.cjs`); verdict
per image: watched object under a card, label on label, clipped at an edge. Do not start or stop servers. Foreground,
each command under 10 minutes; long output to `.command-logs/l49-<id>-*.log`.

## Return

At most 300 words per the shared brief's report section. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L49.md`
(one section per demonstration; write as you go; on `HANDOFF` stop, write done, unverified and next, and return partial).
