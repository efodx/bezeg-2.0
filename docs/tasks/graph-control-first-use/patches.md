# Bézier patches control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Retain the existing 3D camera, point-selection and pointer ownership. A cue to drag a net point must also identify its keyboard path. Keep axis names and available coordinates visible for the selected point.

**Implementation order.** Tensor patch first, then construction and derivative routes, then changes to net topology and joins.

<a id="patch-tensor"></a>

## Tensor-product Bézier patch

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/patches/tensor) · [TensorPatchGraph](../../../src/graphs/patches/TensorPatchGraph.tsx)

- **First task.** Invite a drag of one control-net point. Keep the selected point identifiable on the dome.
- **Other controls.** Group exact net coordinates, Bernstein weight, degree changes and their explanations by task.
- **Acceptance.** Dragging a net point deforms the patch and selects the correct point. Keyboard coordinate entry produces the same edit.

<a id="patch-decasteljau"></a>

## De Casteljau algorithm for a patch

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/patches/decasteljau) · [TensorDeCasteljauGraph](../../../src/graphs/patches/TensorDeCasteljauGraph.tsx)

- **First task.** Put construction order and the parameter pair together. Reverse the order at fixed u and v.
- **Other controls.** Group level visibility, net editing and camera controls by purpose.
- **Acceptance.** The intermediate constructions differ between orders while the final surface point agrees.

<a id="patch-derivatives"></a>

## Derivatives and tangent plane of a patch

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/patches/derivatives) · [TensorDerivativesGraph](../../../src/graphs/patches/TensorDerivativesGraph.tsx)

- **First task.** Move the surface point with u and v. Keep the two tangent vectors and the plane identifiable.
- **Other controls.** Group derivative values and exact net coordinates below the moving-point controls.
- **Acceptance.** At a regular point both displayed partial derivatives lie in the tangent plane and move with the selected point.

<a id="patch-subdivision"></a>

## Patch subdivision and degree elevation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/patches/subdivision) · [TensorSubdivisionGraph](../../../src/graphs/patches/TensorSubdivisionGraph.tsx)

- **First task.** Lead with split direction and position. Show the two resulting nets together.
- **Other controls.** Group piece-specific overlays and camera choices after the split.
- **Acceptance.** For an interior split the pieces meet along the split boundary and together cover the original surface.

<a id="patch-joins"></a>

## Joining two Bézier patches

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/patches/joins) · [TensorJoinGraph](../../../src/graphs/patches/TensorJoinGraph.tsx)

- **First task.** Choose the continuity condition and move a permitted boundary or adjacent point on patch A.
- **Other controls.** Group the two nets and exact coordinates by patch. Keep the explanation close to any constrained point.
- **Acceptance.** Under the selected condition the dependent row on patch B follows the edit. Locked points retain their reason.

<a id="patch-triangular"></a>

## Triangular Bézier patch

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/patches/triangular) · [TriangularPatchGraph](../../../src/graphs/patches/TriangularPatchGraph.tsx)

- **First task.** Identify one movable control point on the triangular net, then compare a corner with a non-corner point.
- **Other controls.** Group point indices, barycentric details and exact coordinates. Keep the triangular indexing visible when needed.
- **Acceptance.** Moving a corner moves its interpolated patch vertex. Moving a non-corner shapes the patch according to its basis weight.

<a id="patch-coons"></a>

## Coons patch

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/patches/coons) · [CoonsPatchGraph](../../../src/graphs/patches/CoonsPatchGraph.tsx)

- **First task.** Start with one boundary-curve handle and highlight the edge it belongs to.
- **Other controls.** Group detailed boundary coordinates and surface overlays by edge.
- **Acceptance.** An edited boundary is still interpolated by the surface and the adjoining corners stay coherent.
