# JSXGraph parameter rebuild batching

Status: tiny isolated comparison passed on pinned JSXGraph 1.14.1. It supports retaining the batched parameter update in this prototype; it is not a renderer verdict.

The baseline `setParameter(u, v)` updates the parameter, deletes and recreates the de Casteljau construction, then calls `board.fullUpdate()`. The bounded candidate suspends the board before changing the parameter and rebuilding the construction, and always calls `unsuspendUpdate()` in `finally`; it removes the separate `fullUpdate()`. No evaluation, mesh, point, or construction formula changes. The baseline is fetched from fixed revision `0ec2f8f` by the verifier and served via a Playwright route, so the prototype has one candidate implementation and no profile-mode API.

Run `node docs/prototypes/bezier-patches/verify-jsx-batching.mjs` with the existing 4181 prototype preview available and browser work idle. The verifier runs baseline then candidate for tensor and triangular mesh scenes at iso 8 / tiling 8, desktop 1280×900. Each case has one warmup and three measured parameter changes. It records operation wall time and calls/durations for `fullUpdate`, `unsuspendUpdate`, and `updateElements`, checks the baseline from fixed revision `0ec2f8f`, and hashes the source response and served JSXGraph core/CSS against the isolated files. The 120-second in-process deadline closes Chromium; it does not claim an OS process-tree kill guarantee. Raw results and candidate screenshots are in [the run artifacts](jsx-batching-artifacts/run-2026-10-26/).

Acceptance checks read actual board-owned surface/mesh objects and their rendered SVG primitives; locate the construction's `P(u,v)` point; independently compare its coordinates to the tensor or triangular Bernstein value within `1e-8`; and ensure board object counts remain stable across the three rebuilds. A successful numeric/ownership result does not establish visual quality, drag/orbit behavior, or a renderer budget. The handler must still visually inspect the candidate in the browser, confirm that the patch and construction remain visible, and decide whether measured cost justifies retaining the batch.

## Results — 2026-10-26

Chromium 156.0.8078.4, 1280×900, iso 8 / tiling 8. Served JSXGraph reported `1.14.1`. The SHA-256 hashes for served and isolated `jsxgraphcore.js` matched (`b6ebd074…e6e474`) and for CSS matched (`58ff5704…f3c0f6`). All four cases passed; the raw report includes source response hashes, source hashes, samples, owner IDs/counts, numerical values, and update-call durations.

| Scene | Baseline median (range) | Batched median (range) | Tracked board calls per sample |
| --- | ---: | ---: | ---: |
| Tensor patch | 3419.5 ms (3395.2–3651.2) | 87.1 ms (85.4–98.6) | 63 → 3 |
| Triangular mesh | 1541.9 ms (1523.5–1567.0) | 55.3 ms (54.9–69.2) | 43 → 3 |

Baseline calls were repeated `updateElements` plus one `fullUpdate`. Batched calls were one `updateElements`, one `fullUpdate` triggered by `unsuspendUpdate`, and the `unsuspendUpdate` wrapper itself. Board object counts stayed at 1078 for tensor and 1464 for triangle across sampled rebuilds. The target construction point was found in the owning board and matched independent Bernstein evaluation within `1e-8`; rendered owner primitives were found (1 tensor surface and 64 triangular faces). [Tensor screenshot](jsx-batching-artifacts/run-2026-10-26/tensor-candidate.png) and [triangle screenshot](jsx-batching-artifacts/run-2026-10-26/triangular-candidate.png) show the settled candidate scene and construction.

The handler inspected both candidate screenshots: the patch and de Casteljau construction are visible, including substantive triangular faces. Existing prototype limitations remain visible: the tensor inset shows a triangular outline, the API does not move the inset marker, and the diagnostic readout retains its earlier parameter value. These are unchanged by batching. In particular, this API cost is not a complete parameter-control interaction measurement and differs from Three's inset redraw path.

The measurements show a substantial reduction in synchronous parameter rebuild cost in these two scenes. This does not establish drag/orbit frame budgets, phone performance, teapot performance, overall renderer suitability, or lifecycle acceptance. The candidate changed no disposal or listener code; this focused run did not exercise remount/dispose. Teapot has no parameter path and was not part of this A/B.
