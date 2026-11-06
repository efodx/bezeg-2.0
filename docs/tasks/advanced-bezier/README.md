# Advanced Bézier topics: implementation tasks

Status: scheduled 2026-10-31 by the [Curves feature stream](../feature-streams/curves.md). Source: [Advanced Bézier topics](../../specs/advanced-bezier-lessons.md). Slice template: [feature streams](../feature-streams/README.md#family-template).

The spec's concept contracts and acceptance criteria are the task acceptance. Evidence goes to `docs/reviews/advanced-bezier/`.

## Decisions (F0, 2026-10-31)

- **ADR** — [ADR 0028](../../adr/0028-advanced-bezier-objectives-and-owners.md): endpoint-fixed and free-endpoint \(L^2\) reduction; clipping on the convexity pair-of-curves graph; cubic-boundary Coons as a bicubic tensor net; arc length in a kernel with the PH `s(t)` as oracle.
- **Ids and routes.** Chapter id `advanced-bezier`. Demonstrations: `reduction` (D1, `/bezeg-2.0/bezier/reduction`), `bezier-clipping` (D2, `/bezeg-2.0/bezier/clipping`), `arc-length-param` (D3, `/bezeg-2.0/bezier/arc-length`), `patch-coons` (D4, `/bezeg-2.0/patches/coons`).
- **Kernels** under `src/bezeg/impl/kernels/`: `degree-reduction.ts`, `bezier-clipping.ts`, `arc-length.ts`, `coons.ts`.
- **Gate reading.** Kernels are ungated except `bezier-clipping.ts` (`G-CG`: it uses the convexity hull predicate). D1/D3 graphs subclass point-controlled curve graphs, so their F2a waits for `G-CURVE`; D4 extends `BaseSurfaceGraph` and is ungated for F2a. Registration and lessons need `G-REG`.
- **D4 graph scene (handler 7, 2026-10-31).** The surface view draws one mesh per scene, so the spec's toggles for \(L_c\), \(L_d\), \(B\) and the result are one choice of the shown surface (default: the Coons patch \(S\)); the four boundary curves are always drawn. The spec asks for shared corners and also a step that breaks one: a "linked corners" switch (on by default) shares each corner between its two boundaries; off, each end point moves alone; switching it back on snaps each corner pair to its average (the kernel's \(B\) rule) as one edit.
- **Terms.** The spec's Slovenian proposals as written (one-shot rule).
- **D4 graph terms and imports (handler 8, 2026-10-31).** "Ruled surface" is not in the spec's term table; *premonosna ploskev* is the established term (sl.wikipedia article "Premonosna ploskev", with its examples hiperbolični paraboloid and prava konoida; no conflicting UL usage found), recorded in `docs/localization.md`. An imported `patch-coons` file whose `linkedCorners` is true but whose corner pairs differ is rejected with `coons_linked_corners_differ` rather than snapped: a silent snap would change the stored geometry, while relinking in the app snaps as one visible edit.

## AB-1d plan: `bezier-clipping.ts` (handler 9, 2026-10-31)

**What `G-CG` provides and what it does not.** Batch 0 delivered exact predicates on integer `GridPoint`s (ADR 0021), the point-set graph and the step-trace contract (`src/compgeo/trace.ts`). The separating-axis test and the pair-of-curves graph are convexity A6 (Batch 3), not built. Clipping works on control points obtained by subdivision, which are off the grid, so `orient` rejects them, and `orientExactDyadic` is teaching-only by ADR 0021. The hull reuse ADR 0028 names is therefore read as follows:

- **Hull ∩ band without a hull build.** The clipped range is the \(t\)-projection of \(\operatorname{conv}\{(i/m, d_i)\}\cap\{d_{\min}-\delta\le d\le d_{\max}+\delta\}\). That set is convex, so its projection is an interval whose ends are attained at its vertices. Each vertex is either a control point inside the band or the crossing of a hull edge with a band line. Every point \((i/m,d_i)\) in the band and every crossing of a segment \(P_iP_j\) with a band line lies in the set. So the minimum and maximum \(t\) over all these candidates (\(m\le3\): at most 6 segments) equal the interval exactly, with no orientation sign decided. No `src/compgeo` predicate is called and ADR 0021 is not touched.
- **Trace reuse.** The kernel returns a `Trace` (`src/compgeo/trace.ts`) of clip events, folded with `stateAt`, so D2's Next/Play/Reset follow the convexity step model. Payloads hold parameter ranges and pair ids, not coordinates; the graph recomputes fat lines and distance nets with the kernel's exported helpers.
- **Hull overlap (step 1, status "overlapping", the no-intersection pair).** That is A6's separating-axis test, and it must accept real control points. The request is recorded in [geometry.md](../feature-streams/geometry.md). AB-1d checks the overlap claims with a test-only oracle. **The AB-B graph waits for A6** (spec Batch B already names the A6 graph and test).

