# F6 evidence matrix: Sweep S3 (C5 Fortune's algorithm)

Audit of 2026-11-03 at `b070f202` by a Sonnet `bezeg-worker`, read-only (committed files only; untracked logs ignored). Status: covered / partial / missing / browser. Test files and acceptance records were read, not re-run. Judged "covered" only when the assertion would fail if the property broke (empty or missing data fails); otherwise partial.

Summary: 108 rows with a status (the Acc 6 pointer row has none): 76 covered, 24 partial, 4 missing, 4 browser. Audit partial, see the last section.

Abbreviations: `K` = `src/compgeo/sweep/fortune.test.ts`; `EO` = `src/compgeo/sweep/eventOrder.test.ts`; `FG` = `src/graphs/compgeo/FortuneGraph.host.test.tsx`; `FA` = `src/graphs/compgeo/FortuneLessonActions.host.test.tsx`; `GEO` = `src/graphs/compgeo/fortuneGeometry.test.ts`; `PC` = `src/graphs/compgeo/fortunePresetCollection.test.ts`; `DV` = `src/graphs/compgeo/compgeoDefaultView.host.test.tsx`; `PS` = `src/graphs/compgeo/PointSetGraph.host.test.tsx` (base class of `FortuneGraph`); `GL` = `src/learning/content/compgeoGuidedLessons.test.ts`; `LM` = `src/learning/content/lessonMathNotation.test.ts`; `SC` = `src/learning/content/sweepChapter.test.ts`; `TC` = `src/learning/content/triangulationChapter.test.ts`; `OC` = `src/learning/OrderedChapterRendering.test.tsx`; `DP` = `src/demonstrationPreviewAssets.test.ts`; `SMOKE` = `tests/guided-lessons.smoke.spec.cjs` (fortune row l.2233-2248); `A22`..`A26` = `docs/reviews/sweep-algorithms/NN-acceptance.md`; `PERF` = `docs/reviews/sweep-algorithms/23-perf.md`; `SP` = `docs/specs/sweep-algorithms-lessons.md`.

Random-test bounds (spec n<=12, general position; `SWEEP_MAX_SITES` = 12, coordinate limit `SWEEP_COORD_LIMIT` = 1024):

| Test | n | seed | count | coordinate range |
|---|---|---|---|---|
| `K` l.401 equals the Delaunay dual | 3..12 (all ten sizes asserted, l.428) | 2026 | 300 accepted (asserted, l.425), general position only | -10..10 |
| `K` l.431 distinct heights, large coordinates | 3..12 | 77 | 60 | -1024..1024 |
| `K` l.447 trace consistency | 3..12 | 404 | 60 (not filtered for general position) | -8..8 |
| `K` l.576 surd order | 3..12 | 31 | 150 | -6..6 |
| `K` l.547 small-grid degenerate mix | 3..10 | 909 | 500, with counts of hits, cocircular, equal y and collinear asserted | -3..3 |
| `K` l.335 breakpoint root vs numeric roots | 2 sites | 11 | 400 draws, more than 4000 comparisons asserted | -12..12 |
| `EO` l.139 / l.157 surd compare vs BigInt reference | rationals | 20261101 / 77 | 4000 (decided > 3500) / 300 | n/a |

All within the spec bound. n = 13 is refused (`K` l.196-208, `PC` l.18). Kernel mutation evidence (observed failing) is in `A22` and `22-mutations.log`; not re-run here.

