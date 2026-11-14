# Shared movable-point path (M03)

Source: [shell and label polish, recommendation](../../specs/site-walkthrough-shell-polish.md#recommendation-for-the-shared-movable-point-path-m03-waiting-for-the-owner), approved by the owner on 2026-11-14 (both stages). Inventory: [point inventory](../../reviews/site-walkthrough/point-inventory.md). Session: [polish queue](polish.md).

## Stage 1: hover cursor (no visual change)

Every draggable JSXGraph point shows the pointer cursor through `bindMovablePointCursor` (`src/graphs/base/bindMovablePointCursor.ts`), directly or through a shared creator; fixed points do not. No graph writes `style.cursor` itself.

| Batch | Files | Work |
| --- | --- | --- |
| 1a | Every file under `src/graphs` that writes `style.cursor`, except the binding (14 graphs and `JXGRationalBezierCurve.ts`) | Replace the copy with the binding; keep or record any case that is not a movable point. Add the static check. |
| 1b | Graphs with draggable points and no cursor: complex (3), Epicycle, FourierCoefficients, LinearFunction, LinearMap, projective handles (4), Hermite / Interpolation / SubdivisionCurve / BSplineBasis scenes (4) | Bind the cursor where the point is created. |
| 1c | Files the static check flagged that neither batch owned: `base/BaseCurveGraph.tsx`, compgeo `InscribedAngle`, `Inversion`, `PointInPolygon`, `SimsonLine`, `Voronoi` (their extra handles), `linear/compositionBoard.ts`, `eigenBoard.ts`, `iterationBoard.ts`, `patches/parameterInset.ts` | Bind the cursor where the point is created. |

`bindMovablePointCursor` returns a release function. A graph that removes its own point listeners on dispose registers the release with them (the 14 graphs of batch 1a, whose ownership tests count handlers); a graph whose points go with the board may ignore it.

Static check (spec P5): one unit test that reads the sources under `src/graphs` and mounts nothing. It fails on a `style.cursor` write outside the binding, and on a file that registers a drag handler on a point without reaching the binding, unless the file is on an allow-list with a reason.

Acceptance: a real hover in a browser on at least one graph per family gives `pointer` on a draggable point and `default` after leaving it, and nothing on a fixed point; dragging, snapping, state, lesson actions and Presets are unchanged; existing tests of the touched graphs pass.

## Stage 2: math labels (18 graphs)

Point labels that name a mathematical object take the shared label attributes of `createPointStyles`, as the point-set graphs do. Number readouts and captions stay plain; each batch lists what it left and why. One batch per family, each with before and after screenshots reviewed by the handler. Element names that capture recipes, clip rows, tests or Presets address are not renamed. The pattern is `PointSetGraph.createDrawn` with `pointSetLabelMath`: the element keeps its plain `name`, the label takes the shared attributes, and the label text is set to the `$$...$$` form.

Triage (2026-11-14, read-only, over the 36 files with own points or scene texts). No labelled points, nothing to do: LatticePath, ComplexPower, EulerCircle, PhasePortrait, LogisticMap, RecursionCobweb, UnitCircle, ContourMap, LinearProgram, Voronoi's extra handles, and the B-spline, de Boor and parametric scenes (their texts are number readouts). The inventory's "plain labels" for these rows meant captions, which stay plain.

| Batch | Files | Labels | Care |
| --- | --- | --- | --- |
| 2a | compgeo `InscribedAngle`, `SimsonLine`, `Inversion`, `PointInPolygon`, `NotablePoints`, `EulerLine` | `O`, `P`, feet, handle names, `q`, centre symbols | `P′`, `S₁`, `O₂`, `θ` need a LaTeX form; host tests read `name` (keep it) and chip text (leave it) |
| 2b | `lines/LineGeometryGraph`, `trig/TriangleSolverGraph`, `isometry/IsometryGraph` (check handle names), `mechanics/DescentGraph` (point tags) | `P Q R S T O B`, `A B C`, `A′`; texts `ℓ`, `PTₙ`, `a b c`; tags `A`, `B`, `P1`, `P2` | Unicode `ℓ`, `ₙ`, `′`; Descent tags are localized strings |
| 2c | projective `CrossRatio`, `Pascal`, `PolePolar`, `FivePoint`, `ThreeViews` | handles `A` to `F`, images `A′`, `P₁`, `F₁`, `F₂`, `S`, line names `p`, `p′` | subscripts and primes; `P = ∞` text; host tests |
| 2d | curve scenes `InterpolationScene`, `HermiteScene`, `SubdivisionScene` | `P{i}` | scenes get `SceneSettings`, not `this.styles` |

Left for a report: `CircleConstructionGraph` captions (`P`, `A`, `B` are texts whose width a layout test measures) and `KinematicsGraph` arrow texts (`v`, `a`).

Stage 2 should land before package D recaptures the affected graphs.

Outcome (2026-11-14): batches 2a to 2d are done. The owner saw the labels at the display font size and at 75 % of it and chose the compact size. The converted sites use one style, `namedLabel` in `createPointStyles` (`src/graphs/styles/PointStyles.ts`): the shared math label at 75 % of the display font size, with JSXGraph's default anchors and offset so the graphs' existing offsets hold, shown and hidden with its element. `pointLabelMath` (`src/graphs/styles/pointLabelMath.ts`) gives the math form of a plain name. `CircleConstructionGraph` captions and `KinematicsGraph` arrow texts were left; the reason is in the spec under "not converted".
