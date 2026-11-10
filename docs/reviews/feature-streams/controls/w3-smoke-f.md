# Wave 3 smoke F: R1b readouts and the Apply 44 px recheck

Build `f72c6526`, Chromium (Playwright), emulation only. Worker (Sonnet) returned without writing this file; the handler wrote it from the worker's report and its scripts and outputs under `.command-logs/w3-smoke-f/` (`a`–`g` `.cjs`/`.out`, screenshots `coll-next.png`, `coll-paused.png`). Brief: `w3-smoke-f-brief.md`.

No failures. All routes loaded with 0 console errors; SL→EN→SL relabelled and kept the scene on pole-polar, complex roots, Taylor, linear map and the triangular patch.

| Route / check | Result |
| --- | --- |
| Projective ×5: status blocks | Pass: `[data-projective-status]` visible, no `role`/`aria-live`; one `[data-readout-live]` per route |
| Projective drag (cross ratio, five point, pole-polar) | Pass: 0 live changes during the drag, 1 after it settled; cross ratio carries the nudge ("Razmakni ju.") |
| Three views | Pass by keyboard (ArrowUp): one change |
| Complex ×3, linear map | Pass: plain status lines (`[data-complex-status]`, `[data-linear-map-status]`), one live element |
| Readout rows, help, notes | Pass: `.readout-list-row` label/value; help visible on Taylor, Fourier series and coefficients, root finding, tensor, triangular, linear map; no `role="note"` |
| Epicycle table | Pass at 390 and 1280: scrolls; `tabindex=0`, region named "Členi po vrsti verige (tabela)" |
| Bezier clipping table | Pass: does not scroll at either width, so no tab stop or name |
| Collision Inspect (`/harness/collision-playground`) | Pass: "Dogodek 0 od 59" at start, "Dogodek 1 od 59" after Next; Previous reason in a polite region; regions empty while playing; speaks after Pause |
| Apply at 390×844 touch (extrapolation, elevation, subdivision, rational elevation) | Pass: 44 px; no horizontal overflow (repairs smoke R3 item 2) |

Gaps: Pascal drag produced no change at the probed points (settle check untested there); 390 px reachability only on the four Apply routes; Bezier clipping has two `[data-readout-live]` elements (one empty): the clipping panel mounts one (`BezierClippingControls.tsx:129`), so the second comes from a shared host; open item for the next readout pass.
