# Geometry of curves: implementation tasks

Status: scheduled 2026-10-31 by the [Curves feature stream](../feature-streams/curves.md). Source: [Geometry of curves lessons](../../specs/curve-geometry-lessons.md). Slice template: [feature streams](../feature-streams/README.md#family-template).

The spec's lesson contracts, defaults and acceptance criteria are the task acceptance; the slices below only cut them into worker-sized pieces. Evidence goes to `docs/reviews/curve-geometry/`.

## Decisions (F0, 2026-10-31)

- **Ids and routes.** Chapter id `curve-geometry`, family route `/bezeg-2.0/curve-geometry`. Demonstrations: `curve-parametric` (L1, `/bezeg-2.0/curve-geometry/parametric`), `curve-curvature` (L2, `/curvature`), `curve-comb` (L3, `/comb`), `curve-evolute` (L4, `/evolute`), `curve-offset` (L5, `/offset`), `curve-envelope` (L6, `/envelope`). No existing route or Preset changes.
- **Kernel location.** `src/bezeg/impl/curve/curvature.ts` with `curvature.test.ts`, exactly the spec's contract. Analytic sources (cycloid, cardioid, rose, Archimedean spiral, parabola) live beside it in `src/bezeg/impl/curve/parametric-sources.ts` as plain functions returning \(r, r', r''\).
- **Where curvature lives in graph classes** — [ADR 0022](../../adr/0022-curvature-overlays-in-demonstration-graphs.md): new Demonstration graph classes compose an owned overlay object; the shared Bézier and spline graphs are not changed.
- **Comb drawing ADR** stays open until the Batch 2 measurement (CG-B2-1), as the spec requires.
- **Gate reading.** `G-CURVE` gates anything that subclasses or edits the spline graphs, the spline adapter or curve-editing gestures (the comb on spline graphs). The L2 curvature graph only subclasses `BezierCurveGraph` and adds an overlay, so its F2a runs before `G-CURVE`; if Platform A6 changes `BezierCurveGraph`'s gesture code, the subclass rebases over it.
- **Terms.** The spec's Slovenian proposals are used as written (one-shot rule): ukrivljenost, krivinska krožnica, krivinski polmer, glavnik ukrivljenosti, evoluta, vzporedna krivulja, ovojnica, polarna krivulja, ost, Frenetov okvir, prevoj.

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| CG-0 | F0 | This plan, ADR 0022, spec marked scheduled | — | done |
| CG-1 | F1 | Curvature kernel + analytic sources, spec's contract and kernel tests, plus every numeric default quoted in L1–L5 as an oracle test | — | planned |
| CG-B1-2a | F2a | `curve-parametric` graph: fixed catalogue (cycloid with radius, cardioid, rose, Archimedean spiral), \(t\)/\(\theta\) slider, velocity vector, radius ray, arch length/area readouts, roll animation id; Presets; unit + component tests | CG-1 | planned |
| CG-B1-2a' | F2a | `curve-curvature` graph: `BezierCurveGraph` subclass with owned overlay (frame \(T,N\), osculating circle or line, readouts), parabola preset, tangency residual test, disposal test | CG-1 | planned |
| CG-B1-2b | F2b | Register both Demonstrations (route, catalog, factories) | `G-REG`, 2a, 2a' | planned |
| CG-B1-3 | F3 | L1 and L2 scenes + one-shot text | 2b | planned |
| CG-B1-4 | F4 | Chapter `curve-geometry` (L1, L2 sections) with guided examples | 3 | planned |
| CG-B1-5 | F5 | Preview clips and example cards | 4 | planned |
| CG-B1-6 | F6 | Batch 1 gate incl. L2 dragging measurement | 5 | planned |
| CG-B2-1 | F2a | Comb measurement (32/64/128/256 teeth, spline join drag) and comb drawing ADR | B1 shipped, `G-CURVE` | planned |
| CG-B2-2a | F2a | `curve-comb` (cubic + C1/C2/G1 spline subclasses) and `curve-evolute` graphs | B2-1 | planned |
| CG-B2-2b…6 | F2b–F6 | Registration, L3/L4 lessons, chapter sections, media, Batch 2 gate | B2-2a | planned |
| CG-B3-2a | F2a | `curve-offset` (with PH cross-check) and optional `curve-envelope` graphs | B2 shipped | planned |
| CG-B3-2b…6 | F2b–F6 | Registration, L5/L6 lessons, chapter sections, media, Batch 3 gate | B3-2a | planned |
