# B-splines and NURBS: implementation tasks

Status: scheduled 2026-10-31 by the [Curves feature stream](../feature-streams/curves.md). Source: [B-splines and NURBS lessons](../../specs/b-splines-nurbs-lessons.md). Slice template: [feature streams](../feature-streams/README.md#family-template).

The spec's kernel contract, lesson contracts and release conditions are the task acceptance. Evidence goes to `docs/reviews/b-splines-nurbs/`.

## Decisions (F0, 2026-10-31)

- **ADR** — [ADR 0024](../../adr/0024-bspline-representation-and-presets.md): new `BSplineCurve` class; degree, clamped default, raw parameter with a normalized display toggle; new preset collection key `{degree, knots, points, weights?}`.
- **Ids and routes.** Chapter id `b-splines`, family route `/bezeg-2.0/bspline`. Demonstrations: `bspline-basis` (L1, `/bezeg-2.0/bspline/basis`), `bspline-deboor` (L2, `/deboor`), `bspline-insertion` (L3, `/insertion`), `bspline-extraction` (L4, `/extraction`), `nurbs-circle` (L5, `/nurbs-circle`), `bspline-blossom` (L6, `/blossom`). Animation id `'deboor'`.
- **Kernel** in `src/bezeg/impl/curve/bspline/` with the spec's file split. Effort raised to `high` for kernel workers: de Boor/NURBS mathematics (stream README).
- **Gate reading.** The kernel is ungated. The `BSplineCurve` class, its JSXGraph wrapper and the graphs are `G-CURVE` (they share `abstract-point-controlled-curve.ts` and `AbstractJXGPointControlledCurve.ts` with Platform A4/A6).
- **Terms.** The spec's Slovenian proposals as written (one-shot rule), including *pritrjen vozelni vektor* and *cvetenje*.
- **Lesson knots (handler 19, 2026-11-02).** The L1/L2 defaults `(0,0,0,1,2,2,2)` and L1's Bézier-like `(0,0,0,1,1,1)` are not the clamped uniform vector a point count implies, so `LessonCurveFixture` gains an optional `knots` field, used by the two B-spline graphs and validated by `bsplinePresetCollection`. Alternatives: a new `bspline` lesson action kind (more code, one more union member for every lesson consumer), or normalizing the spec's numbers to `[0,1]` (changes the spec's golden values). Other curve graphs ignore the field, as they ignore `degree`.
- **Kernel use (BS-1a review).** Evaluators derive n from the vector length and throw on invalid input. The knot editor and preset restore call `validateKnotVector(u, k, n)` with the editor's own n, show the localized reason, and draw nothing while it returns a code. Degree 0 is a kernel case only and is not offered in the UI.

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| BS-0 | F0 | This plan, ADR 0024, spec marked scheduled | — | done |
| BS-1a | F1 | `knot-vector.ts`, `basis.ts`, `deboor.ts`, uniform-limit functions (`uniformQuadraticSegment`, `chaikinStep`); tests and L1/L2 golden numbers | — | done ([evidence](../../reviews/b-splines-nurbs/bs-1a-kernel.md)) |
| BS-1b | F1 | `insertion.ts`, `extraction.ts`, `rational.ts`, `derivativeSource` (curvature kernel's `DerivativeSource`); tests and L3–L5 golden numbers | BS-1a, CG-1 | done ([evidence](../../reviews/b-splines-nurbs/bs-1b-kernel.md)) |
| BS-A-2a1 | F2a | `BSplineCurve`, JSXGraph wrapper, local Preset collection with validation and localized reasons; L2 golden numbers through the class | BS-1a, `G-CURVE` | done (`9595193e`; engineering + mathematics review, medium finding fixed; [handoff 15](../../reviews/feature-streams/curves/handler-handoff-15.md)) |
| BS-A-2a2 | F2a | Basis-plot graph (template `BernsteinGraph`), knot editor control (order-preserving drag, 0.01 snap, localized refusal), degree 1–3, clamped/unclamped; measured basis-plot drawing | BS-A-2a1 | done (`27a58bcf`; [evidence](../../reviews/b-splines-nurbs/bs-a-2a2-graph.md)) |
| BS-A-2a3 | F2a | De Boor graph (`DecasteljauGraph` look), animation id `'deboor'`, active-point highlight, disposal test | BS-A-2a1, BS-A-2a2 (knot editor) | done (handler 17, [evidence](../../reviews/b-splines-nurbs/bs-a-2a3-graph.md)); Presets split out to 2a3b |
| BS-A-2a3b | F2a | Wire the local B-spline Preset collection into `DeBoorGraph` (`presetCollection()` is undefined; fixture, default, checkpoint, figure and import paths) | BS-A-2a3 | done ([evidence](../../reviews/b-splines-nurbs/bs-a-2a3b-presets.md)) |
| BS-A-2b | F2b | Register `bspline-basis` and `bspline-deboor` (family `/bezeg-2.0/bspline`, `lesson: false`), factories, shared `bspline-curve` collection, `'deboor'` lesson animation id, `lessonFixtureData`, poster-pending and preview recipes | `G-REG`, 2a1–2a3b | done ([evidence](../../reviews/b-splines-nurbs/bs-a-2b-registration.md)) |
| BS-A-3a | F3 | `LessonCurveFixture.knots` (optional; both B-spline graphs use it, else clamped uniform); L1 guided lesson on `bspline-basis` | BS-A-2b | in progress (handler 19) |
| BS-A-3b | F3 | L2 guided lesson on `bspline-deboor` (`'deboor'` next-step/reset, local control, pieces) | BS-A-3a | planned |
| BS-A-4…6 | F4–F6 | Chapter `b-splines`, media, Batch A gate | BS-A-3b | planned |
| BS-B-* | F2a–F6 | L3 insertion/multiplicity (comb from CG-1), L4 extraction | Batch A | planned |
| BS-C-* | F2a–F6 | L5 NURBS circle, optional L6 blossoming | Batch B | planned |
