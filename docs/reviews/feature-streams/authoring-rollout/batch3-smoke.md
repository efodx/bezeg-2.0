# Batch 3 smoke: parametric curve scene

Production build from `a6e00110` (dirty: only `docs/tasks/feature-streams/authoring-rollout.md` is modified, which does not affect the build). Commands: `just build`, then `just smoke-built --port 4331 --workers=2 --grep "curve-parametric"`. Port 4331 was used because 4323 is often held by another preview. The first grep selected rows, so no fallback grep (`parametric` or curve-geometry lessons) was run.

Result: 3 passed, 0 failed, 0 skipped.

- `curve-parametric` Demonstration: heading, graph and inspector render (English, `demonstrations.smoke.spec.cjs:299`).
- Lesson `curve-parametric`, Slovenian `?learn=1`: every frame walked in order with pointer clicks on Next, completes.
- Lesson `curve-parametric`, English 390x844: every frame in order keeps points in view, math blocks inside the viewport, Next pointer-clickable.
- No page or console errors reported. Lesson walks fail on runtime errors; Demonstration load tests do not capture console errors.

Logs: `.command-logs/batch3-build.log`, `.command-logs/batch3-smoke-curve-parametric.log`, `.command-logs/2026-11-12T09-30-54-442Z-2948-24b06c14.log`.

Not covered:
- Catalogue switch cycloid -> cardioid -> rose -> spiral -> cycloid (scene rebuild on another curve).
- Same-curve import keeps the scene.
- Parameter slider.
- Roll play/pause.
- Preset save/select.
- Drag interaction on the graph.
- A route A-B-A lifecycle for this graph.
