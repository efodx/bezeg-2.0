# Advanced Bézier topics: implementation tasks

Status: scheduled 2026-10-31 by the [Curves feature stream](../feature-streams/curves.md). Source: [Advanced Bézier topics](../../specs/advanced-bezier-lessons.md). Slice template: [feature streams](../feature-streams/README.md#family-template).

The spec's concept contracts and acceptance criteria are the task acceptance. Evidence goes to `docs/reviews/advanced-bezier/`.

## Decisions (F0, 2026-10-31)

- **ADR** — [ADR 0028](../../adr/0028-advanced-bezier-objectives-and-owners.md): endpoint-fixed and free-endpoint \(L^2\) reduction; clipping on the convexity pair-of-curves graph; cubic-boundary Coons as a bicubic tensor net; arc length in a kernel with the PH `s(t)` as oracle.
- **Ids and routes.** Chapter id `advanced-bezier`. Demonstrations: `reduction` (D1, `/bezeg-2.0/bezier/reduction`), `bezier-clipping` (D2, `/bezeg-2.0/bezier/clipping`), `arc-length-param` (D3, `/bezeg-2.0/bezier/arc-length`), `patch-coons` (D4, `/bezeg-2.0/patches/coons`).
- **Kernels** under `src/bezeg/impl/kernels/`: `degree-reduction.ts`, `bezier-clipping.ts`, `arc-length.ts`, `coons.ts`.
- **Gate reading.** Kernels are ungated except `bezier-clipping.ts` (`G-CG`: it uses the convexity hull predicate). D1/D3 graphs subclass point-controlled curve graphs, so their F2a waits for `G-CURVE`; D4 extends `BaseSurfaceGraph` and is ungated for F2a. Registration and lessons need `G-REG`.
- **Terms.** The spec's Slovenian proposals as written (one-shot rule).

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| AB-0 | F0 | This plan, ADR 0028, spec marked scheduled | — | done |
| AB-1a | F1 | `degree-reduction.ts` (both objectives) with D1 numbers | — | done ([evidence](../../reviews/advanced-bezier/ab-1a-kernel.md)) |
| AB-1b | F1 | `arc-length.ts` on the curvature kernel's hodograph, PH oracle tests, D3 numbers | CG-1 | done ([evidence](../../reviews/advanced-bezier/ab-1b-kernel.md)); D3 graph splits panels at cusps |
| AB-1c | F1 | `coons.ts` with the bicubic-net identity test | — | done ([evidence](../../reviews/advanced-bezier/ab-1c-kernel.md)); B averages mismatched corners |
| AB-1d | F1 | `bezier-clipping.ts` | `G-CG` | planned |
| AB-A-* | F2a–F6 | D1 reduction, D3 arc length | `G-CURVE`, `G-REG`, AB-1a, AB-1b | planned |
| AB-B-* | F2a–F6 | D2 Bézier clipping | Batch A, `G-CG`, AB-1d | planned |
| AB-C-* | F2a–F6 | D4 Coons patch | Batch A, AB-1c | planned |
