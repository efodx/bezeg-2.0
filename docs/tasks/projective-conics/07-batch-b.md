# 07 Batch B: K4 and K5 (F2a–F6)

Gates: `G-REG` for F2b–F6; F2a is ungated. Depends on 04 and 06. S6 from family 2 (school function graphs) is recommended first. Without it, K4 rests on the `farin` and `circle` lessons, and K5 omits the link step.

- **F2a:**
  - The five-point graph (K4), with the rational-curve overlay and its deviation readout.
  - The two-panel view (K5), with the \(c\) slider in exact tenths.
  - Measure dragging before fixing the sample density.
- **F2b–F5:** registration, lessons K4–K5, chapter additions and media.
- **F6:** the Batch B release condition (the K4 equality with the existing rational chapter) and the batch-wide gate. Run `just check`, smoke and CI.

## Slices (handler plan, 2026-11-02)

S6 (school function graphs, Batch C) is not released, so K4 rests on the `farin` and `circle` lessons and K5 omits the link step. Run in order, one worker each; each follows the K3 slice (`PolePolarGraph`) for board ownership, language switching and Preset validation.

| Slice | Content | Status |
| --- | --- | --- |
| 07a | K4 five-point graph: model on the 1/15 grid (drag and keys snap to 1/5), examples `ellipse`, `hyperbola`, `parabola`, `three-collinear`, `four-collinear`, the conic, arc ends, tangents, P1, weight, Farin points, shoulder, the existing rational evaluator's overlay with a sampled deviation, extrapolation split at the denominator zeros, status and stale conic, the Preset parser. | accepted 2026-11-02 (`17c69b9d`): model, host and Preset tests, 8 observed mutation failures, engineering + UI and mathematical review repaired (one Reset path, non-vacuous host assertions, no focus jump, hyperbola and S6-bridge checks). Collection registered with the importer and listed in `PresetCatalog.test.tsx` `PENDING_ROUTE_KEYS` until F2b adds the route. Deferred (low): a line pair with two collinear triples names one; typed off-grid coordinates are dropped silently (as in K3) |
| 07b | K5 two-panel graph: unit circle and line \(y=c\) with \(c\) in exact tenths, the image conic and its type from the exact discriminant, the points at infinity as directions, a point on the circle by parameter and its image. | accepted 2026-11-02 (`7fddd65d`, repairs in the next commit): engineering, UI and math reviews; acceptance 2 holds at 1e-13 (worst residual 8.9e-15 over 800 random points), so the spec's "< 1e-15" example claim does not; a localized note when the conic (only \|c\| = 0.9 and 1.1 on the tenths grid) or P' leaves the ±7 image window; Preset parsers for K4 and K5 refuse unknown keys. Route pending until F2b. |
| 07c | Drag measurement of the five-point graph per the performance plan; record the numbers in ADR 0033. | accepted 2026-11-02: Node math path (`just projective-conic-bench` section D), per move 0.20–0.33 ms median, ≤ 0.47 ms p95, conic sampling about 60–65 %; density 360 and `DEVIATION_SAMPLES` 200 stand. Browser frames are measured on the route in F2b (cases in the ADR 0033 addendum). |
