# 5. PH auxiliary-board lifetime

Status: planned. Lane: Curves. Source: [specification §5](../../specs/architecture-deepening-backlog.md#5-ph-auxiliary-board-lifetime).

## Scope and entry points

- `src/graphs/curves/ph/HodographInputBox.tsx:17-73`.
- `BasePhBezierCurveGraph.tsx:31-35, 135-159, 173-264`.
- `JXGPHBezierCurve.ts:48-57`.
- `GraphSession.ts`.
- Existing `HodographInputBox`, `PhGeneratingPointBinding` and `PhOffsetControls` tests.

## Implementation and acceptance

- First add graph-level sequences: hide/show the hodograph, Preset replacement, language redraw, and unmount/remount. Assert that no stale parent link, binding, observer or editor subscription survives.
- Deepen one auxiliary-board lifetime module. It owns:
  - board creation through the session;
  - resize observation;
  - the parent link;
  - the generating-point bindings;
  - idempotent release.
- The view supplies the host element, and the graph keeps PH mathematics.
- Move the `w` point bindings to the PH adapter, matching ADR 0006 and how main-board points are bound.
- Hodograph transient state (ADR 0015) and cubic/quintic behavior stay unchanged.

## Verification

Run the PH tests, the real-graph transient tests, typecheck and build. In the browser, on cubic and quintic PH, drag generating points, toggle the hodograph, reload a Preset and switch language.
