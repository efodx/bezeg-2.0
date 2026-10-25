# 4. Completed generic spline changes

Status: planned. Lane: Curves. Source: [specification §4](../../specs/architecture-deepening-backlog.md#4-completed-generic-spline-changes).

## Scope and entry points

- `src/bezeg/impl/curve/GenericBezierSpline.ts:69-91`.
- `src/graphs/curves/object/JXGGenericSplineCurve.ts:14-20, 55-93` and `AbstractJXGSplineCurve.ts:26-48`.
- `src/graphs/curves/spline/CnSplineGraph.tsx:38-60, 76-85, 94-120`.
- ADR 0010.

## Implementation and acceptance

- Add completed-change tests:
  - valid degree/continuity combinations;
  - rejected combinations, including degree above the UI maximum;
  - span freshness after one change;
  - derived points and labels after a change.
- Deepen the spline model so that one completed change validates the target and regenerates once. Intermediate invalid combinations stay internal; do not regenerate in every setter.
- The adapter reconciles drawing once per change. `CnSplineGraph` no longer steps through single increments or validates twice.
- Remove the unreachable `increaseDegree` guard. Give degree its own limit in the owning module.
- Keep scheme-driven behavior and numerical results identical: compare against current output over representative configurations. Amend ADR 0010's last consequence.

## Verification

Run the spline scheme, structure and lesson tests, typecheck and build. Do a focused browser check of the Cn spline controls and the spline lesson scenes.
