# PH curves control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Keep curve selection and hodograph editing distinct. A point in the hodograph describes the curve's derivative. Label which object is being edited and retain the existing edit-mode controls.

**Implementation order.** Try the cubic before porting the interaction to the quintic.

<a id="ph-cubic"></a>

## Degree 3 PH curve

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/ph/cubic) · [CubicPhBezierCurveGraph](../../../src/graphs/curves/ph/CubicPhBezierCurveGraph.tsx)

- **First task.** Make selection and hodograph editing one discoverable sequence. Move a free hodograph point and watch the cubic respond.
- **Other controls.** Group the cubic's control-polygon angle and length displays under polygon geometry. Put offset distance and count together.
- **Acceptance.** A free hodograph edit changes the corresponding PH curve. A visitor can return to ordinary curve editing.

<a id="ph-quintic"></a>

## Degree 5 PH curve

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/ph/quintic) · [QuinticPhBezierCurveGraph](../../../src/graphs/curves/ph/QuinticPhBezierCurveGraph.tsx)

- **First task.** Select the quintic, enter hodograph editing and move the middle of its three starting hodograph points. Keep the edited handle identifiable while the new shape is drawn.
- **Other controls.** Group offset construction settings and precise edits below the hodograph task.
- **Acceptance.** After a free-point move the quintic and any enabled offsets update together without losing the edit target.
