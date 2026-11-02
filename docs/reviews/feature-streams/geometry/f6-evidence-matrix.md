# F6 evidence matrix: Triangulation T1 (B1) and Sweep S1 (C1, C2)

Audit of 2026-11-02 at `1b287a24`, read-only. Classes: COVERED (an automated test asserts it), PARTIAL, MANUAL (browser or visual only), MISSING. Test files were read, not re-run (another process runs `just check`).

Abbreviations: `EC` = `src/compgeo/earClipping.test.ts`; `ECG` = `src/graphs/compgeo/EarClippingGraph.host.test.tsx`; `ECL` = `src/learning/content/compgeoEarClippingLesson.test.ts`; `ECA` = `src/graphs/compgeo/EarClippingLessonActions.host.test.tsx`; `IS` = `src/compgeo/sweep/intervalSweep.test.ts`; `BO` = `src/compgeo/sweep/bentleyOttmann.test.ts`; `ISG`/`BOG` = `src/graphs/compgeo/IntervalSweepGraph.host.test.tsx` / `BentleyOttmannGraph.host.test.tsx`; `ISA`/`BOA` = the `*LessonActions.host.test.tsx` files beside them; `TSC` = `src/graphs/base/graphTransientStateContract.tsx` (every Demonstration in CI scope all; locally a sample plus changed classes); `SMOKE` = `tests/guided-lessons.smoke.spec.cjs` (rows ear-clipping l.1709, interval-sweep l.1749, segment-intersections l.1788).

## Triangulation T1: B1 ear clipping

| Item | Class | Evidence |
|---|---|---|
| B1.1 Example 1 clips the 3 listed triangles in order; first-ear rule stated in lesson | COVERED | `EC` "clips the notched pentagon in the documented order"; `ECG` "Example 1 clips the three listed triangles in order"; `ECL` l.124 and l.230-231 (rule text, SL and EN) |
| B1.2 random simple grid polygons n<=15: n-2 triangles, areas = shoelace, no vertex inside, every edge a triangle edge | COVERED | `EC` "holds the invariants on random simple grid polygons" (300 polygons, n 4..15, checkTriangulation, clip order vs independent reference, asserts >=50 checked) |
| B1.3 three distinct colours per triangle; smallest class <= floor(n/3) | COVERED | same `EC` test |
| B1.4 non-simple and 3 collinear vertices refused with message | COVERED | `EC` "refuses invalid polygons with distinct reasons"; `ECG` test.each(REFUSALS) (SL text, no trace objects, controls disabled) |
| B1.5 clockwise reversed and the lesson says so | COVERED | `EC` "reverses a clockwise input and keeps input indices"; `ECG` "a clockwise polygon is reversed ... panel says so". The panel note is asserted, lesson prose is not. |
| B1.6 guard-view overlay equals union of triangles at the guard vertex | COVERED | `EC` random test (guardView equals triangles containing v); `ECG` "the guard view equals the triangles at the guard vertex" |
| B1.7 comb gives classes 4, 4, 3 | COVERED | `EC` "triangulates the comb with 9 triangles and classes 4, 4, 3"; `ECG` comb test; `ECL` l.163 |
| B1.8 / C1 edit recomputes, step 0, pauses | COVERED | `ECG` "an edit, a drag, an added vertex or an example returns to step 0, pauses and leaves nothing scheduled"; `ECA` "edit actions pause and return to step 0" |
| C2 Reset to default example + step 0; leaving restores config and view | COVERED | Panel Reset is step 0 only (`ECG` l.171). Scene Reset and lesson exit: `TSC` checkpoint restore, "lesson default scene drops every earlier change", "Preset replacement (reset to the default scene)"; `ECA` "Back ... state restore and unmount pause playback". Generic contract, not ear-specific. |
| C3 Next step and Play identical | COVERED | `ECG` "Next step repeated k times and Play advanced k ticks give the same state"; `ECA` next-step action equality |
| C4 both languages, live switch, typed t() | COVERED | `ECG` "a live language switch re-renders the panel and the overlay labels"; `ECL` "quoted numbers appear in the step text of both languages"; `lessonMathNotation.test.ts`; typed t() is checked by tsc only |
| C5 every action without a pointer | COVERED | Base `PointSetGraph.host.test.tsx` (arrow nudge, numeric list, Delete); trace controls are native buttons, `ECG` has no keyboard-only run. Residual MANUAL: Tab order and focus ring. |
| C6 invalid points refused with actionable message, not moved | COVERED | `ECG` REFUSALS; `EC` refusal reasons |

