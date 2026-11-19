# Maps of the plane control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Keep source and image visually distinct. Preserve prediction-before-reveal flows where they already exist. Retain matrix entries in their mathematical rows and columns and complex coordinates in their own axes.

**Implementation order.** Start with audited Linear map, then cover the complex-plane operations and reflections.

<a id="linear-map"></a>

## Linear map

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/linear-map) · [LinearMapGraph](../../../src/graphs/linear/LinearMapGraph.tsx)

- **First task.** Move a basis vector and watch the image of the unit square. Keep a named matrix example nearby.
- **Other controls.** Group exact matrix cells in their original two-by-two grid and keep optional test shapes together.
- **Acceptance.** Changing the first matrix column moves the first basis image to those coordinates. Returning to identity restores the original square.

<a id="complex-reciprocal"></a>

## Reciprocal and circle inversion

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/complex-reciprocal) · [ComplexReciprocalGraph](../../../src/graphs/complex/ComplexReciprocalGraph.tsx)

- **First task.** Place z outside the unit circle, predict the reciprocal, then reveal it.
- **Other controls.** Group exact coordinates and comparison examples below the reveal. Keep the zero-domain message beside the experiment.
- **Acceptance.** For nonzero z outside the circle, its reciprocal lies inside. At zero the graph reports that the reciprocal is undefined.

<a id="complex-roots"></a>

## nth root

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/complex-roots) · [ComplexRootsGraph](../../../src/graphs/complex/ComplexRootsGraph.tsx)

- **First task.** Choose a nonzero target and degree, predict the root positions, then reveal the roots.
- **Other controls.** Group exact target coordinates and the polygon overlay under the construction.
- **Acceptance.** For degree greater than one the roots of a nonzero target lie at equal angular intervals. Their powers recover the target.

<a id="complex-power"></a>

## De Moivre's formula

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/complex-power) · [ComplexPowerGraph](../../../src/graphs/complex/ComplexPowerGraph.tsx)

- **First task.** Set the base and advance the integer exponent while following the successive powers in the plane.
- **Other controls.** Group real and imaginary fields with precise exponent entry. Keep magnitude and angle results together.
- **Acceptance.** For a nonzero base, successive powers multiply the modulus by its modulus and add its argument modulo a full turn.

<a id="complex-euler"></a>

## Euler's formula

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/complex-euler) · [EulerCircleGraph](../../../src/graphs/complex/EulerCircleGraph.tsx)

- **First task.** Move the angle around the unit circle and watch the point's real and imaginary projections.
- **Other controls.** Group the partial-sum degree and approximation details after the circular motion.
- **Acceptance.** At a quarter turn the displayed point is i up to rounding and the projections agree with cosine and sine.

<a id="isometries"></a>

## Isometries of the plane

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/isometries) · [IsometryGraph](../../../src/graphs/isometry/IsometryGraph.tsx)

- **First task.** Move one mirror with a prepared figure and watch its reflected image. Next compare a pair of mirrors.
- **Other controls.** Group mirror definitions and precise coordinates by mirror. Keep the reflection order visible.
- **Acceptance.** Two intersecting mirrors produce a rotation about their intersection. Parallel mirrors give a translation in the corresponding example.
