# Graph palette and visual appeal — 2026-11-03

Implementation follow-up: the owner accepted the Voronoi, CLT, B-spline insertion, complex reciprocal and Fourier coefficient refinements. Their implementation and verification are tracked in the [palette refinement release record](../graph-palette-refinement/phase1.md). The observations below preserve the audited pre-fix state.

Three fresh GPT-6 Luna Max reviewers inspected the same **45 finalized lessons** across opening, middle and terminal scenes. Their brief explicitly allowed criticism of fully working graphs. This pass found several concrete candidates for a palette and visual-hierarchy refinement that the earlier defect-oriented audit did not surface.

These are **aesthetic judgments**, with confidence stated below. The strongest findings concern the visual weight of background constructions; the more specific color preferences deserve side-by-side palette experiments before implementation. No app fix was requested or made.

## Six examples to revisit

| Example and scene | What looks weaker | Suggested direction and confidence | Evidence |
| --- | --- | --- | --- |
| **Linear map**, middle, step 3/6 | Dark olive transformed-grid lines spread across the plot over a sage base grid. The lattice becomes the main object while the mapped curve and vectors recede. | Make the grid lighter/thinner and reserve stronger color for the mapped object. **High confidence**, chiefly hierarchy rather than hue harmony. | [Workspace](evidence/curves/linear-map-middle-workspace.png) |
| **Euler method**, middle, step 4/7 frame 1/2 | Hundreds of sage slope marks dominate the cream board and share a color family with a principal green trace. The central solution comparison feels visually small. | Reduce field saturation/weight and give the two solution traces a stronger hierarchy. **Medium-high confidence.** | [Graph](evidence/functions/euler-method-middle.png) |
| **Voronoi**, middle, step 4/7 frame 2/2 | Broad gray-green, dusty-pink and pale-ochre fills produce a somewhat muddy, low-energy wash. The palette is softer than the clear region structure suggests. | Try cleaner region hues/lightness relationships or quieter inactive fills with a distinct active-cell treatment; preserve all boundaries. **Medium confidence**, a genuine palette preference. | [Graph](evidence/geometry/voronoi-middle-graph.png) |
| **Central limit theorem**, middle, step 4/7 frame 2/2 | The olive and dusty-teal curves are similar in hue and weight. The comparison has little visual energy and the two roles are easy to merge perceptually. | Try a clearer comparison hue or dash/weight distinction. Keep mathematically coincident curves coincident. **Medium confidence**; convergence itself is intentional. | [Workspace](evidence/curves/prob-clt-middle-workspace.png) |
| **B-spline insertion**, middle, step 3/6 frame 2/3 | Orange hatching between the control polygon and spline attracts substantial attention. It adds a busy texture to an otherwise restrained construction. | Try a lighter fill or sparser hatching while preserving the explained region. **Medium confidence**: the worker rated it more strongly; the handler considers the educational role and relatively muted orange legitimate. | [Workspace](evidence/curves/bspline-insertion-middle-workspace.png) |
| **Complex reciprocal**, terminal, step 7/7 | Green/blue operands sit beside brown, ochre, violet and teal constructions/results. The compact group reads as many small independent accents. | Test a clearer input/derived-result color family while retaining distinguishable shapes and labels. **Low-to-medium confidence**: several colors already represent legitimate distinct operations. | [Workspace](evidence/curves/complex-reciprocal-final-workspace.png) |

The handler reviewed all ten candidate scenes together and directly opened the Euler middle and complex-reciprocal terminal captures at full size. The final confidence is deliberately lower than the worker's for insertion and reciprocal: those are plausible refinement targets, not established poor designs.

## Additional, lower-priority observations

- **Pascal:** repeated orange construction lines compete with the green conic and blue Pascal line on desktop too. [Scene](evidence/functions/projective-pascal-middle.png). This overlaps the earlier clutter finding.
- **Monotone partition:** heavy olive/brown active edges, a rust diagonal and an ochre sweep/event marker compete. [Scene](evidence/geometry/monotone-partition-middle-graph.png).
- **Segment intersections:** coincident thick strokes create a dark central knot. [Scene](evidence/geometry/segment-intersections-final-graph.png). All four segments participate in the event; any refinement must preserve that simultaneous participation. This overlaps the earlier report.
- **Fourier coefficients:** the layered terminal palette could separate primary and secondary curves more strongly, but this is a mild preference. [Scene](evidence/functions/fourier-coefficients-terminal.png).

## Useful visual references

[B-spline basis](evidence/curves/bspline-basis-middle-workspace.png) shows that several colors can work when their roles remain clear. [B-spline extraction](evidence/curves/bspline-extraction-middle-workspace.png), [pole-polar](evidence/functions/strong-projective-pole-polar-middle.png), [binomial-to-normal](evidence/curves/prob-binomial-normal-middle-workspace.png) and [interval sweep](evidence/geometry/strong-interval-sweep-middle.png) are stronger comparisons for emphasis and color roles. Graph palettes need not all become forest/ochre: DESIGN.md explicitly separates graph colors from the shell palette.

## Coverage and limits

- **Target:** frozen production app d2a3b6465f541c687811692f4ae1b3f720483141, the same finalized scope as the preceding audit. Current task changes documentation only. [Scope, acceptance and dispatch](brief.md).
- **Coverage:** 18 geometry, 14 functions/projective and 13 curves/probability/maps lessons. Reviewers inspected 135 sampled scenes via contact sheets and selected full-size captures. The functions worker captured every navigated frame (252); that larger capture count is not claimed as individual visual-review coverage. All route checks returned HTTP 200.
- **Independence:** workers had fresh contexts, disjoint families and dedicated preview ports. They did not read one another's reports. Cross-family comparison and final prioritization belong to the handler; this is not a three-reviewer vote on every finding.
- **Evidence:** graph screenshots and workspace screenshots have different crops/scales; no uniform visual-scale comparison is claimed. Some viewport screenshots omit the bottom of a tall workspace, so findings link full-workspace captures where appropriate. Temporary screenshot CSS hid only lesson overlays, preserving scene and graph styling.
- **Limits:** desktop Chromium at 1440×1000, qualitative appearance only. No physical projector/touch, color-vision simulation, measured contrast, user preference study or performance measurement. The already unavailable Impeccable engine was not retried; no detector verdict is claimed.
- **Detailed reports:** [geometry](geometry.md), [functions/projective](functions.md), [curves/probability/maps](curves.md). Reviewer rankings and the handler's final confidence can differ.

For a future request, a useful brief is: “Give a candid aesthetic critique of the lesson graphs. Rank the least cohesive palettes across opening, middle and final scenes, including working graphs. Show the exact color combinations, compare them with stronger examples, and distinguish palette preference from readability and visual hierarchy.”
