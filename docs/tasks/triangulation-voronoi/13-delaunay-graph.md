# 13 — Delaunay graph with the Lawson trace (T2, F2a)

Status: accepted 2026-11-02 (geometry handler 28; task file written by handler 25). Evidence at the end. Source: spec [B3](../../specs/triangulation-voronoi-lessons.md#b3-delaunay-triangulation-and-lawson-flips-showpiece) (examples 1 and 2, capabilities, acceptance 1–3, 5–7), common criteria C1–C6. Kind: F2a (no route), engineering, mathematical (readouts and circle drawing) and UI/accessibility review. Depends on 12 (`TriangulationGraph`), 04 (`lawsonTrace`, `lawsonStateAt`, `angleVector`), `incircleValue` (`src/compgeo/predicates.ts`) and the exact `circumcentre` / `circumradiusSquared` (`src/compgeo/triangle.ts`). Step controller: `hullTraceRun.ts`, as the ear-clipping graph uses it.

`DelaunayGraph extends TriangulationGraph` in `src/graphs/compgeo/`.

1. **Trace stepping:** the trace is `lawsonTrace` of the current triangulation (the B2 start or a Preset's). Next step, Reset and Play/Pause as on the ear-clipping graph; stopped by default. Any edit (point add/move/remove, manual flip, example) recomputes the trace from the edited triangulation, returns to step \(0\) and pauses (C1, B3 step 7). Next step ×k and Play for k ticks give identical states (C3).
2. **Board at a step:** the triangulation of `lawsonStateAt`; illegal edges marked (dashed plus a label, not colour only); the edge under test highlighted with its two triangles; at a `test` event, the circumcircle of the triangle whose opposite vertex is tested. The circle's centre and radius come from the exact rational `circumcentre` and `circumradiusSquared`, converted to doubles only for drawing (acceptance 7).
3. **Circle overlay outside the trace:** selecting a triangle (board click or keyboard list) shows its circumcircle and the incircle determinant of each neighbouring opposite vertex, as `bigint` text with its sign word (inside / on / outside) (B3 steps 3–4).
4. **Readouts:** step \(i/N\), flips so far, the incircle value of the current test, illegal-edge count, the smallest angle (two decimals) now and at step \(0\), and the full sorted angle vector for at most 4 points' quads (6 angles; example 1), truncated with a count otherwise. Done state says "every edge is legal: Delaunay triangulation" and, when some test had determinant \(0\), "cocircular points: the triangulation is not unique" (acceptance 6).
5. **Presets:** example 1 quad \(a,b,c,d\) with diagonal \(ac\); the B2 seven points in T0; the unit square \((0,0),(1,0),(1,1),(0,1)\) (cocircular). Stored data as 12 plus the trace step (clamped on import like the hull Preset step).
6. **Tests** (host): example 1 shows \(+64\) at the first test, flips to \(bd\), both tests then \(-64\), minimum \(19.65\) → \(26.57\), and the six sorted angles before and after match the spec to two decimals; example 2 stepped to the end makes exactly three flips (\(p_1p_4\), \(p_2p_4\), \(p_4p_6\) in order), shows minimum \(25.35\) against \(1.91\) at step \(0\), and its triangle list equals the spec's Delaunay list as sets; the unit square ends with zero flips and the non-unique note; the drawn circle's centre equals the exact circumcentre \((2,\tfrac73)\) for \(abc\) and its radius \(\sqrt{85}/3\) to double precision; an edit while playing returns to step \(0\) and pauses; Next ×k equals Play k ticks; Preset round trip with a stale step; live language switch; disposal leaves no objects, listeners or timers. Observe each new assertion fail against a deliberate mutation (for example flipping on \(\ge0\) instead of \(>0\), which flips forever on the square, and a centre computed from the wrong triangle).

Not in scope: route, registration, lessons.

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.

## Evidence (handler 28, 2026-11-02)

- Sonnet workers:
  - 13a: the first worker stopped at its budget and wrote `docs/reviews/triangulation-voronoi/13a-handoff.md`; a second worker finished from it (`3aea61ed`). It added `DelaunayGraph`, `DelaunayControls`, `delaunayRun.ts` and `delaunayPresetCollection.ts` (key `compgeo-delaunay`), the `del_*` keys, and four Slovenian term rows in `docs/localization.md`. `triangulationPresetCollection` takes an optional key; the default is unchanged, so stored `compgeo-triangulation` data is unaffected.
  - 13b (`b0c358d4`): the triangle selection overlay (item 3).
  - Repairs (`5f37d372`).
- Decisions:
  - The step is scene state (`step`), clamped on import and figure restore.
  - Any model or triangle-list write that does not name a step returns to step 0 and pauses. A refused flip changes nothing, so it does not reset.
  - A manual flip at a later step flips the triangulation shown and makes it the new start.
  - The triangle selection is transient. Edits, steps and scene replacement clear it.
  - The selected circle is dashed and the trace's test circle solid, so both can show at a `test` step.
  - Neighbours are listed only across interior edges, and the panel says how many edges lie on the hull.
- Handler decision: example 1's "both tests then −64" reads the edge `bd` from each side. The trace tests each edge once, so the assertion lives in the 13b overlay test: after the flip, each of the two triangles shows −64 "outside" for the other's opposite vertex, and before the flip `abc` shows +64 for `d`.
- Mutations, each observed failing then reverted:
  - flip on `>= 0` (with a step cap);
  - circle from the wrong triangle (once for the trace circle, once for the selection circle);
  - stored step left unclamped;
  - an edit that does not reset;
  - the sign word from the wrong comparison;
  - the neighbour from the wrong triangle;
  - selection not cleared by an edit or step;
  - the board `down` handler removed.
  - Logs are `docs/reviews/triangulation-voronoi/13*-mut*.log` (untracked).
- Reviews:
  - Sonnet mathematical: no finding. It recomputed ±64, the centre \((2,\tfrac73)\) and radius \(\sqrt{85}/3\), and both six-angle vectors.
  - Sonnet engineering: three low findings. The repair added board-click tests through the real polygon handlers and clears the selection on scene replacement. Add-mode clicks inside a triangle both select it and add a point, which clears the selection again; this matches edge clicks and is kept.
  - Haiku UI/accessibility: four low findings and one dead-code note. The repair gave the readout and neighbour lists their own short labels, separated the triangle labels, removed the English "incircle" from Slovenian strings, and removed the unused `anglesHidden` readout path (`TriangulationGraph.tsx` and `TriangulationControls.tsx` are back to their state before task 13).
  - The handler confirmed the local repairs; there was no re-review.
- Checks at 13a, 13b and the repair: tsc, lint on the touched files, `just unit src/graphs/compgeo --maxWorkers=2`, `just unit src/localization` and `just build`. Logs are `docs/reviews/triangulation-voronoi/13*-*.log` (untracked). The build warnings are the existing Sass deprecation notices.
- Gaps:
  - No browser run: there is no route until task 14. Its smoke must cover a real board click on a triangle (a transparent polygon with `hasInnerPoints`, under the edge curves), real keyboard activation of the triangle list, Play/Pause timing, and live SL/EN board text.
  - The scene-replacement test may pass without the new clearing in `disposeFigureScene`/`syncReplacedScene`, because loading an example already clears the selection. It was not mutation-checked.
  - The seven-point Delaunay list was not recomputed by the mathematical reviewer; the accepted kernel task 04 checks it against the brute-force oracle.
