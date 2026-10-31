# Interpolation and approximation: implementation tasks

Status: scheduled 2026-10-31 by the [Curves feature stream](../feature-streams/curves.md). Source: [Interpolation and approximation lessons](../../specs/interpolation-approximation-lessons.md). Slice template: [feature streams](../feature-streams/README.md#family-template).

The spec's concept contracts and acceptance criteria are the task acceptance. Evidence goes to `docs/reviews/interpolation-approximation/`.

## Decisions (F0, 2026-10-31)

- **ADR** — [ADR 0026](../../adr/0026-interpolation-editing-model-and-solver.md): draggable points with a typed list (I2 stores a node rule); parametric form for I1/I3, functions of \(x\) for I2/I4; Householder QR solver with the normal equations displayed.
- **Ids and routes.** Chapter id `interpolation`, family route `/bezeg-2.0/interpolation`. Demonstrations: `interp-lagrange` (I1, `/bezeg-2.0/interpolation/lagrange`), `interp-runge` (I2, `/runge`), `interp-hermite` (I3, `/hermite`), `interp-least-squares` (I4, `/least-squares`), `interp-subdivision` (I5, `/subdivision`).
- **Kernels** in `src/analysis/`: `interpolation.ts`, `hermite.ts`, `leastSquares.ts`, `subdivision.ts` (`fourPointStep`; Chaikin and the uniform limit are imported from the B-spline kernel, BS-1a).
- **Gate reading.** Kernels are ungated. I2 and I4 graphs plot functions of \(x\) and wait for `G-FN`; I1, I3 and I5 graphs are point/curve graphs and are ungated for F2a. Registration and lessons need `G-REG`.
- **Terms.** The spec's Slovenian proposals as written (one-shot rule): interpolacija / aproksimacija, Lagrangeev interpolacijski polinom, interpolacijska točka, Rungejev pojav, Čebiševe točke, Hermiteova interpolacija, Catmull-Romov zlepek, metoda najmanjših kvadratov / ostanek, normalni sistem, subdivizijska krivulja.

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| IA-0 | F0 | This plan, ADR 0026, spec marked scheduled | — | done |
| IA-1a | F1 | `interpolation.ts` (barycentric Lagrange, node sets, error sampling, Runge table) | — | planned |
| IA-1b | F1 | `leastSquares.ts` (QR, normal-equation display data, residuals) and `hermite.ts` (cubic Hermite, Catmull-Rom, Bézier conversion) | — | planned |
| IA-1c | F1 | `subdivision.ts` (`fourPointStep`) with imported Chaikin identity tests | BS-1a | planned |
| IA-A-* | F2a–F6 | I1 Lagrange vs Bézier, I2 Runge (I2 graph `G-FN`) | IA-1a | planned |
| IA-B-* | F2a–F6 | I3 Hermite/Catmull-Rom, I4 least squares (I4 graph `G-FN`) | Batch A, IA-1b | planned |
| IA-C-* | F2a–F6 | I5 Chaikin and four-point subdivision | Batch B, IA-1c | planned |
