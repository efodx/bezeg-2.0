# F6 evidence matrix: Convexity Batch 3 (A6 Back to Bézier)

Audit at HEAD `7d13c2b3`, read-only, by a Sonnet `bezeg-reviewer`. Tests were read, not run. Classes: COVERED, PARTIAL (what only a browser shows is named), MISSING, N/A. Later closures are in the [acceptance record](f6-convexity-batch3-acceptance.md).

Abbreviations (under `src/`): SUB `compgeo/curvePairSubdivision.test.ts`; HS `compgeo/hullSeparation.test.ts`; CPG `graphs/compgeo/CurvePairGraph.host.test.tsx`; BHG `graphs/compgeo/BezierHullsGraph.host.test.tsx`; BHC `graphs/compgeo/BezierHullsControls.host.test.tsx`; BHA `graphs/compgeo/BezierHullsLessonActions.host.test.tsx`; BHP `graphs/compgeo/BezierHullsGraph.perf.test.tsx`; BPC `graphs/compgeo/bezierHullsPresetCollection.test.ts`; BHR `graphs/compgeo/bezierHullsReadout.test.ts`; BL `learning/content/compgeoBezierHullsLesson.test.ts`; GUIDED `learning/content/compgeoGuidedLessons.ts` (prose); SMOKE `docs/reviews/convexity-hulls/f6b3-smoke/report.md` (handler 54); M1-3 `docs/reviews/convexity-hulls/29-mut1..3.log`.

