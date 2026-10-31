# 04 Grid drawing measurement and ADR (Batch A, spec decision 4)

Spec: Testing Decisions, performance paragraph; decision 4. Protocol: [performance plan](../../performance-plan.md#measurement-protocol). Harness precedent: `scripts/bezier-benchmark/`.

Scope: a standalone benchmark page under `scripts/linear-map-benchmark/` (no app route), its README, raw results in `docs/reviews/linear-maps/grid-drawing-measurement.md`, and the ADR recording the choice. No change to app source.

Acceptance:

1. The bench page draws, on one JSXGraph board, the source grid and the 26 image grid lines from `gridImage` (task 01), the unit square image, two draggable handles, a 4-point Bézier fixture and its image, and optionally a 100-point ellipse.
2. A repeatable scripted drag (Playwright, production build) moves one handle along a fixed path. Compare: (a) per-line JSXGraph `line`/`segment` elements, (b) one polyline curve with NaN breaks, each with and without the ellipse. Record median and p95 frame or update time, board update counts, commit, browser, device, viewport and refresh rate.
3. Clipping: state how image lines far outside the view are handled (clipped endpoints vs infinite lines) and that a singular matrix draws without non-finite coordinates.
4. The ADR (next free number at push time) records the threshold used, the choice and the rejected alternatives. The target classroom device is not available to the worker: record the desktop result and name the device check as an open gap for F6.

Checks: the bench runs through a `just` recipe or documented `node` command that does not take a heavy test slot for longer than one run. Return the table, not the raw log.
