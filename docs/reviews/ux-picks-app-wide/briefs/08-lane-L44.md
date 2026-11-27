# Dispatch: task 08 lane L44 (splines, 6 demonstrations), stream B

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`
(branch `lane-b`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, **common misses**). It is the authority for everything below that it covers. Recipes:
`docs/reviews/ux-picks-app-wide/briefs/notes/08-curve-workspace.md` "Recipe" (curve subclasses, `declaresCurveWorkspace()`,
`curveViewMarks()`) and `notes/08-bezier-parity.md` (parity for curve graphs without readouts). The closest finished
examples are lane L49 on this branch (`git log --oneline --grep "lane L49"`; notes `briefs/notes/08-lane-L49.md`), e.g.
curve-comb `44ca2f919` (comb over a spline), curve-offset `34039cc2c`, curve-curvature `524e4ab08` (declared `followView`).

## Lane

From `docs/reviews/ux-picks-app-wide/inventory/08-partition.json` lane `L44`. Lessons: `src/learning/content/splineGuidedLessons.ts`
(only the frames of your demonstration). Graphs: `C1SplineGraph` (spline-c1), `C2SplineGraph` (spline-c2), `CnSplineGraph`
(spline-cn), `G1SplineGraph` (spline-g1), `G1SymmetricSplineGraph` (spline-g1-symmetric) under `src/graphs/curves/spline/`,
and `SplineAlphaParametrizationGraph` (spline-parameterization) under `src/graphs/curves/parametrisations/`. **One
demonstration per worker.**

Shared: `src/graphs/curves/spline/BaseSplineCurveGraph.tsx` is the base of the five spline graphs (owned by this lane, but a
change there must keep every spline demonstration and `BaseSplineCurveGraph.test.ts` / `splineDefaultPresets.test.ts`
green; prefer an opt-in hook while the other spline graphs are unconverted). Shared test: `src/graphs/base/GraphSceneReload.test.tsx`
(a change there only to follow a moved control; anything else stops and is reported). **Not owned**: `BaseCurveGraph.tsx`,
`AbstractJXGPointControlledCurve`, shared curve panels; an opt-in hook defaulting to today's behaviour is allowed.

## Misses seen in earlier lanes (check each before reporting)

- Before declaring a graph, grep `src/workspace`, `src/graphs/base` and other shared tests for it used as an "undeclared
  graph" fixture; report a hit, do not edit that test.
- Record parity before touching the graph. `parity.test.tsx` counts declared rows and notes as shown; a caption that moves
  into a declared row or note gets an `<id>Accepted` entry with a reason.
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover every object the learner watches (all spline pieces, joins, control polygons, tangent handles), not only
  the first curve. If the lesson view would squeeze the curve small in the card-free area, declare a `followView` box
  around what the learner watches (as `CurvatureBezierCurveGraph.watchedBox`), with a test that fails first.
- Board captions (JSXGraph texts) are not marks. **Owner, 2026-11-27:** remove board caption lines that only repeat a legend
  entry or readout row (quote each removed line and the card entry that shows it in the notes; remove unused keys from
  `sl.ts`/`en.ts` in lockstep, new keys in a fragment). Remaining board text a lesson step tells the learner to read stays
  clear of cards.
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key, bare keys go to the fragment.
- A spline-family `*FirstTask.test.tsx` (find it), if any: a control that becomes a puck updates its own case; a "pucks" test
  queries `#board-card-tools` after opening Orodja, and is shown red.
- JSXGraph drag handlers that write state need `runAs('learner', ...)`; tests writing a bound key outside the DOM wrap in it too.
  Every declared graph binds `view`: view writes in tests go in `runAs('learner', ...)`; restore views through `BoardView`.
- Grep `tests/*.spec.cjs` for the id and the route and run each match. Smoke probes in `tests/guided-lessons.smoke.spec.cjs`
  that read readouts read `#board-card-readouts`; a lesson step whose probe reads a card opens it (`open: ['readouts']`);
  look for mangled escape characters (a literal backspace instead of `\b` broke one probe).
- `scripts/demonstration-preview-recipes.cjs`, `scripts/demonstration-clip-rows/*.cjs` and `scripts/*-gate-perf.cjs` rows
  that name a control which became a puck are only listed in the notes (stream A repoints them all; do not edit).
- `src/graphs/base/sharedControls.graphs.test.tsx`: a slider that becomes a puck moves its rows in the same lane.
- Lesson prose naming a moved control: correct Slovenian imperatives ("povečaj", "premakni", "vklopi"); pucks "s krmilnikom X"
  / "with the X control", bare names without quotation marks; controls left in Orodja named by place and action ("V kartici
  Orodja izberi …"); readouts "v kartici Odčitki" / "the Readouts card"; no "drsnik"/"slider"/"gumb"/"pregledovalnik".
  Quote every reworded sentence, old and new, sl and en.
- Red check per new assertion (value, `pressed`, a mark or `followView`). Do not re-record goldens; report differences verbatim.

## Checks

The shared brief's step 4 and 8, plus `just unit src/graphs/curves src/graphs/base/GraphSceneReload.test.tsx src/learning/content src/localization src/graphs/base/declare src/workspace src/graphs/base/sharedControls.graphs.test.tsx`,
`just unit FirstTask`, `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`,
`just graph-check <id> --route <route>`, `npx tsc --noEmit --pretty false`, `just lint`, `just build`,
`just smoke-lesson <lesson id> --port 4395 --workers=1`, and the browser caption check: the lesson (`<route>?learn=1`) after
Next clicks 2, 5, a middle one and the last, at 1440x900 and 1280x720 on the running dev server
`http://127.0.0.1:4484/bezeg-2.0/` (adapt `.command-logs/l49-comb-cap.cjs`); view every image; verdict per image: watched
object under a card, label on label, clipped at an edge, curve size. Do not start or stop servers. Foreground, each command
under 10 minutes; long output to `.command-logs/l44-<id>-*.log`.

## Return

At most 300 words per the shared brief's report section. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L44.md`
(one section per demonstration; write as you go; on `HANDOFF` stop, write done, unverified and next, and return partial).
