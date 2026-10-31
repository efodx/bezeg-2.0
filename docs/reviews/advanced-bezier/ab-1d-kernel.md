# AB-1d evidence: Bézier clipping kernel

Files (new): `src/bezeg/impl/kernels/bezier-clipping.ts`, `src/bezeg/impl/kernels/bezier-clipping.test.ts`. Plan: [AB-1d plan](../../tasks/advanced-bezier/README.md#ab-1d-plan-bezier-clippingts-handler-9-2026-10-31); spec `docs/specs/advanced-bezier-lessons.md` D2 (acceptance 1-5 are kernel-relevant).

## Results (observed)

- `just unit src/bezeg/impl/kernels/bezier-clipping.test.ts`: 45 tests passed (final run, mutations reverted; about 8 s). `npx tsc --noEmit --pretty false`: exit 0. `npx eslint` on both files: no output.
- No contradiction between the plan's rule and the mathematics: the crossing converges quadratically, and the tangent needs 5.4 times the crossing's clips (above the required 3).

## Fixed rule as implemented

Plan rule unchanged: degree 1 to 3 (else `RangeError`), tolerance 1e-6, `maxClips` 200, `maxDepth` 40, shrink threshold 0.8, margin 1e-12 times the scale (largest absolute coordinate of both nets, at least 1). Fat line of the other curve's sub-net (chord direction, else farthest control point, else (1, 0)); band is the min and max signed control-point distance widened by the margin. The clip interval is the min and max t over the distance control points inside the band and over the crossings of every segment with a band line (no orientation test, no `src/compgeo` import). Sub-nets are always cut from the original net for the global range (`subNet` via `subdivide`). Roles alternate after each clip; keep above 0.8 splits the wider global range (A on a tie) at its midpoint into two pairs at depth + 1; pairs run depth first, A's left half first. Reaching `maxClips` turns the current pair and every pair on the stack into `unresolved` (`limit`, reason `clips`); a split past `maxDepth` marks that pair unresolved (reason `depth`) and the run goes on.

Clip count: every clip attempt counts, a discard included, over all pairs (split children included). This is why the offset pair needs 17 here against 7 in the spec's reference script (which counted the root pair's path); counts are recorded against this rule.

## Recorded clip counts (default A = (0,0),(2,4),(4,0))

| Pair | Tolerance 1e-3 | Tolerance 1e-6 | Result |
| --- | --- | --- | --- |
| Crossing, B = (0,3),(2,-1),(4,3) | 17 | 21 | `found`, two merged results at 0.25 and 0.75 on both curves |
| Tangent, B = (0,4),(2,0),(4,4) | 53 | 113 | `found`, one merged result containing 0.5 on both curves |
| Offset, B = (0,4.5),(2,0.5),(4,4.5) | 17 | 17 | `empty` |

Tangent over crossing at 1e-6: 113 / 21 = 5.4 (acceptance 5 needs at least 3). The spec's reference counts were 22/26, 66/122 and 7. At 1e-10 the tangent run stops at the cap or finds the root with at most 200 clips (tested; it never hangs). The crossing scaled by 1e6 gives the same 21 clips.

## Oracles

- Offset hull overlap: B_u's middle control point (2, 0.5) times 2 is (4, 1), strictly inside the triangle (0,0), (8,0), (4,8) (A times 2); `src/compgeo/predicates.ts` `orient` returns 1 for all three edges (test only; the kernel does not import it).
- Resultant reference (test only): for fixed t, the Sylvester determinant (size 2m, m the effective degree of B) of x_A(t) - x_B(s) and y_A(t) - y_B(s) in s; scan of 2000 steps, sign-change bracketing, 60 bisections, s recovered by a 2000-point scan plus golden section and kept when the point distance is below 1e-5 and s lies in [0, 1]. Seeded mulberry32, integer control points in [-8, 8].
  - 200 quadratic pairs (seed 11): 200 checked, 0 `limit`, 92 reference roots, all covered.
  - 200 cubic pairs (seed 23): 200 checked, 0 `limit`, 172 reference roots, all covered.
  - 200 mixed pairs (seed 37; degrees 1/3, 3/1, 2/3, 3/2, 1/2, 2/1, 1/1): 200 checked, 0 `limit`, 109 reference roots, all covered.
  - Covered means: some result or unresolved pair has both ranges containing (t, s) with slack 5 times the tolerance (5e-6); a `limit` run is skipped by the test (none occurred).
- Dense polyline reference: 2000-sample polylines, cell-grid segment crossing, Newton refinement to 1e-13 (slack 5e-6 when it converges, else 2.5e-3 for the raw sample parameters); 90 pairs (quadratic, cubic, quadratic with cubic). All covered.
- Tangential (double) resultant roots give no sign change, so the resultant reference misses them; the tangent oracle test covers one.
- Independent check of the band cut: `bandClipInterval` against Sutherland-Hodgman clipping of a float convex hull on 500 seeded random distance nets (2 to 4 points).