## C5 acceptance 1 to 6

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Acc 1: event order A, B, C, D, then the two true events; the cancelled event is never popped | covered | `K` l.222 (order `[A,B,C,D,5,6]`), l.240 (cancel in the trace); `FA` l.217 |
| Acc 1: two exact vertices (-1/2, 1) and (1/2, 1), the tie broken by centre x | covered | `K` l.255 (exact `r2` 65/4, height equality via `compareSurdHeights`, reports `[{item:0},{item:1}]`); `FA` l.217, l.290 |
| Acc 2: Fortune `VoronoiDiagram` equals the Delaunay dual on random sites, n<=12 (vertex rationals, edge kinds and incidences, ray direction as positive multiple, cells) | covered | `K` l.401, l.431 via `sameVoronoiDiagram` l.32-61 and `expectDual` l.64; sizes and counts asserted so the loop cannot be empty (l.425-428); vertex count `2n-2-h` l.419 |
| Acc 2: the comparison itself is not vacuous | covered | `FA` l.290 (dual of three sites must differ); `K` mutations in `A22` |
| Acc 3: every `cancel` has a site strictly inside its circle (`incircle`) in general position | covered | `K` `checkRun` l.148-193 with `byExecuted` = 0 asserted (l.417) and cancelled > 100 (l.426) |
| Acc 3: every executed circle is empty | covered | `K` `checkRun` (executed > 1000, l.427); default example `K` l.255 |
| Acc 3: under cocircular input a cancel may have an empty circle (spec wording is only the general case) | covered | `K` l.148-193 asserts the disjunction (site inside, or an executed circle with the same exact centre); 500-set mix with `byExecuted` > 50 (l.563). See the contradictions list |
| Acc 4: equal-y sites, pointed first arcs, tie by increasing x | covered | `K` l.472, `K` l.484 (all at one height), `K` l.362 (`compareToBreakpoint` pointed arcs) |
| Acc 4: the equal-y tie rule is stated to the learner | partial | Stated at `src/learning/content/compgeoGuidedLessons.ts` l.2582-2583 and l.2699; no test asserts the sentence (LM checks notation only). Add an SC or GL assertion on "same height ... left to right" |
| Acc 4: duplicate sites refused with a message naming both | covered | `K` l.206 (`duplicate-sites`, indices); `FG` l.362 (SL and EN message, drawing removed, step clamped) |
| Acc 4: all sites collinear, parallel lines, no vertices | covered | `K` l.495 (five sets incl. n = 2, edges = n-1, all `line`, no vertices, no circles) |
| Acc 4: collinear shown in the graph "as such" with a note | partial | Example `collinear` exists (`fortunePresetCollection.ts` l.23, button in `FortuneControls.tsx` l.29) but no Fortune graph test loads it; kernel only. Add a host test that loads each example, steps to the end and checks the drawing stats and the note |
| Acc 4: four or more cocircular sites, one degree-4 vertex, several circle events as one vertex | covered | `K` l.511 (rectangle, four and six cocircular, 20 shuffles; vertex sites list asserted) |
| Acc 4: cocircular shown in the graph | partial | Example `cocircular` (`fortunePresetCollection.ts` l.25) not loaded by any Fortune graph test; same gap as collinear |
| Acc 4: every degenerate class has a kernel test | covered | `K` l.472-570 |
| Acc 5: drawn beach line is visually continuous | partial | Single polyline, samples equal arcs (`FG` l.59, l.155); every drawn arc point on the lower envelope (`GEO` l.26). Continuity at breakpoints is not asserted (no test that adjacent arcs share their endpoint); visual check only in `A25` frames |
| Acc 5: labelled approximate in both languages: control note | partial | Key `fortune_playback_note` in `en.ts` l.3566 / `sl.ts` l.3565, rendered at `FortuneControls.tsx` l.170; no test renders or asserts it (type check only) |
| Acc 5: labelled approximate in lesson and chapter prose | partial | English asserted: `SC` l.89 ("drawn beach line is only an approximation"). Slovenian not asserted (`SC` l.93 lists other SL phrases). Lesson step text `compgeoGuidedLessons.ts` l.2511-2700 contains it, unasserted |
| Acc 6: C-1 to C-7 | see the C-1 to C-7 table | |