## Sweep S1: C1 interval sweep

| Item | Class | Evidence |
|---|---|---|
| C1.1 default trace: counts 1,2,3,2,1,2,1,2,1,0, max 3, pairs ab ac bc bd de | COVERED | `IS` describe "interval sweep, spec example" (5 tests); `ISG` "example 1 stepped to the end ..." (panel and board) |
| C1.2 random n<=10, shared endpoints: pairs and max equal brute force | COVERED | `IS` "random sets against the brute-force oracle" (300 rounds, SWEEP_MAX_INTERVALS = 10, small span forces shared endpoints, pair set, once each, max, trace length) |
| C1.3 ties: entering before leaving; lesson states the rule | COVERED | `IS` describe "ties"; `ISG` "ties: the entering events of 3 ..." and tie-rule panel text in SL (l.112) and EN (l.339); lesson text in compgeoGuidedLessons.ts l.867/879 (lesson prose itself not asserted) |
| C1.4 zero-length accepted and reported as touching | COVERED | `IS` "reports a zero-length interval inside another", "two identical zero-length ..."; intervalSweepRun.test.ts; `ISA` "second sample of step 7 ends with 4 pairs out of 6" |
| C-1 | COVERED | `ISG` "an edit while playing recomputes the trace, returns to step 0 and pauses"; `ISA` "an edit action pauses playback" |
| C-2 | COVERED | `ISG` same test (Reset = step 0); PointSetIntervals.host.test.tsx "Reset returns an intervals scene to the default scene"; `TSC` |
| C-3 | COVERED | `ISG` "Next step repeated k times and Play advanced k ticks ..."; `ISA` next-step equality |
| C-4 | PARTIAL | `ISG` language-switch tests, sweepChapter.test.ts both languages, lessonMathNotation.test.ts. `ISA` lesson-scene tests run in SL only (setLanguage sl); EN lesson walk is only the recorded just smoke-lesson run (task 11). |
| C-5 | COVERED | PointSetIntervals.host.test.tsx (Add interval, arrow nudge, numeric lo/hi, Delete); `ISG` "status entries are keyboard focusable" |
| C-6 | COVERED | `ISG` describe "refusals" (SL and EN); `IS` "refusals" |
| C-7 | COVERED | `ISG` describe "side lists" (match state after every step, current highlighted, hover to board) and l.144 board highlight. Projection legibility is MANUAL. |

## Sweep S1: C2 Bentley-Ottmann

| Item | Class | Evidence |
|---|---|---|
| C2.1 13 events, statuses, five crossings, exact rationals | COVERED | `BO` "pops exactly the 13 events ... with the spec status after each", "reports the five crossings with the exact rationals"; bentleyOttmannRun.test.ts; `BOG` l.116, l.142 |
| C2.2 random grid n<=12 vs brute force incl. degenerate | COVERED | `BO` "against the brute-force oracle" (generators concurrent, endpoint on interior, shared endpoints, axis; SWEEP_MAX_SEGMENTS = 12; checkAgainstOracle set equality of points with segments); "generators force each degenerate class often enough" |
| C2.3 shared endpoints, T contact, vertical, 3+ through a point, collinear overlap | COVERED | `BO` "special cases", "degenerate example", "refuses collinear overlap and names the first pair"; `BOG` "an overlapping collinear pair names the pair and is not drawn". Vertical segments only via the axis generator and the d example. |
| C2.4 status order checked after every event (rotated line) | COVERED | `BO` checkAgainstOracle (status members after each point) and describe "status order check" (wrong order rejected when the pair meets later on the same line) |
| C2.5 each pair once, no event scheduled twice | COVERED | `BO` checkAgainstOracle (unique schedule ids and positions, strictly increasing pops, unique outputs); sweepTrace.test.ts "ignores a repeated schedule" |
| C2.6 tests-vs-pairs counter displayed and matches trace | COVERED | `BO` "counts 9 neighbour tests ... against the 6 pairs"; `BOG` "the neighbour test of the current step is shown ... counter equals the tests of the trace"; `BOA` l.245 |
| C-1 | COVERED | `BOG` "an edit while playing recomputes the trace ..."; `BOA` edit action |
| C-2 | COVERED | `BOG` same test; PointSetSegments.host.test.tsx "Reset returns a segments scene to the default scene"; `TSC` |
| C-3 | COVERED | `BOG` "Next step repeated k times and Play advanced k ticks ..." |
| C-4 | PARTIAL | `BOG` language-switch and "the lists follow a language switch"; sweepChapter.test.ts; lessonMathNotation.test.ts. `BOA` runs SL only; EN lesson walk only in the task 12 smoke record. |
| C-5 | COVERED | PointSetSegments.host.test.tsx (Add segment, arrow nudge, numeric fields, Delete); `BOG` hover or focus on status entry |
| C-6 | COVERED | `BOG` describe "refusals" (13th segment, range, non-integer SL and EN, overlap); `BO` "refusals" |
| C-7 | COVERED | `BOG` describe "side lists" (13 events and statuses from the lists, current event marks segments, crossing marks all segments through the point, hover to board). Projection legibility MANUAL. |