## Test list (45)

D2 oracle pairs (5): crossing, recorded counts and the 3x ratio, tangent merged, offset empty with the exact hull-overlap oracle, uniform scale 1e6. Helpers (7): fat line and distance net, fat-line fallbacks, hand-checked band cuts, band cut against polygon clipping, `subNet` against the curve, merging to a fixed point, scale. Guards (7): margin, original-net extraction, clip cap, tangent at 1e-10, depth limit, discard of an empty interval, merge of adjacent pieces. Degenerate input (5): crossing lines, parallel lines and a missed curve, coincident lines and curves (`limit`), point-like nets, invalid input. Trace (16): fold equals the final result on seven runs (crossing at both tolerances, tangent, offset, capped, coincident, depth-limited), counts monotone and payload keys/ranges on the same seven, stepwise fold, determinism. Random (5): three reference sets, polyline set, reference agreement.

## Mutations (each reverted by hand edit; final run green)

| Guard | Mutation | Failed tests |
| --- | --- | --- |
| Margin | band without `± margin` | 2: "margin keeps a root whose control point lies on the fat line only up to rounding" (A(0) = (4,5) on B through (1,1),(16,21); computed distance -4.4e-16 below the band [0,0]), and the recorded counts |
| Original-net extraction | `subNet(subNet(net, r0, r1), r0, r1)` (range applied twice, a compounding error) | 13 (crossing, counts, tangent, offset, scale, original-net test, cap, merge, point-like, four random sets) |
| Merge | `mergeClipResults` returns its input | 3: tangent single result, merge fixed-point test, adjacent-pieces test |
| Cap | `clipCount > maxClips` (cap off by one) | 3: cap test, coincident curves, point-like net |
| Depth limit | split check replaced by `false` | 1: depth limit test |
| Discard empty | empty interval replaced by `[0, 1]` | 10 (counts, tangent, offset, parallel-line tests, merge, point-like, three random sets) |
| Split choice | always split A | 6 (counts, tangent, offset, three random sets) |

## Decisions and what the graph must know

- Exports for the D2 graph: `bezierFatLine`, `distanceControlPoints`, `bandClipInterval`, `subNet`, `clipBezierPair`, `mergeClipResults`, `clipFold(tolerance)` with `INITIAL_CLIP_STATE`, `foldClipEvent`, `clipScale`, `CLIP_DEFAULTS`. The fat line and the distance net are recomputed by the graph from the ranges in a trace payload (target = the curve clipped by that event) and these helpers; the margin to pass to `bezierFatLine` is `CLIP_MARGIN_FACTOR * clipScale(a, b)`.
- Trace: kinds `phase` (start), `clip`, `discard`, `split`, `output`, `limit`, `done`; `predicateCount` is the running clip count; note keys `start | clipped | discarded | split | found | limitClips | limitDepth | finished` (not yet in any locale catalog). Payload holds the pair id, depth, target, both ranges, the kept fraction, split children and the limit reason; no coordinates. Ranges in a payload are after the event; for `discard` they are the pair's ranges before it was dropped.
- The fold needs the run's tolerance for merging (`clipFold(tolerance)`); the last index of `stateAt` equals `{status, results, unresolved, clipCount}`.
- Hull overlap (step 1 of the lesson) is not computed by the kernel: it needs A6's separating-axis test on real control points ([request in geometry.md](../../feature-streams/geometry.md)).
- Risks: a limit run may report roots that are still unresolved ranges, not roots; the lesson must say a finite run proves nothing. Merging uses bounding ranges, so two close roots within the tolerance would merge into one result.

## Review and acceptance (handler 9, 2026-10-31)

- Mathematical and engineering review (`bezeg-reviewer`, Sonnet, pinned to `3de1d11`): no finding on the band clip, fat-line fallbacks, split/termination/cap, merge, trace fold, resultant reference, or the offset count (a counting-rule difference: the first clip keeps 0.875 > 0.8 and splits; both curves satisfy y = 8u and y = 4.5 − 8u with u = t(1 − t) ≤ 1/4, so `empty` is correct).
- Two low test findings, repaired by the handler: (1) `expectCovered` and the random sets skipped `limit` runs, so coverage by unresolved ranges was never checked there; they now check every run. (2) The cap test passed when results alone covered the root; a new guard compares the unresolved pair ids with the pairs alive (fold of the trace) just before the first cap event, for the crossing and tangent pairs at caps 3, 8, 12 and 30, and checks every true root stays covered. Observed failure: cap emitting only the current pair (`[pair]` instead of `[pair, ...stack.reverse()]`) fails the new guard (and three fold tests); reverted.
- Remaining dependency: the D2 graph (AB-B) waits for A6's separating-axis test on real control points.