## C-1 to C-7 for C5

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| C-1 edit recomputes the trace | covered | `FG` l.107 (drag D: new run object, readouts follow), l.132 (smaller trace), l.362; `FA` l.111 (`set-points`) |
| C-1 edit resets the step to 0 | partial | Spec says reset; `FortuneGraph` deliberately keeps the step, clamped (`FortuneGraph.tsx` l.47-48, l.129-140; tested as kept at `FG` l.107-130; `docs/capabilities.md` l.84). No spec amendment found. See the contradictions list |
| C-1 edit pauses playback | partial | Lesson action `set-points` while playing: `FA` l.111-122. A real drag, a numeric edit or an import while playing is not asserted |
| C-2 Reset (button) returns to step 0 and the default example | partial | `FG` l.246-280 clicks `reset` but asserts only board object counts; `FG` l.280 asserts the example button restores sites at step 0 (not the Reset button); `FortuneGraph.tsx` l.192 `resetTrace`. Lesson-level reset to step 0: `FA` l.125-146 |
| C-2 leaving the lesson restores configuration and view | covered | `FA` l.125-146 (captureState and restoreState, no callbacks left); Back and unmount l.125; restoration contract is shared, not Fortune specific |
| C-2 stale stored step clamped on Preset import | partial | `FG` l.24-26 helper "writes the step like a Preset restore does", `FG` l.132, `FA` l.98 (clamp of `set-trace-step`). `importPresetData` with an out-of-range `graphState.step` (`FortuneGraph.tsx` l.291-304) is not driven; `FG` l.254 round trips an in-range step 3. Add a test importing a Preset with step 999 |
| C-2 Preset round trip and validation | covered | `FG` l.246-263 (save, select, step 3 kept, counts equal); `PC` l.13-31 (12 accepted, 13 refused, limit coordinate, polygon refused); `src/graphs/base/graphTransientStateContract.tsx` l.80 (`fortune: ['model']`) |
| C-3 Next step and Play yield identical states | partial | Both run `advance()` (`FortuneGraph.tsx` l.44-45); only one Play tick is tested (`FA` l.80-94, `playOneTick`). No Fortune test plays to the end and compares states with Next. Add: play with a manual scheduler to `done`, compare per step `view` with Next |
| C-3 Play stops at the end; no leftover scheduler callback | covered | `FA` l.111-146 (callback count 0 after pause, restore, unmount, scene change); `FG` l.209 (Next at the end aria-disabled) |
| C-4 both languages complete, `sl.ts` and `en.ts` in lockstep | covered | `GL` l.43-70 (every field bilingual, SL differs from EN); `SC` l.116-144 for the chapter; type-checked `t()` is a build property, not re-run |
| C-4 live language switch of the graph | covered | `FG` l.173 (queue struck-through text SL to EN), l.192 (live region SL to EN), l.362 (refusal message SL to EN) |
| C-5 arrow keys move a site one grid step; numeric list edits; Add point | partial | Inherited from `PointSetGraph`: `PS` l.108, l.150, l.162; no Fortune-specific assertion. Keyboard stepping: `FG` l.209 (Enter and Space on Next step) |
| C-5 12-site limit reached through Add shows a message | partial | `PS` l.187 with limit 3; Fortune passes `pointLimit: SWEEP_MAX_SITES` (`FortuneGraph.tsx` l.74), unasserted at graph level; importer `PC` l.18 |
| C-6 refusals are actionable and never move the input | covered | `K` l.196-208 (all reasons and their order); `FG` l.362 (duplicates, names both sites), l.383 (out of range names the site and the limit) |
| C-7 sweep line, queue and beach shown together on the board and in a side list | covered | `FG` l.49 (sweep line object, site names), l.155 (per step: beach text, circles, breakpoints, queue and vertex counts match the run) |
| C-7 current object highlighted in both | partial | Next event is marked in the queue (`data-next`, `aria-current`; `FG` l.173-181, only at the false alarm). The board has no distinct marker for the current event beyond the sweep line height and the breakpoints; none asserted. Browser check |
| Not colour only (cancelled circle) | covered | `FG` l.59-90 (dashed with a cross mark, name `fortune-circle-cancelled-mark`), l.173 (struck through plus text "cancelled, false alarm") |
| Live region silent while playing and during a drag | covered | `FG` l.192, l.392 |

