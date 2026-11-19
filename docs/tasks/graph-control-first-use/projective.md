# Projective geometry of conics control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Keep the source construction and projected result identifiable. Put exact coordinates and algebra in a named section and keep infinity, degeneracy or undefined status visible when it occurs.

**Implementation order.** Start with audited Cross-ratio, then apply the source/image distinction to the conic routes.

<a id="projective-cross-ratio"></a>

## Cross-ratio and central projection

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/projective/cross-ratio) · [CrossRatioGraph](../../../src/graphs/projective/CrossRatioGraph.tsx)

- **First task.** Move one source point or the projection centre and keep the source and image cross-ratios side by side.
- **Other controls.** Group the exact point coordinates and decimal expansions under precision and calculations.
- **Acceptance.** For a defined projection the two ratios agree as distances on the two lines change. Degenerate states retain their explanations.

<a id="projective-pascal"></a>

## Pascal's and Pappus's theorems

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/projective/pascal) · [PascalGraph](../../../src/graphs/projective/PascalGraph.tsx)

- **First task.** Move one of six points along the conic and follow the three opposite-side intersections.
- **Other controls.** Group exact point values, individual side lines and derivation below the construction.
- **Acceptance.** For a nondegenerate configuration the three intersections lie on the Pascal line as the point moves.

<a id="projective-pole-polar"></a>

## Pole and polar

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/projective/pole-polar) · [PolePolarGraph](../../../src/graphs/projective/PolePolarGraph.tsx)

- **First task.** Move P from outside a conic onto it and watch its polar and contact points.
- **Other controls.** Group conic choice and exact point/polar data below the movable point. Keep the tangent case identifiable.
- **Acceptance.** At a regular point on the conic the polar coincides with the tangent. The number of real contact points changes appropriately across the boundary.

<a id="projective-five-point"></a>

## Conic through five points

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/projective/five-point) · [FivePointGraph](../../../src/graphs/projective/FivePointGraph.tsx)

- **First task.** Move one of the five defining points and follow the fitted conic through the other four.
- **Other controls.** Group point coordinates and equation details under exact construction. Keep degeneracy status visible.
- **Acceptance.** In a general-position example the updated conic passes through all five points. A special configuration produces its documented classification.

<a id="projective-three-views"></a>

## One conic, three views

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/projective/three-views) · [ThreeViewsGraph](../../../src/graphs/projective/ThreeViewsGraph.tsx)

- **First task.** Lead with the height of line L. Move it across the examples that change the projected conic type.
- **Other controls.** Group exact projective coordinates and detailed construction readouts after the classification.
- **Acceptance.** Across the supported positions the displayed conic type and construction change consistently, including the parabolic transition.