| Item | Class | Evidence |
|---|---|---|
| A6.1 counts 1/1, 2/4, 8/16, 8/64, 8/256 | COVERED | SUB l.57-65 (kept lengths [1,2,8,8,8] and tested counts, read from `curvePairRun`). HS l.129 (5 depths: pairs 1/4/16/64/256 and overlapping count). BHR l.25 (8 of 256). BL l.106 (readout per scene, both languages) |
| A6.2a every discarded pair disjoint by dense sampling | COVERED | SUB l.155 (41x41 samples per discarded pair, `min > 1e-9`, depths 1-4; discards are non-empty because tested exceeds kept). HS l.144 (200x200 samples, closest distance `> margin`, k=0..4) |
| A6.2b no pair with a true crossing discarded | COVERED | SUB l.169-175 (t=1/4, 3/4 checked as crossings to 1e-12, pieces on both sides kept at every depth). HS l.167-179. SUB l.130-144 (hierarchical result equals all pairs, 24 seeded random nets) |
| A6.3 piece hulls inside the parent hull | COVERED | SUB l.188 (20 random nets, degrees 2 and 3, depths 0-3, scaled-integer `orient`). HS l.194 (exact triangle containment, k=1..4). Tests child control points, which implies child hull containment |
| A6.4 overlap necessary, not sufficient | COVERED | BL l.330 (hull step, near-miss step, goals, chapter; sl and en) |
| A6.4 recursion stops at a fixed depth | COVERED | BL l.337 (near-miss step, test formula, chapter; sl and en); BL l.352 (every "exact"/"natančn" mention negated, at least 3 required) |
| A6.5 drag recomputes pairs and resets playback | COVERED | BHG l.341 (drag at step 8 returns to step 0, pauses, new run, redrawn pieces); CPG l.86; BHG l.390 (scene change pauses). SMOKE row 6 |
| A6.6 both languages | PARTIAL | BL l.106, l.139; BHC l.63; BHR; BPC l.52; SMOKE row 2. Text overflow: browser only |
| Ex.1 crossings t=1/4, 3/4; points (1,1.5), (3,1.5) | COVERED | BL l.231; SUB l.169-174 |
| Ex.2 caveat counts 1,3,3,1,1 | COVERED | SUB l.20-21 (overlapping [1,3,3,1,1], tested [1,4,12,12,4]) |
| Ex.2 none at depth 5 | COVERED | SUB l.67 (1024 pairs, 0 overlapping, with a count guard); BL l.220 |
| Ex.2 gap about 0.0108 | COVERED | BL l.231, l.256 (quoted as about 0.01, decimal comma in Slovenian) |
| Ex.2 lesson explains the 8 pairs at shared piece endpoints | PARTIAL | Prose at GUIDED l.3279, l.3332. No BL assertion pins it. Expected: a sl/en regex on `bh-depth4` in the style of l.330 |
| Steps 1-7 reachable | COVERED | BL l.106, l.295; SMOKE row 1 |
| Step 1 reuses `curve-visibility: convex-hull` | PARTIAL | BL l.295 names the prerequisites; no assertion on the reuse. BHG l.219-242 covers the whole-curve hull drawing. Low risk |
| Depth limited to 4 | COVERED | SUB l.78-84, l.233, l.250; BHA l.75 |
| Robustness: `hullsSeparated` keep-biased margin | COVERED | HS l.107-120, l.214, l.226, l.232, l.256, l.275-327 |
| Robustness: lesson does not call the test exact | COVERED | BL l.344, l.352 |
| ADR 0036 | COVERED | The ADR exists; HS cites the margin policy |
| TD: separating axis against dense sampling | COVERED | As A6.2a |
| TD adapter: drag and snap | COVERED | CPG l.86, l.126; BHG l.341 |
| TD adapter: arrow keys | PARTIAL | No arrow-key test in CPG, BHG or BHC; inherited from the point-set base and tested for other subclasses. Expected: a CPG test that an arrow key on `A_1` moves the grid point and redraws the curve |
| TD adapter: fixed point count | COVERED | CPG l.156, l.177, l.190 |
| TD adapter: Preset validation | COVERED | CPG l.206; BPC l.13-52; BHC l.109 |
| TD multi-action scenes in one synchronous sequence | COVERED | BHA l.124; BL l.106 |
| TD lesson: default preparation | COVERED | BHA l.67; BL l.129 |
| TD lesson: Back | COVERED | BL l.266; SMOKE row 2 |
| TD lesson: exit restore | PARTIAL | BL l.266 covers scene restore; no lesson-level unit test of exit restore. Browser: SMOKE row 4 |
| TD lesson: final-scene handoff | PARTIAL | BL l.129, l.106 cover the last scene; nothing asserts the handoff to the live graph. SMOKE observation on inert fields while the card is shown |
| TD lesson: `lessonMathNotation` | COVERED | The shared test runs over this lesson (its contents not read in this audit). SMOKE row 1 |
| TD lesson: both languages | COVERED | BL l.106, l.139, l.330-352; BHC l.63; SMOKE rows 1, 2, Ch |
| TD playback: Next step/Play equivalence | COVERED | BHG l.371; BHA l.97 |
| TD playback: pause on edit and scene change | COVERED | BHG l.341, l.390; BHA l.108 |
| TD playback: disposal | COVERED | BHG l.390, l.422; CPG l.263 |
| TD depth 4 rendering measurement | COVERED | BHP l.154 (median of last step under 100 ms, worst-case cubic pair); `docs/reviews/convexity-hulls/26-measure.md`. Asserts the draw median only |
| Gate 1: opens from the family, direct and after refresh, lesson, static preview | PARTIAL | SMOKE row 4; the catalog poster was not counted in the smoke (commit `87a77d14`) |
| Gate 2: concept contracts | COVERED | Rows above |
| Gate 3: languages, inputs, projection, restore, stopped, Presets, export | PARTIAL | BHA l.67, BL l.266, BPC, BHC l.89, l.109, SMOKE rows 5, 7. No keyboard-only run; no recorded projection judgement |
| Gate 4: existing routes and Presets as before | PARTIAL | SMOKE row 9; `29-unit-wide.log`. No shared-runtime diff check in this audit |
| Gate 5: evidence recorded | COVERED / N/A (push) | Logs under `docs/reviews/convexity-hulls/`; push is the handler's step |
| Mutation evidence of task 29 | COVERED | M1 7 failures, M2 5, M3 2. Not mutated: BL l.330-352, SUB l.155 |
| Docs: `GLOSSARY.md`, `docs/capabilities.md`, `docs/current-architecture.md` | handler | Not checked, per brief |

## Summary

Counted from the table: COVERED 31, PARTIAL 9, MISSING 0, one row COVERED / N/A, one row for the handler (the reviewer's own tally said 28 and 8). Real gaps, none blocking: (1) the shared-endpoint explanation of the 8 pairs is unpinned; (2) no arrow-key test for the curve-pair graph; (3) final-scene handoff and exit restore have only browser evidence; (4) no keyboard-only smoke run. Not audited: the contents of `lessonMathNotation.test.ts`, BHG l.119-340 drawing details, BHP numbers.