## Exactness bullet

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Event heights compared exactly (default example: two true events equal and below D, cancelled lower still) | covered | `EO` l.91-99; `K` l.255, l.305 |
| Near-equal irrational heights (difference below 1e-12) | covered | `EO` l.123-137 (explicit pairs checked against a BigInt reference), l.139-155 (4000 random pairs), l.157-166 (perturbations of 1e-13) |
| Heights of equal exact value with a different representation; perfect squares | covered | `EO` l.100, l.110-121 |
| Doubles would invert the pop order; exact order does not | covered | `K` l.598 (pinned 5-site set: pop order fixed, `inverted` > 0 asserted); `K` l.576 (non-increasing exact height on 150 random runs); search in `22-doubles.log` |
| Queue key never a double | covered | `K` l.305 (`fortuneQueueOrder` with surd heights); mutation (c) in `A22` |
| Ties by centre x | covered | `K` l.255, l.305, l.576, l.598 |
| Circle event pops before a site at its lowest point (convention) | covered | `K` l.619 |
| Breakpoint comparison by squaring: sign on both sides, exact hits, unequal heights, pointed arcs | covered | `K` l.335 (more than 4000 comparisons against numeric roots, skipping those within 1e-6 of a root), l.362, l.382 (exact hit 0 plus both neighbours) |
| Breakpoint comparison with a site within a tiny distance of an irrational root | partial | Draws within 1e-6 of a root are skipped (`K` l.351); only exact hits are tested at the root. Add a near-tie case with a rational x one part in 1e12 from an irrational root |
| Voronoi vertices are exact rationals equal to the dual | covered | `K` l.401 (vertex keys `x,y:sites` compared as exact strings, l.22) |
| "Drawn approximately" in the legend | partial | See Acc 5 rows; legend render unasserted |
| Drawn beach line never feeds back into the algorithm | covered | Kernel imports no drawing code (`src/compgeo/sweep/fortune.ts`); `K` runs without a board; `GEO` l.26 compares drawn points to the envelope, not the other way. ADR 0035 l.16 |

## Output value

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Same `VoronoiDiagram` type as the Delaunay dual, compared by equality | covered | `K` l.32-61, l.64; `FA` l.290 |
| The finished drawing equals the Voronoi graph drawing of the same sites | covered | `FG` l.227 (`drawingStats` equal, back from the end the drawing is gone) |
| Final diagram of the default example: 2 vertices, 1 finite edge on y = 1, 4 rays, `2n-2-h` and `3n-3-h` | covered | `K` l.273; `FA` l.290 (counts 2 and 5 with `h` = 4) |

