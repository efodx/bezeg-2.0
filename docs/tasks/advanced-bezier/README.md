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

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| AB-0 | F0 | This plan, ADR 0028, spec marked scheduled | — | done |
| AB-1a | F1 | `degree-reduction.ts` (both objectives) with D1 numbers | — | done ([evidence](../../reviews/advanced-bezier/ab-1a-kernel.md)) |
| AB-1b | F1 | `arc-length.ts` on the curvature kernel's hodograph, PH oracle tests, D3 numbers | CG-1 | done ([evidence](../../reviews/advanced-bezier/ab-1b-kernel.md)); D3 graph splits panels at cusps |
| AB-1c | F1 | `coons.ts` with the bicubic-net identity test | — | done ([evidence](../../reviews/advanced-bezier/ab-1c-kernel.md)); B averages mismatched corners |
| AB-1d | F1 | `bezier-clipping.ts` ([plan](#ab-1d-plan-bezier-clippingts-handler-9-2026-10-31)) | `G-CG` | in progress |
| AB-A-* | F2a–F6 | D1 reduction, D3 arc length | `G-CURVE`, `G-REG`, AB-1a, AB-1b | planned |
| AB-B-* | F2a–F6 | D2 Bézier clipping | Batch A, `G-CG`, AB-1d | planned |
| AB-C-* (rest) | F2a–F6 | D4 Coons patch | Batch A, AB-1c | planned |
| AB-C-2a | F2a | `patch-coons` graph on `BaseSurfaceGraph`: editable cubic boundaries, linked corners, shown surface \(L_c/L_d/B/S\), interior-net readout, corner status, Presets; no route | AB-1c | done ([evidence](../../reviews/advanced-bezier/ab-c-2a-graph.md)) |