## Lessons, chapters, catalog

| Item | Class | Evidence |
|---|---|---|
| Lesson scenes run synchronously and show what the text quotes | COVERED | `ECL` "the seven scenes ..."; `ISA` l.215; `BOA` l.219, l.245, l.262 |
| Chapters advertise only released lessons; ownership moved | COVERED | triangulationChapter.test.ts, sweepChapter.test.ts, familyChapters.test.ts |
| Routes, catalog, previews | COVERED | Routes.test.tsx l.151-153; demonstrations.test.ts l.77-79; demonstrationPreviewAssets.ts l.73-75, 150-152 |

## Batch-wide gates

| Gate item | Class | Evidence |
|---|---|---|
| T1-1 opens from family and after refresh with lesson and static preview | PARTIAL | Routes, catalog and preview-asset tests are automated. Direct open and reload are browser-only (task 08/10 smoke logs in docs/reviews/feature-streams/geometry/); no unit test of a reload. |
| T1-2 concept contract numbers | COVERED | B1.1 to B1.7 |
| T1-3 languages, inputs, projection readability, scene restore, stopped-by-default playback, Presets, figure export | PARTIAL | Covered: languages, inputs, restore, stopped default (`ECA` l.72), Presets (`ECG` Preset round trip). MANUAL: projection readability (task 09 fitted views after the smoke found the comb outside the view; `ECL` l.273 asserts the view contains the polygon). Figure export: no ear-clipping test; only generic `TSC` figure-batch tests. |
| T1-4 existing routes and Presets unchanged; shared runtime regression-tested | COVERED | PointSetGraph.host.test.tsx, pointSetPresetCollection.test.ts, `TSC`; full unit runs recorded in tasks 08, 10, 12 |
| T1-5 evidence recorded; commit and push | COVERED | Status lines of tasks 06-10; branch equals origin/master at 1b287a24 |
| S1-1 kernel tests pass | COVERED | `IS`, `BO`, sweepTrace.test.ts, segment primitive tests; tasks 02, 03, 05, 06. Not re-run here. |
| S1-2 every lesson meets its list in both languages | PARTIAL | see C-4 rows: lesson scene unit tests are SL only |
| S1-3 ADR 0035 accepted | COVERED | docs/adr/0035-sweep-coordinates-and-exact-event-order.md l.3 "Status: accepted, 2026-10-31" |
| S1-4 docs: capabilities and glossary updated | MISSING | docs/capabilities.md and GLOSSARY.md have no ear clipping, interval sweep, Bentley-Ottmann, sweep or triangulation entry (grep -i; also no convex hull or orientation). Only docs/current-architecture.md l.116 covers the graphs and routes. |
| S1-5 smoke tested, published separately | PARTIAL | Recorded runs in tasks 08, 10, 11, 12, 13 (both languages, live switch, chapter page); `SMOKE` rows assert the per-step trace counter and the degenerate step. Free-exploration edit and keyboard-only runs exist only in smoke-tester logs. "Published separately" cannot be told apart at this commit. |

## Manual-only checks

- Projection legibility and contrast of the sweep line, status list, queue, hollow guard rings and result line at 1366 px and 390 px, SL and EN.
- Focus order and focus ring across Next, Play, Reset, side-list status entries (each a Tab stop), numeric point list.
- Direct open and reload of the three routes and the catalog previews.
- Figure export of the three Demonstrations.