## Steps 1 to 7 as lesson scenes

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Step 1: sites and a sweep line above all of them | covered | `FA` l.195 (`fortune-sites`: "Pometalna premica je nad vsemi mesti"); `DV` l.100-110 (step-0 line above the highest site, inside the view) |
| Step 2: prediction (where will the first new arc appear) | partial | Scene equals step 1 (`FA` l.195 `EXPECTED['fortune-predict']`); the prediction question is prose only, nothing hides or reveals as in A1/A2 (`GL` l.239-270 cover those only). Acceptable by spec wording; no assertion on the prompt text |
| Step 3: first site events, arcs, breakpoints, traced edge | covered | `FA` l.195 (`fortune-site-events`: step 3 of 8, beach A, B, A at y = 3), l.217; `FG` l.155 |
| Step 4: circle scheduled (B, A, C), centre (0,0), R^2 = 25, lowest point y = -5 | covered | `K` l.228; `FA` l.195, l.217; `GEO` l.103 (height -5 is rational) |
| Step 5: D inside the circle, false alarm, circle shown as not empty | covered | `K` l.240 (strictly inside); `FA` l.195 (queue shows "(preklican, lažni alarm)", two notes, false alarm sentence); `FG` l.59 (dashed circle plus cross) |
| Step 6: true circle events, middle arc disappears, vertex output | covered | `K` l.255; `FA` l.195 (`fortune-true-events`, vertices 2 of 2), l.217 (order by x) |
| Step 7: finished diagram equals the Delaunay dual; free exploration up to 12 sites | partial | Equality `FA` l.290; end readout `FA` l.195; "up to 12 sites" is prose (`compgeoGuidedLessons.ts` l.2582 region) and the Add limit is tested only on the base class. The step 7 state in a real browser: `SMOKE` fortune row (steps 1 to 7 of 8 probed) |
| Lesson text quotes only values the run produces | covered | `FA` l.217 (circles, heights, cancellation, trace positions), `SC` l.69 (facts `3<5`, `y=-5`, `(0,0)`, `(∓1/2,1)`, `2n-2-h=2`, `3n-3-h=5`) |
| Lesson step actions in one synchronous sequence | covered | `FA` l.195; `FA` l.147 (scene change after Play) |
| Seven steps, both languages; notation enforced | covered | `GL` l.43-70; `LM` l.59 (`compgeoGuidedLessons` set) and l.191 (id `fortune` in the lessons list); `SC` l.69-93 |
| Notation: every symbol in `\(...\)`, `{,}` for decimals, undelimited `latex` fields | covered | `LM` (generic over the lesson sets, `fortune` listed at l.191); no Fortune-specific mutation seen, the test is generic and shared |

