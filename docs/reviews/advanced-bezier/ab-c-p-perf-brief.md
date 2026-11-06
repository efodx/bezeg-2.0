# AB-C-P drag measurement: brief (handoff-v12)

- **Role:** implementation of one measurement script, and one run of it. Edit only `scripts/coons-gate-perf.cjs` (new), one line of `docs/commands.md`, and the report files named below. No commits, no pushes.
- **Goal:** the spec's batch gate asks D4 to "record a drag measurement per the performance plan" (`docs/specs/advanced-bezier-lessons.md` line 150, D4 acceptance 4 and 5; `docs/performance-plan.md` line 24 for what to record). Measure dragging a boundary control point on the shipped route `/bezeg-2.0/patches/coons`.
- **Template:** copy the method of `scripts/clipping-gate-perf.cjs`: real page through its own controls, rAF sampling only inside the gesture, warm-up dropped, time inside `board.update`, cases interleaved, median over runs, every case asserting that it is real, `--json` output, a deadline, non-zero exit on failure. Default `PREVIEW_BASE_URL` `http://127.0.0.1:4314/bezeg-2.0`. The surface view is not a 2D board with `elType: 'point'` points: control points are `view3d` `point3d` elements on a JSXGraph board, and the mesh is projected into reused 2D curve elements (ADR 0019, `src/graphs/patches/surface-view/`). Find how to reach a control point's screen position there first; `scripts/surface-view-evidence.cjs` reads the surface view, and `data-surface-framing` on its host carries the framing.
- **Context:** the handler owns the preview and has confirmed it reachable; do not build or stop it. Nothing else heavy runs during the measurement. Graph: `src/graphs/patches/CoonsPatchGraph.tsx`, panels `CoonsPatchPanels.tsx`, scene `coonsScene.ts`. Controls: *Ploskev* select (values `s`, `lc`, `ld`, `b`, check them in the panel), linked-corners switch, `[data-corner-status]`.

## Cases

Each at 1440×900, unthrottled and at 4× CPU throttle:

1. Default boundaries, shown surface \(S\), shading and control net on: drag an inner control point of \(c_0\) (index 1 or 2).
2. Same scene: drag a linked corner, which moves the end point of two boundaries.
3. Same scene with linked corners off: drag one end point, so the corner status turns to mismatch during the gesture.
4. Reference, not a pass or fail case: `/bezeg-2.0/patches/tensor` default scene, drag a control point the same way, so the D4 numbers can be read against the mesh path it shares. Find the route in `src/demonstrations.ts`.

## Asserts

Fail the run when the control point did not move, the projected mesh paths did not change across the gesture, the interior-net readout did not change (cases 1 to 3), the corner status is not `mismatch` after case 3 or not `met` after cases 1 and 2, too few frames or board updates, or a page error. Record the mesh sampling density the route uses and whether it equals the tensor patch's (spec D4 acceptance 5: no density change without a measurement).

## Return

Add one line to `docs/commands.md` beside the other perf scripts. Write `docs/reviews/advanced-bezier/ab-c-p-perf.md`: commit, build, Chromium version, viewport, method, the results table, and whether any case exceeds a 16.7 ms frame median or a 33 ms p95. Keep raw JSON beside it as `ab-c-p-perf-raw.json`. Reply in at most 25 lines with the table.

Budget: past about 25 turns, or on `HANDOFF`, stop at a consistent point, write what you have to the report, and return it as partial.
