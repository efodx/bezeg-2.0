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

- **L6 ships (handler 54, 2026-11-05).** The spec lets it be dropped, but its scope is small, its route and term are already decided, it shows the de Casteljau construction from a new side, and family 2's optional L6 set the precedent. It runs before CG-B3-5 so one capture serves both posters.

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| CG-0 | F0 | This plan, ADR 0022, spec marked scheduled | — | done |
| CG-1 | F1 | Curvature kernel + analytic sources, spec's contract and kernel tests, plus every numeric default quoted in L1–L5 as an oracle test | — | done ([evidence](../../reviews/curve-geometry/cg-1-kernel.md)) |
| CG-B1-2a | F2a | `curve-parametric` graph: fixed catalogue (cycloid with radius, cardioid, rose, Archimedean spiral), \(t\)/\(\theta\) slider, velocity vector, radius ray, arch length/area readouts, roll animation id; Presets; unit + component tests | CG-1 | done ([evidence](../../reviews/curve-geometry/cg-b1-2a-graph.md); browser check in 2b) |
| CG-B1-2a' | F2a | `curve-curvature` graph: `BezierCurveGraph` subclass with owned overlay (frame \(T,N\), osculating circle or line, readouts), parabola preset, tangency residual test, disposal test | CG-1 | done ([evidence](../../reviews/curve-geometry/cg-b1-2a-prime-graph.md); browser check in 2b) |
| CG-B1-2b | F2b | Register both Demonstrations (route, catalog, factories) | `G-REG`, 2a, 2a' | done (`2a6e9c4`, `lesson: false`); fix: the \(t\) slider moved to its own Edit group, since structured editing does not render `getGraphCommands` |
| CG-B1-3 | F3 | L1 and L2 scenes + one-shot text | 2b | done (`85da034e`, `09ef1a32`); smoke rows pass sl+en incl. 390×844 |
| CG-B1-4 | F4 | Chapter `curve-geometry` (L1, L2 sections) with guided examples | 3 | done (handler 43; Sonnet worker, handler prose review): chapter after `parametrization`, intro plus two sections. The lessons moved from `parametrization/uniform-timing` and `bezier-curves/geometric-properties`, which had no prose about them. **Breaking:** the interim example ids `lesson.parametrization.uniform-timing.curve-parametric` and `lesson.bezier-curves.geometric-properties.curve-curvature` no longer resolve; the lessons now open from the new chapter. Routes and Presets are unchanged |
| CG-B1-5 | F5 | Preview clips and example cards | 4 | done (handler 44): both chapter cards captured and viewed; posters existed. No clips: families 2–4 shipped without them and the spec names none. Viewing the L1 card exposed that step 1 showed the arch it asks about, now fixed |
| CG-B1-6 | F6 | Batch 1 gate incl. L2 dragging measurement | 5 | done, **Batch 1 released** (handler 45): [criterion audit](../../reviews/curve-geometry/cg-b1-6-criterion-audit.md) with the browser pass, [dragging measurement](../../reviews/curve-geometry/cg-b1-6-dragging-measurement.md), overlay mathematics review, `just check`, hosted CI |
| CG-B2-1 | F2a | Comb measurement (32/64/128/256 teeth, spline join drag) and comb drawing ADR | B1 shipped, `G-CURVE` | done (handler 45): [measurement](../../reviews/curve-geometry/cg-b2-1-comb-measurement.md), [ADR 0041](../../adr/0041-curvature-comb-drawing.md): one JSXGraph curve, default 64 teeth |
| CG-B2-2a | F2a | `curve-comb` (one graph switching cubic, C1, C2, G1) and `curve-evolute` graphs | B2-1 | done (handler 46): [evidence](../../reviews/curve-geometry/cg-b2-2a-graphs.md); browser check in 2b |
| CG-B2-2b | F2b | Register both Demonstrations (route, catalog, factories, `lesson: false`) | B2-2a | done (handler 47): [evidence](../../reviews/curve-geometry/cg-b2-2b-registration.md); fixed the evolute's first paint; it now opens at \(t=0.75\) |
| CG-B2-3 | F3 | L3 lesson and chapter section for `curve-comb` | B2-2b | done (handler 48): [evidence](../../reviews/curve-geometry/cg-b2-3-lesson.md); card and poster in CG-B2-5 |
| CG-B2-4 | F4 | L4 lesson and chapter section for `curve-evolute` | B2-3 | done (handler 50): [evidence](../../reviews/curve-geometry/cg-b2-4-lesson.md) |
| CG-B2-5 | F5 | Media | B2-4 | done (handler 50): [evidence](../../reviews/curve-geometry/cg-b2-5-media.md) |
| CG-B2-6 | F6 | Batch 2 gate | B2-5 | done, **Batch 2 released** (handler 51): [gate record](../../reviews/curve-geometry/cg-b2-6-gate.md), [measurement](../../reviews/curve-geometry/cg-b2-6-measurement.md), [audit](../../reviews/curve-geometry/cg-b2-6-criterion-audit.md) |
| CG-B3-2a | F2a | `curve-offset` (with PH cross-check; tangential-cusp detection from the CG-1 review) and optional `curve-envelope` graphs | B2 shipped | `curve-offset` kernel and graph done, reviewed, smoked and measured ([evidence](../../reviews/curve-geometry/cg-b3-2a-graphs.md)); `curve-envelope`: CG-B3-4a |
| CG-B3-2b | F2b | Registration | B3-2a | `curve-offset` registered (poster pending) |
| CG-B3-3 | F3 | L5 lesson and chapter section for `curve-offset` | B3-2b | done (handler 54): [evidence](../../reviews/curve-geometry/cg-b3-3-lesson.md) |
| CG-B3-4a | F2a, F2b | `curve-envelope` graph and registration (`lesson: false`) | B2 shipped | kernel, graph and registration committed (handler 54, branch `curves-l6-envelope`); review, browser check and measurement next |
| CG-B3-4b | F3 | L6 lesson and chapter section | B3-4a | planned |
| CG-B3-5 | F5 | Cards and posters for `curve-offset` and `curve-envelope`, joint capture | B3-4b | planned |
| CG-B3-6 | F6 | Batch 3 gate | B3-5 | planned |
