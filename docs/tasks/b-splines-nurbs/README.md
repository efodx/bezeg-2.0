# B-splines and NURBS: implementation tasks

Status: scheduled 2026-10-31 by the [Curves feature stream](../feature-streams/curves.md). Source: [B-splines and NURBS lessons](../../specs/b-splines-nurbs-lessons.md). Slice template: [feature streams](../feature-streams/README.md#family-template).

The spec's kernel contract, lesson contracts and release conditions are the task acceptance. Evidence goes to `docs/reviews/b-splines-nurbs/`.

## Decisions (F0, 2026-10-31)

- **ADR** — [ADR 0023](../../adr/0023-bspline-representation-and-presets.md): new `BSplineCurve` class; degree, clamped default, raw parameter with a normalized display toggle; new preset collection key `{degree, knots, points, weights?}`.
- **Ids and routes.** Chapter id `b-splines`, family route `/bezeg-2.0/bspline`. Demonstrations: `bspline-basis` (L1, `/bezeg-2.0/bspline/basis`), `bspline-deboor` (L2, `/deboor`), `bspline-insertion` (L3, `/insertion`), `bspline-extraction` (L4, `/extraction`), `nurbs-circle` (L5, `/nurbs-circle`), `bspline-blossom` (L6, `/blossom`). Animation id `'deboor'`.
- **Kernel** in `src/bezeg/impl/curve/bspline/` with the spec's file split. Effort raised to `high` for kernel workers: de Boor/NURBS mathematics (stream README).
- **Gate reading.** The kernel is ungated. The `BSplineCurve` class, its JSXGraph wrapper and the graphs are `G-CURVE` (they share `abstract-point-controlled-curve.ts` and `AbstractJXGPointControlledCurve.ts` with Platform A4/A6).
- **Terms.** The spec's Slovenian proposals as written (one-shot rule), including *pritrjen vozelni vektor* and *cvetenje*.

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| BS-0 | F0 | This plan, ADR 0023, spec marked scheduled | — | done |
| BS-1a | F1 | `knot-vector.ts`, `basis.ts`, `deboor.ts`, uniform-limit functions (`uniformQuadraticSegment`, `chaikinStep`); tests and L1/L2 golden numbers | — | planned |
| BS-1b | F1 | `insertion.ts`, `extraction.ts`, `rational.ts`, `derivativeSource` (curvature kernel's `DerivativeSource`); tests and L3–L5 golden numbers | BS-1a, CG-1 | planned |
| BS-A-2a | F2a | `BSplineCurve`, JSXGraph wrapper, preset collection with validation, basis-plot and de Boor graphs, knot editor control; measured basis-plot drawing | BS-1a, `G-CURVE` | planned |
| BS-A-2b…6 | F2b–F6 | Registration, L1/L2 lessons, chapter, media, Batch A gate | `G-REG`, 2a | planned |
| BS-B-* | F2a–F6 | L3 insertion/multiplicity (comb from CG-1), L4 extraction | Batch A | planned |
| BS-C-* | F2a–F6 | L5 NURBS circle, optional L6 blossoming | Batch B | planned |