**Fixed rule** (counts are recorded against it; spec counts are guidance):
- Input: two 2D nets of degree 1 to 3. Higher degree, fewer than 2 points and non-finite coordinates throw `RangeError`. Options: `tolerance` \(10^{-6}\), `maxClips` 200, `maxDepth` 40, shrink threshold 0.8, margin \(\delta=10^{-12}\cdot s\), where \(s\) is the largest absolute control coordinate of both inputs (at least 1).
- Fat line of the clipping curve: the direction of the chord \(P_n-P_0\). When the chord is shorter than \(\delta\), use the vector to the farthest control point; when that is also shorter, use \((1,0)\). Use unit-normal signed distances; the band is \([\min d_i,\max d_i]\), always valid.
- Each clip maps the clipped \([u_0,u_1]\) back to the curve's global range. Sub-nets are always extracted from the **original** net for the current global range, not compounded. An empty interval discards the pair.
- Roles alternate after each clip. When a clip keeps more than 0.8 of the width, the curve with the wider global range is split at its midpoint into two pairs at depth + 1. Pairs are processed depth-first, A's left half first, so runs are deterministic.
- A pair is a result when both global widths are at most `tolerance`. Results whose A ranges and B ranges both overlap or touch within `tolerance` merge into one.
- Status: `empty` (everything discarded), `found` (results, no limit hit), `limit` (clip cap or depth limit hit). With `limit`, unresolved pairs are returned with the results, so no range that is still alive is lost.

**Oracle tests** (spec D2 acceptance 1–5):
- A6 crossing pair: \(t=0.25, 0.75\) on both curves, within tolerance, as two merged results.
- Tangent pair: \(t=\tfrac12\) inside a result, or status `limit`. Its clips at \(10^{-6}\) are at least three times the crossing's.
- Offset pair: `empty`, with the hull overlap shown by the test oracle.
- Seeded random integer quadratic and cubic pairs, cross-checked with two references: a Sylvester-resultant reference (\(R(t)\) evaluated numerically, sign-change bracketing and bisection, \(s\) recovered and filtered to \([0,1]\)) and dense polyline sampling. Every reference root lies in a returned interval, or the status is `limit`.
- Degenerate inputs terminate: lines, a point-like net, coincident curves (`limit`, never a hang).
- The cap and the depth limit are honored. The trace fold reproduces the final state.
- Each guard has an observed mutation failure, including a removed margin and a compounding sub-net.

## Batch A plan: D1 and D3 (handler 58, 2026-11-06)

`G-CURVE` and `G-REG` are open. The D1 and D3 graphs share no code, so they run as parallel slices. Graph code lives in its own folder, one Preset collection and one locale block each.

**D1 `reduction`** (`src/graphs/curves/reduction/`, on `BaseBezierCurveGraph`, the `ElevationGraph` pattern):

- The curve is a cubic and stays one: no degree change, and a Preset with another point count is rejected with an actionable error. The spec's steps need elevation only as a starting position, so step 1 opens on the elevated quadratic \((0,0),(	frac43,	frac83),(	frac83,	frac83),(4,0)\), which is also the graph's default scene. Built-in Presets do not exist, so \(P\) and \(P_2\) arrive through lesson scenes.
- State: `reductionMode` (`fixed` or `free`, stored), `reductionShown` (quadratic and its control points), `reductionElevationShown` (the elevated net). Presets store the control points and the mode.
- Readouts: third difference, reducibility with its tolerance, maximum error, \(L^2\) error and control-point bound, each from the AB-1a kernel. Maximum error shows at most 4 decimals (it is sampled).

