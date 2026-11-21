# Lesson graphs: label collisions

Status: implemented (lesson-card-layout stream, handlers 5 and 6, 2026-11-21); results and open items under [Results](#results-2026-11-21).

Source: section 7 of the [lesson bug crawl triage](../reviews/lesson-bug-crawl/triage.md) ("overlapping point labels"), in the owner's scope for this stream since [handoff 1](../reviews/lesson-card-layout/handler-handoff-1.md). The framing half of section 7 was done by the first slice.

## Goal

On the twelve listed lesson frames, and on the same graphs opened on their own route, every board label can be read: it does not sit on another label, on an axis number or on another point's marker, and fewer drawn lines run through it. No point, curve, value or name changes; only where a label is drawn.

## Blocker triage (2026-11-20, master at f3fee9ee)

Each frame was opened on the production build with `node scripts/lesson-crawl/label-collisions.cjs`, which lists two things per frame: **pairs** (a label's box overlapping another label, an axis tick label, or a marker that is not its own point, by more than 2 px each way) and **crossings** (a drawn stroke running through a label's box). Columns: pairs/crossings in the lesson frame at 1440×900, on the bare route at 1440×900, and in the lesson frame at 390×844. Screenshots: `.shots/labels/before/` (untracked).

| ID | Crawl row | Graph and frame | Lesson | Route | Phone | State |
| --- | --- | --- | --- | --- | --- | --- |
| LC-1a | 351 | De Casteljau, parameter activity, frame 2 of 2 | 1 / 11 | 1 / 7 | 1 / 15 | Present, changed: the reviewer read each `p_i^r` as two stacked labels; it is one label. The defect is the scheme labels lying on their own segments and the curve, and `p_1^2` on the marker of `p_2^0` and the tick "3" |
| LC-1b | 354 | De Casteljau, interpolation activity, frame 2 of 2 | 1 / 11 | 1 / 7 | 1 / 15 | Same scene as LC-1a |
| LC-1c | 359 | Subdivision, step 2 frame 2 | 0 / 6 | 0 / 4 | 3 / 10 | Present: `p_0^1` on the polygon leg and the curve, `p_1^2` on the y axis |
| LC-1d | 597 | Rational De Casteljau, step 1 frame 4 | 2 / 1 | 0 / 4 | 1 / 3 | Present: `p_0^1` and `p_1^1` on the ticks "−2" and "2" |
| LC-2 | 577 | Cross-ratio, step 2 frame 2 | 4 / 2 | 4 / 2 | 23 / 4 | Present: A on A′, C′ on D′, M and N on other markers |
| LC-3 | 580 | Conic through five points, step 2 frame 2 | 2 / 4 | 2 / 4 | 7 / 6 | Present: F₁ on A; F₂ and S on the arc, S on D's marker |
| LC-4 | 657 | Monotone triangulation, step 2 frame 2 | 7 / 11 | 0 / 2 | 7 / 12 | Present: each chain label starts on its own marker, so its first letter is hidden; "v1 spodnje oglišče" lies on the axis and two edges |
| LC-5 | 658 | Segment intersections, step 2 frame 2 | 1 / 2 | 1 / 2 | 1 / 5 | Present: s₁ on s₂ (both midpoints are next to the intersection) |
| LC-6 | 522 | Linear map, trace–determinant, step 2 frame 2 | 2 / 4 | 1 / 10 | 4 / 6 | Present: "trikotnik stabilnosti" on "(τ, δ)", the tick "2" and the parabola |
| LC-7 | 531 | Fastest descent, drag the track, step 2 frame 2 | 7 / 8 | 0 / 1 | 25 / 9 | Present: "Cikloida" and "Premica" on the P1 text, "Tir" and the P2 text on each other and on markers. The route opens in another mode, which is clean |
| LC-8 | 696 | Triangle solver, cosine rule, step 2 frame 2 | 1 / 0 | 0 / 0 | 0 / 0 | Present: side name a on the tick "2" (side BC lies on the y axis) |
| LC-9 | triage text | PH quintic, step 2 frame 1 | 3 / 4 | 0 / 1 | 11 / 3 | Present, changed: at this frame the large `B(1/2)` label covers p₃, the marker and the tick "0,5"; the triage named p₂ on a tick |

Totals: 31 pairs and 64 crossings in the lesson frames, 10 and 44 on the routes, 84 and 88 at phone size.

Blockers found:

- **A shared placement exists.** `src/graphs/legend/boardLabelPlacement.ts` (`placeLpLabels`, `sampleLine`) places text boxes in pixels clear of markers, sampled lines, axis strips and earlier boxes; the linear program, line geometry, circle construction, isometry, waves and kinematics graphs use it, each with a `*Labels.test.tsx`. The graphs of this spec use fixed offsets instead. No new placement engine is written.
- **The De Casteljau construction animates.** A placement that picks the best of several spots on every update makes labels hop while `t` runs. The shared placement gets one additive option for this (below).
- **Density.** In LC-1a the label of `p_1^2` (22×26 px) sits in a 30 px gap between its segment and the corner `p_2^0`. Zero crossings is not reachable at the display font size; zero pairs is.
- **Graph character pilots.** `origin/codex/graph-character-pilots` (not on master) changes `AbstractJXGBezierCurve.generateLineSegments` (a result marker) and the `tagText` calls of `DescentGraph`. It has not returned. LC-1 and LC-7 keep their edits out of those lines where they can, and the overlap is recorded for whoever returns the pilots.

## Decisions

**Shared rule.** A label keeps its element, name, typeface, size and colour. A graph whose labelled points move takes its label positions from `placeLpLabels`, following `CircleConstructionGraph.labelBoxes()` and `LineGeometryGraph.labelBoxes()`: the items are the labels in priority order with measured or estimated boxes, the markers are every drawn point, the samples are the drawn lines and curves, the strips are the axis tick labels. The result is memoised for one board state, so the label attributes of one update share one computation, and the memo is cleared when the scene is replaced or the graph is disposed. A JSXGraph point label is positioned with `anchorX: "middle"`, `anchorY: "middle"` and an `offset` function that returns the placed box's centre minus the point's pixel position; a free text is positioned at the box centre as the model graphs do. A graph with a fixed constellation, or one label, may use a simpler rule when the rule is stated here.

**Closeness outranks thin lines** (added 2026-11-20 after the first renders). The first placements removed every overlap and sent some names 45 px from their points, where they read as names of a neighbour (`p_1^2` beside `p_2^0`; C′ above B′; S and D side by side). A name therefore stays within about 16 px of its own marker whenever a spot there is free of other names, other markers and tick labels, even when a thin drawn line runs through it, and goes farther (at most 40 px) only when there is none. A name is nearer to its own marker than to any other; two markers closer than 16 px get their names on opposite sides of the pair.

**Shared file.** `src/graphs/legend/boardLabelPlacement.ts` has one owner in this slice, the LC-1 worker, and two additive options. `LabelItem.prefer` is the offset of the box the label had on the previous update: the preferred box is a candidate with a rank bonus (24), so a label stays where it was until that spot costs a marker, a label, an axis or about six line samples more than the best other spot. `LayoutContext.sampleCost` is the cost of one line sample inside a box (default 4, the earlier constant): a graph that applies the closeness rule passes a lower value. Existing callers pass neither and are unchanged.

**LC-1 De Casteljau scheme labels** (`src/graphs/styles/PointStyles.ts`, `src/graphs/curves/object/AbstractJXGBezierCurve.ts`). On boards at least 480 px wide the labels of the scheme points `p_i^r`, `r ≥ 1`, take their offsets from the shared placement with `prefer`: items from the result point down to level 1, markers = control points and scheme points, samples = control polygon, scheme segments and the curve, strips = axis tick labels. Control point labels (level 0) keep their place and are passed as occupied boxes. Boards under 480 px keep `decasteljauLabelLayout`. The label of a point is unchanged in text and size. The cost of one update with the scheme shown is measured for 5 and 9 control points before and after.

**LC-2 cross-ratio, LC-3 five points** (`src/graphs/projective/`). Point labels take offsets from the shared placement: handles first, then derived points; samples = the two lines and the projection rays (cross-ratio), the conic, its tangents and the arc (five points).

**LC-4 monotone triangulation** (`src/graphs/compgeo/MonotoneTriangulationGraph.tsx`). A chain label starts clear of its marker (the marker's half size plus 4 px). The chain labels and the vertex names go through the shared placement with the polygon edges, diagonals and the sweep line as samples.

**LC-5 segment intersections.** A segment's name sits beside the segment at the candidate parameter (0,5, then 0,3, 0,7, 0,2, 0,8) farthest from every intersection with another segment and from the names already placed, on the side with fewer line samples.

**LC-6 trace–determinant** (`src/graphs/linear/iterationBoard.ts`). The triangle's name leaves the top edge: it is placed with the graph's own label layout among the handle label "(τ, δ)", the parabola, the triangle and the tick labels, so the two texts do not meet in the opening frame or while the handle is dragged through the triangle.

**LC-7 drag the track** (`src/graphs/mechanics/DescentGraph.tsx`). In track mode the three curve names and the texts of A, B, P1 and P2 go through the shared placement (handle texts first, then curve names with alternative anchors along their curve). The other modes keep their offsets. The fixed frame stays (kept by design).

**LC-8 triangle solver.** A side name stays on the outer side of its side and slides along it, within the middle half, to the nearest position whose box is clear of the axis tick labels.

**LC-9 PH quintic.** The `B(t)` label of the curve point (`AbstractJXGPointControlledCurve`) and the control point labels are checked in the frame and placed clear of each other, the markers and the ticks. The fraction keeps its size relative to the other labels (it is drawn larger than they are today).

## Acceptance

1. `node scripts/lesson-crawl/label-collisions.cjs --only <ID>` reports 0 pairs for the item's lesson frame at 1440×900 and on its route (`--route`), and no more crossings than before in either.
2. At 390×844 (`--vp 390x844`) the item's pairs and crossings do not rise; where the item's graph uses the shared placement at that width, pairs fall.
3. A unit test per graph in the pattern of `LineGeometryLabels.test.tsx` asserts for the lesson's scene and one other constellation that no two label boxes overlap and none covers a marker; each new assertion is seen failing on the old placement.
4. No mathematical output changes: existing tests of the graph pass unchanged, and no point, curve or readout moves in the before/after screenshots.
5. Labels have explicit ownership: no board object survives scene replacement or disposal (the graph's existing lifecycle tests pass; a memo holds no board reference after disposal).
6. LC-1: the update cost with the scheme shown is reported for 5 and 9 control points, before and after; playback of `t` shows no label hopping on consecutive frames while its spot is free.
7. Each changed graph is looked at in a screenshot of its lesson frame and of its own route.

## Verification

Per item: the graph's unit tests through `just unit <files>`, `just typecheck`, `just lint`, the measurement above against a preview of the changed build, and `just smoke-lesson <lesson id>` for the item's lesson. For the slice: `just check-changed origin/master` and the lesson smoke rows of every changed graph.

## Out of scope

- Control point labels of the curve family outside the De Casteljau scheme (they lie on their polygon legs on many routes; changing them moves labels on every curve graph).
- Other frames and other graphs. The measurement can be pointed at more frames later.
- Drag-the-track's fixed frame and the shared frames of rosettes and lattice paths (kept by design).
- The two names of one vertex in monotone triangulation (P₂ and v2).

## Results (2026-11-21)

Measured on the production build of b9e4212d with `label-collisions.cjs` (pairs/crossings; lesson frame 1440×900, route 1440×900, lesson frame 390×844; baseline in brackets):

| ID | Lesson | Route | Phone |
| --- | --- | --- | --- |
| LC-1a, 1b | 0/3 (1/11) | 0/3 (1/7) | 1/15 (1/15) |
| LC-1c | 0/2 (0/6) | 0/2 (0/4) | 3/10 (3/10) |
| LC-1d | 0/1 (2/1) | 0/2 (0/4) | 1/3 (1/3) |
| LC-2 | 0/1 (4/2) | 0/1 (4/2) | 0/2 (23/4) |
| LC-3 | 0/0 (2/4) | 0/0 (2/4) | 1/1 (7/6) |
| LC-4 | 0/1 (7/11) | 0/2 (0/2) | 1/4 (7/12) |
| LC-5 | 0/1 (1/2) | 0/1 (1/2) | 0/0 (1/5) |
| LC-6 | 0/1 (2/4) | 1/10 (1/10) | 3/4 (4/6) |
| LC-7 | 0/3 (7/8) | 0/1 (0/1) | 7/0 (25/9) |
| LC-8 | 0/0 (1/0) | 0/0 (0/0) | 0/0 (0/0) |
| LC-9 | 0/2 (3/4) | 0/1 (0/1) | 5/2 (11/3) |

Totals: lesson frames 0 pairs and 18 crossings (from 31 and 64), routes 1 and 26 (from 10 and 44), phone 23 and 56 (from 84 and 88).

- LC-6 route: the bare route opens in the composition mode, not the trace–determinant plane; its one pair is the tick 2 against the composition text \(a_2=Ae_2\), outside this item. In the trace–determinant mode on the route a drag through 18 handle positions gave no overlap.
- LC-1 phone is unchanged by decision (boards under 480 px keep the compact layout).
- Phone leftovers: LC-7 "Tir" and the P1 text, captions on tick labels; LC-9 \(B(	frac12)\) on the \(p_2\)/\(p_3\) labels (no free spot within 40 px on a 364 px board; the measured box of the fraction would place it, but the PH label test measures with the written-out estimate, so the change was reverted, see 13fceb12); LC-6 the triangle's name keeps the spot that covers the fewest axis numbers.
- Shared placement changes made on the way: `placeNames` falls back to the spot on the fewest blocks and tick labels; the curve point label is keyed on the curve version and takes extra obstacles from its graph (`setEvaluationObstacles`).
- Not changed (out of scope, seen): the rational weights \(w_i = 1.00\) are written with a decimal point and lie on the polygon in LC-1d; control point labels on their polygon legs.