## Capabilities

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| 12-site limit, refusal not silent truncation | covered | `K` l.196-217 (13 refused with `too-many`, 12 accepted); `PC` l.18-22 |
| Coordinate limit 1024 accepted, 1025 refused | covered | `K` l.206-215; `PC` l.24-28; `FG` l.383 |
| Trace has `schedule`, `cancel`, `report` with the right fates | covered | `K` l.447 (every circle's `scheduled` is a `schedule`, fate event is `pop` or `cancel`, pops = sites + executed) |
| Beach-line fold: ordered arcs as site ids with an edge per breakpoint | covered | `K` l.228, l.240, l.284 (edge sites of each breakpoint = the sorted pair) |
| Parabola and circle overlays | covered | `FG` l.59, l.155; `GEO` l.26, l.44, l.65, l.116 (origins equidistant, box contains vertices and circle lowest points) |
| Dragging a site recomputes the whole trace; board objects stable | covered | `FG` l.93 (20 step changes), l.107 (drag, reuse of owned objects, handle identity), l.246 |
| Disposal and ownership of boards, listeners, timers | covered | `FG` l.341 (unmount disposes, remount draws again), l.246; `FA` l.125-146 (no scheduler callbacks) |
| Follow box and "continues" markers inside the view | covered | `FG` l.304; `FA` l.312 (all seven scene views at 1280x720) |
| Examples: A-D, without D, collinear, cocircular, 12 random | partial | A-D: everywhere; without D: `FG` l.132 (loaded to check the clamp); collinear and cocircular: no graph test; `random`: box only, 30 seeds (`GEO` l.44). Same gap as Acc 4 |

## Default example and second example

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Default sites A (0,5), B (-4,3), C (4,3), D (0,-3); beach line A, B, A, C, A before D | covered | `K` l.228; `FG` l.59 (also the beach readout in SL); `FG` l.49 |
| D arrives first at y = -3 and cancels the event of (B, A, C) | covered | `K` l.228 (queue `[D, 4]`), l.240 |
| Two true events at 1 - sqrt(65)/2 (about -3.0311) | covered | `K` l.255; `FA` l.217 (`toBeCloseTo(-3.031)`), `GEO` l.103 |
| Brute-force ground truth: only ABD and ACD have empty circumcircles | covered | `K` l.255 (executed sites `[A,B,D]`, `[A,C,D]`), `checkRun` empty-circle test via `incircle` l.159 |
| 2 vertices, 1 finite edge (bisector of AD), 4 rays | covered | `K` l.273 (finite edge sites `[A,D]`, y = 1) |
| Second example (without D): one circle event at y = -5, vertex (0,0) | covered | `K` l.320-330 |

## Testing Decisions (spec l.148-154) as they apply to C5

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Fortune against the Delaunay-dual Voronoi | covered | See Acc 2 |
| Fortune against brute-force empty-circle triples | covered | `K` l.159-193 (`incircle` against every site for every circle); no separate "all empty triples are found" completeness check, but the vertex count `2n-2-h` (l.419) and the dual equality close it |
| Rational comparison tests with near-equal irrational heights | covered | `EO` l.123-166 |
| Scene tests: one synchronous sequence | covered | `FA` l.195 |
| Scene tests: reset | partial | See C-2 reset row |
| Scene tests: language switch | partial | Graph readouts and queue switch in `FG` l.173, l.192; the lesson scenes are asserted in Slovenian only (`FA` l.168-193 `EXPECTED` is SL text); no English scene assertion |
| Scene tests: stale step clamped on import | partial | See C-2 stale step row |
| `lessonMathNotation.test.ts` stays enforced for the new prose | covered | `LM` l.59 and l.191 list `fortune`; not weakened (file not edited by S3 beyond the id list, per `A25`) |
| `sl.ts` and `en.ts` in lockstep, `tsc` after localization | covered | `A25` and `A26` record `tsc` clean and `just build` passed at `ffb9826a` and `999aff91`; not re-run here |
| Smoke: default stepping, language switch, Preset, Reset, catalog card, route direct and reload at 1280x720 and 390x844 | browser | `SMOKE` l.2233-2248 (7 lesson steps, SL desktop with pointer, EN at 390x844; `A25` 2 passed); `24-smoke.md` (record marked PARTIAL, first run plus probes; handler follow-up and `just smoke-built` pass in `A24`) |
| Smoke: free-exploration edit (drag or add a site) in the browser | missing | Not in the `SMOKE` fortune row (lesson walk only) and not in `24-smoke.md`; only the host drag test `FG` l.107. Browser check: drag D, add a 13th site, step to the end |
| Smoke: a degenerate input in the browser (collinear, cocircular, duplicate) | missing | Not recorded in any smoke or acceptance record |
| Performance: dragging a site, 12 sites | browser | `PERF`: Chromium 1440x900, 12 random sites (seed 1), 3 runs of 60 moves; polyline beach line median 16.7 ms, p95 16.7-16.8 ms, max 16.8 ms; rerun on the registered route in `A24` the same. Limits recorded in `PERF`: headless, one machine, no CPU throttling, mouse only |

## Batch-wide gate (spec l.156), S3 part

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Kernel tests pass | covered | `A22`: `just unit src/compgeo/sweep` 147/147 at `4dcc5c04`; mutations (a) to (e) observed failing; not re-run in this audit |
| Both languages, live switch | partial | See C-4 and the SL-only scene assertions |
| ADR accepted | covered | `docs/adr/0035-sweep-coordinates-and-exact-event-order.md` l.3 (accepted 2026-10-31), l.15-16 (square-root heights, doubles for drawing only, "approximate" label) |
| `docs/capabilities.md` updated | partial | Row l.84 describes the graph and drag behaviour, but its route cell still reads "(graph only; route registration is sweep task 24)"; the route (task 24), lesson (task 25) and chapter section (task 26) have landed. Compare l.88 for the format of a registered route |
| `GLOSSARY.md` beach line, circle event, false alarm | covered | `GLOSSARY.md` l.16, l.19, l.22 |
| `GLOSSARY.md` site event | missing | No entry; "site event" appears only inside the false-alarm entry (l.23) |
| `GLOSSARY.md` Fortune's algorithm | missing | No entry of its own (named inside the beach line and circle event entries, l.17 and l.20) |
| Published separately | covered | S3 commits (`d78621ae`, task 26; earlier task 22 to 25 commits) precede `b070f202`, and the local ref `origin/master` points at `b070f202`. The remote itself was not queried |

## Chapter placement and catalog poster

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| Section `fortune` follows `monotone-triangulation` in `sweep-algorithms`, activity card is the last item | covered | `SC` l.27, l.49, l.65-67 (`orderedContent.at(-1)` is the example id `sweep-algorithms.fortune.fortune`) |
| Prose facts in SL and EN (`3<5`, `y=-5`, `(∓1/2,1)`, `2n-2-h=2`, `3n-3-h=5`, `-3.031`) | covered | `SC` l.69-93 |
| Prerequisite link to `triangulations-voronoi#voronoi` resolves to a real section | covered | `SC` l.36-38 |
| Lesson owned by the sweep chapter, not by the old interim owner; chapter coverage 117 | covered | `SC` l.96-113 (`getGuidedLessonOwners`, `authoredGuidedLessonIds`, interim owner absent); mutation evidence in `A26` item 2 |
| Voronoi section links to Fortune, once, labelled in both languages | covered | `TC` l.213-229 (one link, only in `voronoi`, href and label equal the Fortune title); `OC` l.88-106 (router link in SL and EN, exactly one) |
| Link target reached, heading at the top of the view, MathJax typeset, no overflow, return link focus | browser | `A26` item 3 (production preview of `ffb9826a`, 1440x900 and 390x844, SL and EN, 24 and 23 MathJax nodes, no page errors); log `26-browser.log`. Rechecked after the rebase only by `just smoke-lesson fortune` (2 passed) and the unit run |
| Old example id removed (breaking change recorded) | covered | `A26` item 2 and the task 26 file record the change; `SC` l.113 asserts the interim owner is gone. Redirect behaviour of an old `?example=` link: stated in `A26`, not found asserted in a test |
| Route `/bezeg-2.0/compgeo/fortune` and catalog entry | covered | `src/Routes.test.tsx` l.167; `src/demonstrations.test.ts` l.105 (title keys, prompt) |
| Catalog poster exists and is not pending | covered | `src/images/demonstrations/catalog/fortune.png` (committed in `752a07ad`); `DP` l.13 ("has a poster for every Demonstration"); `src/demonstrationPosterPending.ts` l.9 is empty |
| Poster content: false alarm frame, circles round, diamonds at lowest points, dashed cancelled circle | browser | Viewed by handler 46 (`handler-handoff-46.md` l.16); the unit test checks only that the asset key exists, not its pixels. Recipe `scripts/demonstration-preview-recipes.cjs` l.117 |

## Gaps

| Row | What is lacking | Suggested test or browser check |
|---|---|---|
| Acc 4 equal-y tie rule stated | No test pins the sentence in the lesson | `GL` or `SC` assertion on the "same height ... left to right" sentence in SL and EN |
| Acc 4 and capabilities: collinear and cocircular examples in the graph | Kernel only; the `collinear`, `cocircular` and `random` example buttons are never driven in a Fortune host test | Host test: click each example, step to the end, assert drawing stats (no vertices and line edges for collinear; one degree-4 vertex for cocircular) and the note |
| Acc 5 beach line continuous | Arc ends meeting at breakpoints not asserted | `GEO` test: consecutive arcs share their endpoint within a tolerance at every step |
| Acc 5 "drawn approximately" legend | Control note and its SL text not rendered in any test; SL chapter and lesson prose not asserted | Render `FortuneControls` in `FG` in both languages and assert the note; add an SL phrase to `SC` l.93 |
| C-1 step reset on edit | Spec contradicts the implementation (see below) | Amend `SP` C-1 or change the graph; if kept, add a sentence to the C5 section of the spec |
| C-1 edit pauses playback | Only the lesson action path is tested | `FG`: start Play, drag a site, assert not playing and no callback |
| C-2 Reset button | Only counts asserted after `reset` | `FG`: go to step 5, click `reset`, assert step 0, not playing |
| C-2 stale step on import | No Preset import with an out-of-range step | `FG`: `importPresetData` with `graphState.step` 999 and with a smaller trace, assert clamped to `run.length - 1` |
| C-3 Next versus Play | One Play tick only | `FA`: manual scheduler, play to `done`, compare each step's `view` with the Next sequence |
| C-5 keyboard and Add limit on Fortune | Inherited behaviour, asserted only on the base class | `FG`: arrow key moves a selected site and recomputes; Add at 12 sites shows the notice |
| C-7 current object highlighted on the board | Only the queue marks the next event | Browser check of the board highlight at a site event and a circle event; if none exists, record it as a design gap |
| Breakpoint comparison near-tie | Draws within 1e-6 of a root are skipped | `K` case with a rational x about 1e-12 from an irrational root and its sign checked with `BigInt` arithmetic |
| Step 2 prediction | Prompt prose only, no assertion | Optional `GL` assertion that the predict step carries a question; no state to test |
| Scene tests in English | `FA` asserts Slovenian readouts only | `FA`: repeat the seven-scene loop after `setLanguage('en')` for the beach and queue text |
| Smoke: free exploration edit | Not in the `SMOKE` row or `24-smoke.md` | Browser: drag D, add a site to 12, try a 13th, step to the end, Reset |
| Smoke: degenerate input | Not recorded | Browser: load the collinear and cocircular examples and a coinciding site; read the message and the drawing |
| `docs/capabilities.md` l.84 | Route cell is stale | Replace it with `/compgeo/fortune`, mention the lesson and the chapter section |
| `GLOSSARY.md` | No "site event" and no "Fortune's algorithm" entry | Add both entries (Slovenian term for site event needs the usual term research) |
| Poster content | Pixel content not tested | Keep as a browser or manual check (handler 46 viewed it); optionally re-capture and compare after a drawing change |

## Contradictions between the spec and the code

- C-1 (`SP` l.72) says an edit "resets the step index to 0". `FortuneGraph` keeps the step, clamped to the new trace (`src/graphs/compgeo/FortuneGraph.tsx` l.47-48, l.129-140, l.208; `FG` l.107-130; `docs/capabilities.md` l.84 documents it). The spec was not amended.
- Acc 3 (`SP` l.123) says every `cancel` has a site strictly inside its circle. For four or more cocircular sites the kernel can cancel a circle that is empty, when an executed circle with the same centre supersedes it (`K` l.127-147 and `checkRun`; `A22` "Cancel rule"). The spec's general-position clause makes it consistent, but acceptance 4 (cocircular) does not state the exception.
- `docs/capabilities.md` l.84 says "route registration is sweep task 24", but the route is registered (`src/Routes.test.tsx` l.167, `src/demonstrations.test.ts` l.105).
- Gate (`SP` l.156) and the brief name vocabulary "site event" and "Fortune"; `GLOSSARY.md` has neither as an entry.

## Audit status: partial (handoff at the context budget)

Every row above was written from files read in this audit. Line numbers in the tables were checked against `K` for `sameVoronoiDiagram` (l.32-61), `expectDual` (l.64), `checkRun` (l.148-193) and the random-test assertions (l.417-428, l.563). Not yet re-verified against the files: the exact line numbers of `FG`, `FA`, `GL`, `PS` and `SC` entries (they come from test-title listings, so they point at the test start and not at the asserting line), and whether `lessonMathNotation.test.ts` has any Fortune-specific mutation evidence. Not audited at all: the `FortuneControls` rendering beyond the queue and live region, the task 23 mutation logs, and the contents of `26-browser.log`.
