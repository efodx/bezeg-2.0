# CG-B2-6: criterion audit (L3, L4)

Read-only Sonnet audit against [the spec](../../specs/curve-geometry-lessons.md) at `90b048d3`, by handler 50. Totals: 25 rows, 18 covered, 5 partly covered, 2 measured separately, none uncovered. Repairs are listed in [handoff 50](../feature-streams/curves/handler-handoff-50.md).

Files: CCT=src/graphs/curves/comb/curveComb.test.ts, CCG=comb/CurveCombGraphReal.test.tsx, EOT=bezier/EvoluteOverlay.test.ts, CEG=bezier/CurveEvoluteGraphReal.test.tsx, CGL=src/learning/content/curveGeometryGuidedLessons.test.ts, SM=tests/guided-lessons.smoke.spec.cjs

| Criterion | Test | Status |
| --- | --- | --- |
| L3-A1 teeth normal, length gain*abs(kappa), 1e-9 | CCT:39, 58 | covered |
| L3-A2 no tooth straddles a knot; jumps = kernel | CCT:88, 97, 106, 119 | covered |
| L3-A3 C2 kappa continuous, random points | CCT:132 (alpha 0, .5, 1, seeded) | covered |
| L3-A3 C1 jump shown | CCT:151, CGL:465 | covered |
| L3-A4 "C2 implies G2" labelled regular | CGL:508 (both languages) | covered |
| L3-A5 dispose on kind switch / import / unmount (element count) | CCG:133, 177; CGL:571 (cycling, stale elements) | covered. Leaving via a real lesson session (not just unmount) is not tested for comb (L2 has CGL:247-style real session) -> partly |
| L3-A6 dragging measurement | cg-b2-1-comb-measurement.md | measured separately |
| L3-A7 both languages | CGL:434 (sl+en quoted numbers), 465 (en readout), 508; CCG:243 | covered |
| L3 step 1 predict, comb hidden then on | CGL:434 (shown false, curves empty); SM:1902 | covered |
| L3 step 2 gain | CGL:434 (gain 2), 465 ratio; CCG:213 | covered |
| L3 steps 3-5 C1, C2, G1 readouts | CGL:434, 465; SM:1902-1913 | covered |
| L3 step 6 explore | CGL:434, 545 | covered |
| L3 defaults: 64 teeth, existing spline points | CCG:92 (count default); spline points: see reuse row | partly |
| L4-A1 closed form to 1e-9 | EOT:37, 57; CEG:86; CGL:717 | covered |
| L4-A2 normal passes through E / tangent to evolute | EOT:94; CEG:86; CGL:717, 746 | covered |
| L4-A3 kappa=0 omitted, trace breaks | EOT:118, 154, 178; CEG:236; CGL:813 | covered |
| L4-A4 disposal and Reset | CEG:112; CGL:952, 979 | covered. Real lesson-session exit not tested -> partly (same as L3-A5) |
| L4-A5 both languages | CGL:855, 882 | covered |
| L4 steps 1-6 (six scenes, cusp at (0,1/2), S-cubic vertices) | CGL:670, 675, 773, 882; SM:1919 | covered |
| Multi-action scenes in one tick (AGENTS) | CGL:322, 545, 924; CCG:414; CEG:251 | covered |
| Preset round trip, new Demonstrations | CCG:383; CEG:326; curvePresetCollections.test (own fields, bad values) | covered |
| Reused spline graphs unchanged for existing users | C1/C2/G1SplineGraph.tsx: default data moved verbatim into exported functions (git diff 205524da..HEAD, 3 files). No test calls the exported functions or pins the route default against literals. splineContinuity.test.ts:11 holds its own copy of the C2 points, so a drift in the route would not fail it. SM has existing splineC1/C2/G1 rows (unchanged). Collection `type` widened to string or array; string case kept; "still rejects wrong type" test exists (curvePresetCollections.test:62) | partly covered |
| Stored presets and routes unchanged | New keys only (curve-comb, curve-evolute); spline Preset keys and routes untouched; L2 CurvatureBezierCurveGraph refactored (base class), L2 tests pass unmodified per cg-b2-2a. Contract list: graphTransientStateContract.tsx +1 line is for bezier-hulls | covered by diff, no dedicated test |
| Performance items | | measured separately |
| Batch gate: sl/en browser, a11y | cg-b2-3-lesson.md walk, SM rows | covered by walk; layout findings noted there (panel hides curve at 1280x720) |

Vacuous tests: none found. CGL:434 hidden-comb branch asserts empty dataX, mutation-checked per cg-b2-3.

## Repairs after the audit (handler 51)

Four of the five partly covered rows are closed; see [the gate record](cg-b2-6-gate.md). The fifth, stored presets and routes unchanged, stays verified by diff with no dedicated test: the gate accepted that, and the repairs add no stored data.

- L3-A5 and L4-A4: real `LessonSession` exit tests for `curve-comb` and `curve-evolute` in `curveGeometryGuidedLessons.test.ts`.
- L3 defaults and the reused spline row: `splineDefaultPresets.test.ts` pins the exports and each route's `defaultPreset()` to literal points.