**D3 `arc-length-param`** (`src/graphs/curves/arclength/`, on `BaseCurveGraph`, the `CurveOffsetGraph` two-kind pattern):

- Kinds `bezier` (default cubic \(Q\)) and `ph` (the spec's PH cubic), read from the live curve as in `CurveOffsetGraph`. The PH curve is fixed, as on the offset route.
- State: `arcPieces` \(N\), `arcEqualTShown`, `arcEqualArcShown`, `arcSpeedPlotShown`, `arcMoverMode` (`parameter` or `arc`).
- A moving point with Play and Pause, advanced by a frame loop the graph owns and disposes. A slider gives the same position by hand. Under reduced motion Play does not animate.
- The speed plot is an inspector SVG written imperatively, as `SpeedFactorPlot` does, so a drag renders no React.
- Readouts: \(L\) with its quadrature setting; for PH the exact \(s(1)\), labelled exact; the chord and polygon bracket; both chord ratios; the polyline error at \(N\), labelled an illustration; the cusp status.

**Terms.** The spec's table as written; *naravna parametrizacija* in the route title, *nižanje stopnje* for D1 (one-shot rule).

**Order.** 2a and 2c in parallel, then 2b and 2d registration (`lesson: false`), then 3a and 3b lessons, then the chapter, media and gate. Family 5's chapter owns D1, D3 and D4 from AB-A-4, and D2 joins with Batch B. D4's lesson moves from its interim owner there.

## Batch B plan: D2 (handler 62, 2026-11-06)

Convexity A6 is on `master`: `hullsSeparated` (`src/compgeo/hullSeparation.ts`) takes real control points and `CurvePairGraph` is the base class. The Geometry stream is complete, so its files are free to change.

**One lifecycle, not two.** `BezierHullsGraph` holds about 200 lines of step state, `IterationController` wiring, Preset step handling and disposal that D2 needs unchanged. AB-B-1 lifts them into a `TraceCurvePairGraph` between `CurvePairGraph` and `BezierHullsGraph`, behaviour unchanged and its tests untouched. Copying them would leave two versions of the code that has to stop playback on every path.

**D2 `bezier-clipping`** (`src/graphs/compgeo/BezierClippingGraph.tsx`, its own key in `compgeoPresetCollections.ts` as Geometry handler 53 asks, route `/bezeg-2.0/bezier/clipping`):

- State: the model, `step`, and `clipToleranceExponent`, an integer \(3\) to \(10\) for \(10^{-k}\), default \(6\). The spec's tolerance field is a select of these eight values, so no invalid entry exists. Presets store all three; another degree than 2 or 3 is refused by `CurvePairGraph`.
- The run is `clipBezierPair` of the two nets at that tolerance, with the kernel's cap and depth, recomputed only when the points or the tolerance change. Any such change returns the step to 0 and pauses (acceptance 7). The drawn state is always the fold of the trace, with the tolerance passed to `clipFold`.
- Overlays: `fatLine` (the band around the clipping curve's current sub-net, from `bezierFatLine`), `kept` (the alive ranges of both curves, thick) and `discarded` (faded). A range is drawn from `subNet` of the original net. A and B stay solid and dashed, so colour is never the only difference.
- The distance inset is an inspector SVG written imperatively, as `ArcSpeedPlot` does: the points `distanceControlPoints`, their hull, the band, the clipped range. A drag renders no React.
- The interval table lists the alive pairs and the results with both ranges, and stays bounded: at most eight rows and a "further \(n\)" row, as a limit run has many pieces.
- Status: `overlapping` before the first clip when `hullsSeparated` finds no separation, `separated` when it does, then the kernel's `running`, `found`, `empty`, `limit`. The readout gives the clip count and the widest alive width.
- The offset pair \(B=(0,4.5),(2,0.5),(4,4.5)\) needs `gridStepExponent` \(-1\). A lesson action loads a whole model, so the numbers on screen are the spec's; the doubled-grid twin of `bezier-hulls` is not used.

**Slices** are in the table below. The lesson uses the term table's *Bézierovo rezanje* and *debela premica*, one-shot.

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| AB-0 | F0 | This plan, ADR 0028, spec marked scheduled | — | done |
| AB-1a | F1 | `degree-reduction.ts` (both objectives) with D1 numbers | — | done ([evidence](../../reviews/advanced-bezier/ab-1a-kernel.md)) |
| AB-1b | F1 | `arc-length.ts` on the curvature kernel's hodograph, PH oracle tests, D3 numbers | CG-1 | done ([evidence](../../reviews/advanced-bezier/ab-1b-kernel.md)); D3 graph splits panels at cusps |
| AB-1c | F1 | `coons.ts` with the bicubic-net identity test | — | done ([evidence](../../reviews/advanced-bezier/ab-1c-kernel.md)); B averages mismatched corners |
| AB-1d | F1 | `bezier-clipping.ts` ([plan](#ab-1d-plan-bezier-clippingts-handler-9-2026-10-31)) | `G-CG` | done ([evidence](../../reviews/advanced-bezier/ab-1d-kernel.md)); hull overlap waits for convexity A6 |
| AB-A-2a | F2a | D1 `reduction` graph, overlay, readouts, Preset collection, lesson action targets; no route | AB-1a | done ([evidence](../../reviews/advanced-bezier/ab-a-2-graphs.md)); browser check with registration |
| AB-A-2b | F2b | D1 registration `/bezeg-2.0/bezier/reduction`, `lesson: false`, recipe not run | AB-A-2a | done (handler 59, `just check`) |
| AB-A-2c | F2a | D3 `arc-length-param` graph, marks, speed plot, moving point, readouts, Preset collection, lesson action targets; no route | AB-1b | done ([evidence](../../reviews/advanced-bezier/ab-a-2-graphs.md)); browser check with registration |
| AB-A-2d | F2b | D3 registration `/bezeg-2.0/bezier/arc-length`, `lesson: false`, recipe not run | AB-A-2c | done (handler 59, `just check`) |
| AB-A-3a | F3 | D1 guided lesson (seven steps) | AB-A-2b | done ([record](../../reviews/advanced-bezier/ab-a-3-lessons.md)) |
| AB-A-3b | F3 | D3 guided lesson (seven steps) | AB-A-2d | done ([record](../../reviews/advanced-bezier/ab-a-3-lessons.md)) |
| AB-A-4 | F4 | Chapter `advanced-bezier` owning D1, D3 and D4 | AB-A-3a, AB-A-3b | done ([record](../../reviews/advanced-bezier/ab-a-4-chapter.md)) |
| AB-A-5 | F5 | Cards and posters of `reduction`, `arc-length-param`, `patch-coons` if pending | AB-A-4 | done ([record](../../reviews/advanced-bezier/ab-a-5-media.md)) |
| AB-A-6 | F6 | Batch A gate | AB-A-5 | planned |
| AB-B-1 | F2a | `TraceCurvePairGraph` lifted from `BezierHullsGraph`, behaviour unchanged | Batch A | planned |
| AB-B-2a | F2a | D2 `bezier-clipping` graph, overlays, inset, table, status, tolerance, Presets, lesson action targets; no route | AB-B-1, AB-1d | planned |
| AB-B-2b | F2b | D2 registration `/bezeg-2.0/bezier/clipping`, `lesson: false`, recipe not run, drag measurement | AB-B-2a | planned |
| AB-B-3 | F3 | D2 guided lesson (eight steps) | AB-B-2b | planned |
| AB-B-4 | F4 | D2 section in chapter `advanced-bezier` | AB-B-3 | planned |
| AB-B-5 | F5 | Card and poster of `bezier-clipping` | AB-B-4 | planned |
| AB-B-6 | F6 | Batch B gate | AB-B-5 | planned |
| AB-C-* (rest) | F2a–F6 | D4 Coons patch | Batch A, AB-1c | planned |
| AB-C-2a | F2a | `patch-coons` graph on `BaseSurfaceGraph`: editable cubic boundaries, linked corners, shown surface \(L_c/L_d/B/S\), interior-net readout, corner status, Presets; no route | AB-1c | done ([evidence](../../reviews/advanced-bezier/ab-c-2a-graph.md)) |
| AB-C-3 | F3 | D4 guided lesson (seven steps), `coons` lesson action kind, registration with interim owner `bezier-curves/geometric-properties`, smoke row | AB-C-2a | done ([evidence](../../reviews/advanced-bezier/ab-c-3-lesson.md)); chapter link stays with F4 |
