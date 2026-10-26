# Renderer measurement harness

Current owner verification: [the corrected probe](matrix-probe-2026-10-26/matrix-probe.md) uses actual camera projection, visible control ray ownership and all-net deltas for Three dragging. Surface evidence comes from the actual mesh-owner pixel difference with visibility restored in `finally`, independent of label rectangles. Teapot checks all32 mesh owners. Windows `UNKNOWN` evidence-write errors receive at most five recorded retries; unrelated/exhausted errors still abort. [Completed populations and caveats](renderer-measurements.md) supersede the old label/nonwhite-pixel description below.

`docs/prototypes/bezier-patches/measure.mjs` runs bounded, isolated Chromium probes against the JSXGraph and three.js pages. It starts with JSXGraph, tensor, iso 8, tiling 8, desktop 1440×1000, and one short drag/orbit/UV pass. The hard wall-clock limit defaults to 90 seconds; each browser operation has its own timeout. A parent process kills the runner and its browser process tree at the hard deadline. Each run uses a fresh context/page, avoiding repeated remounts of either prototype.

Run after functional verification and when other browser/timing work is idle:

```powershell
node docs/prototypes/bezier-patches/measure.mjs
```

Select a bounded matrix with comma-separated filters. The JSXGraph triangular path defaults to the `mesh` renderer to match the three.js triangular mesh. Set `BEZEG_MEASURE_TRIANGLE_MODES=mesh,surface` to include the reparameterized surface comparison. For example, cover tensor and triangular patches in both renderers at both settings and both viewport presets:

```powershell
$env:BEZEG_MEASURE_RENDERERS='jsx,three'
$env:BEZEG_MEASURE_KINDS='tensor,triangular'
$env:BEZEG_MEASURE_ISO='8,16'
$env:BEZEG_MEASURE_TILING='8,16'
$env:BEZEG_MEASURE_VIEWPORTS='desktop,narrow'
$env:BEZEG_MEASURE_GESTURES='drag,orbit,uv'
$env:BEZEG_MEASURE_TRIANGLE_MODES='mesh'
$env:BEZEG_MEASURE_REPEATS='2'
$env:BEZEG_MEASURE_SAMPLES='8'
$env:BEZEG_MEASURE_DEADLINE_MS='600000'
node docs/prototypes/bezier-patches/measure.mjs
```

The filters are `BEZEG_MEASURE_RENDERERS` (`jsx,three`), `BEZEG_MEASURE_KINDS` (`tensor,triangular,teapot`), `BEZEG_MEASURE_ISO` and `BEZEG_MEASURE_TILING` (`8,16`), `BEZEG_MEASURE_VIEWPORTS` (`desktop,narrow`), `BEZEG_MEASURE_GESTURES` (`drag,orbit,uv`), `BEZEG_MEASURE_TRIANGLE_MODES` (`mesh,surface`; JSX triangular scenes), `BEZEG_MEASURE_REPEATS` (1–10), `BEZEG_MEASURE_SAMPLES` (2–120), `BEZEG_MEASURE_OPERATION_TIMEOUT_MS`, `BEZEG_MEASURE_DEADLINE_MS` (1–600 seconds), `BEZEG_MEASURE_OUT`, and `BEZEG_SPIKE_URL`. Output defaults to `.command-logs/patches-measure`; `measure.json` is rewritten before each risky operation and after each sample, while `progress.json` identifies the active run/sample. Hard-stop details go to `failure.json`.

The report records the Git HEAD, dirty flag and a hash of the worktree status, runtime versions, and hashes for each served page's HTML, prototype script, stylesheet, and pinned renderer/data assets; served hashes must match their worktree copies. JSXGraph checks rendered SVG primitives owned by the patch surface or triangular faces, with a substantive face/surface-owner count. Three.js checks its surface face count and nonwhite pixels around an interior point projected from the surface label (or across the canvas for the teapot, which has no parameter label). These checks establish that patch geometry rendered in the measurement run; visible mesh response during dragging remains a separate smoke-test concern. Drag must move the selected control point while leaving the camera fixed. Teapot drag and UV are explicitly skipped because its view has no editable net or single-patch parameter domain; teapot orbit remains measurable. UV timings cover the same named `setParameter` path and are a separate population. Continuous rAF samples include intervals between host-dispatched inputs and JSON writes; use raw per-event samples for interaction response. Frame intervals and event-dispatch-to-next-rAF are proxies: they do not establish compositor presentation or pixel-visible latency. The narrow viewport is desktop emulation, not a physical phone. Compare renderers only within matching scene/configuration/input populations; update-cost comparisons are omitted because the prototypes expose no equivalent named update hook.
