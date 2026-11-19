# Splines control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Teach a join through its neighbouring segments. Identify free and computed points and preserve the existing ownership of each. Keep exact point access next to the manipulation cue.

**Implementation order.** Start with the audited symmetric C¹ spline, then compare the one-sided and symmetric cases.

<a id="spline-cn"></a>

## One-sided Cⁿ spline

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/spline/spline) · [CnSplineGraph](../../../src/graphs/curves/spline/CnSplineGraph.tsx)

- **First task.** Put continuity order beside the join it affects. Start by moving one free point of the spline.
- **Other controls.** Group degree and exact coordinates, retaining the existing restrictions between degree and continuity order.
- **Acceptance.** A free-point edit updates the dependent construction across a join. Valid order changes remain available with their bound reasons.

<a id="spline-c1"></a>

## Symmetric C¹ spline

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/spline/c1spline) · [C1SplineGraph](../../../src/graphs/curves/spline/C1SplineGraph.tsx)

- **First task.** Identify a free handle near the join and invite a drag while the adjoining segments are visible.
- **Other controls.** Group point coordinates and curve selection after the join experiment.
- **Acceptance.** Moving the handle changes both sides as constrained and preserves the shared first derivative.

<a id="spline-c2"></a>

## Symmetric C² spline

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/spline/c2spline) · [C2SplineGraph](../../../src/graphs/curves/spline/C2SplineGraph.tsx)

- **First task.** Lead with one free-point drag and highlight the computed points on either side of the join.
- **Other controls.** Group exact coordinates and construction overlays. Distinguish free points from calculated ones.
- **Acceptance.** The adjacent pieces update together and preserve both first- and second-derivative continuity at the join.

<a id="spline-g1"></a>

## One-sided G¹ spline

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/spline/g1spline) · [G1SplineGraph](../../../src/graphs/curves/spline/G1SplineGraph.tsx)

- **First task.** Lead with a join scale parameter and the handle it affects. Compare two allowed values.
- **Other controls.** Group the remaining join parameters and exact point entry by join.
- **Acceptance.** Tangent directions still agree at a regular join while a scale change alters the handle spacing.

<a id="spline-g1-symmetric"></a>

## Symmetric G¹ spline

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/spline/g1-sym-spline) · [G1SymmetricSplineGraph](../../../src/graphs/curves/spline/G1SymmetricSplineGraph.tsx)

- **First task.** Keep the two sides of the chosen join visible. Vary one join parameter at a time.
- **Other controls.** Group other join parameters and exact point coordinates after the comparison.
- **Acceptance.** The changed side is identifiable and the common tangent line is preserved at a regular join.
