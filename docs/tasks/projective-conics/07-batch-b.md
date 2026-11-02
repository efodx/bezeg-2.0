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
| 07a | K4 five-point graph: model on the 1/15 grid (drag and keys snap to 1/5), examples `ellipse`, `hyperbola`, `parabola`, `three-collinear`, `four-collinear`, the conic, arc ends, tangents, P1, weight, Farin points, shoulder, the existing rational evaluator's overlay with a sampled deviation, extrapolation split at the denominator zeros, status and stale conic, the Preset parser. | WIP, unverified: source written on branch `wip/functions-pc-switch`, no tests yet ([worker handoff](../../reviews/feature-streams/functions/worker-projective-07a-handoff.md)) |
| 07b | K5 two-panel graph: unit circle and line \(y=c\) with \(c\) in exact tenths, the image conic and its type from the exact discriminant, the points at infinity as directions, a point on the circle by parameter and its image. | planned |
| 07c | Drag measurement of the five-point graph per the performance plan; record the numbers in ADR 0033. | planned |
