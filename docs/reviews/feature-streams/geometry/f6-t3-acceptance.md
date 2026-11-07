# F6 acceptance: triangulation T3 (B4, B5)

Handler: geometry handler 42 (Opus 5.5), 2026-11-03. Spec: [triangulations and Voronoi](../../../specs/triangulation-voronoi-lessons.md) B4, B5 and its acceptance gates. Tasks: [triangulation-voronoi 18–24b](../../../tasks/triangulation-voronoi/README.md).

**State: accepted 2026-11-03 (geometry handler 43).** Handler 42 recorded a partial acceptance. Handler 43 closed the last gate row, projection readability at 1280×720 (see Gaps), with the marker fix `5721f6f0`. T3 tasks 23 and 24b reached `master` on 2026-11-03 (`37a4922f..ed7f816d`). The owner had approved a push that failed only on the functions `PresetCatalog` test (confirmed in this session), but master was green by then, so the exception was not used.

## Evidence

- **Criterion-to-test matrix:** [f6-t3-evidence-matrix.md](f6-t3-evidence-matrix.md) (handler 41). It had 89 rows: 72 covered, 16 partial and 1 missing (figure export). The matrix's Gaps table is closed as follows.
- **Test gap, `737ce397`:** `compgeoVoronoiLesson.test.ts` checks three things in sl and en:
  - B4's required prerequisite is the Delaunay lesson, and that lesson exists;
  - the `vor-dual` step says the picture illustrates duality and does not prove it;
  - an edge case says the same.

  Two deliberate mutations each fail the test: a prerequisite that no longer names Delaunay, and the caveat removed from the dual step. Logs: `42-mut1.log`, `42-mut2.log`.
- **Docs gap, `1b97297a`:** `docs/capabilities.md` describes the Voronoi Demonstrations in the family paragraph; the route table already listed them. `GLOSSARY.md` gains Voronoi diagram, Duality and Cocircular points, using the Slovenian terms the lessons use (*Voronojev diagram*, *dualnost*, *kocirkularne točke*). Uniqueness is stated for an **empty** circle.
- **Static preview (Gate 1):** joint poster capture `22295a42`. `voronoi` shows the seven-site diagram. `voronoi-degenerate` shows the four cocircular sites with their degree-four vertex, inside the window. Both images were viewed; [stream notes](../../../tasks/feature-streams/geometry.md#notes).
- **Bilingual smoke:** [f6-t3-smoke.md](f6-t3-smoke.md). A `bezeg-smoke` worker (resolved to Haiku) ran against the production preview on port 4313, built from `ed7f816d` and dirty only in `POSTER_PENDING`. Results:
  - Deep link and reload: passed on both routes.
  - SVG and PNG export in sl and en: passed. This was the matrix's one missing row. The handler viewed the D export: the cells of (0,0), (1,0), (1,1), (0,1) meet at (0.5, 0.5).
  - sl and en lesson walks, and a live header language switch mid-lesson (step and frame kept): passed on both.
  - 390×844 without horizontal scroll: passed, with Next reachable.
  - Chapter `/learn/triangulations-voronoi` in sl and en at 1440 and 390: passed.
  - Focus restore via "Nazaj v poglavje" (row 24.2): passed; focus lands on the "Vodeni primer →" link.
  - No console or page errors.
- **Performance (18.6):** 40-site drag on `/compgeo/voronoi` (an adapted copy of `scripts/triangulation-browser-perf.cjs`, 3 runs). The median frame interval is 16.7 ms (p95 16.8 ms, max 66.6 ms); move-to-frame latency has a median of 8.8 ms and a max of 49.5 ms ([log](f6-t3-smoke/perf-voronoi.log)).
- **Checks:**
  - After the rebase onto `37a4922f`: `just unit src/learning src/graphs/compgeo src/graphs/base/presets` plus `GraphTransientState.part1` passed, and tsc is clean (`42-unit-rebased.log`, `42-tsc.log`).
  - After the capture: the poster unit tests (20), the tooling test (25 pass, 0 fail) and lint passed. `just smoke-built` passed the demonstrations and motion specs (`42-catalog-smoke.log`).
  - The full `just check` result at the record commit is in `42-check2.log`. Hosted CI is reported in the stream row.

## Gaps and notes

- **Closed (handler 43): Gate 3 projection readability, B4.4 marker legibility.** Captures at 1280×720 of V steps 4 and 5 and D step 3, in three modes, all viewed (`f6-t3-smoke/g3-*.png`, script `g3.mjs`). The card observations record the historical lesson review and can inform independent-study layout checks at that viewport. The marker defect and fix apply to the graph, including ordinary zoom and pan. [Independent study and classroom teaching](../../../guardrails.md#independent-study-and-classroom-teaching).
  - **Card hidden ("Skrij"):** legible. The diagram, P labels, vertices, the V5 circumcircle and the D3 degree-4 diamond are all visible. The V5 circle's lowest part runs past the 720 px fold (the page scrolls).
  - **Card dragged:** the grip keeps the card inside the 848 px board (x 351–895), so it still covers the centre.
  - **Presentation mode ("Predstavitveni način"):** the board widens to 1158 px, but the card stays centred over it.
  - The drag and presentation layouts are shared lesson runtime and were routed to learn-ui ([learn-ui notes](../../../tasks/feature-streams/learn-ui.md#notes-from-other-streams)). The "Skrij" path meets the gate.
  - **Defect found and fixed (T3, not learn-ui):** on every diagram frame of both lessons, all "continues" markers were outside the visible board (V: 0 of 9, D: 0 of 8 or 12).
    - Cause: lesson scenes change the view, and `VoronoiGraph.visibleBox()` rounded the view outward to whole grid units. The clip box and the markers on its open sides therefore lay beyond the view edge. A user's zoom or pan did the same.
    - Fix `5721f6f0`: round inward after a 16 px inset, with fallbacks to the un-inset box and then to `frame`. The new host test failed under the old rounding (`43w-mutation.log`).
    - Production recheck: every diagram frame shows all of its markers (V 9/9, D 8/8 and 12/12; `f6-t3-smoke/g3w-after.log`). After Reset view, the 16 px arrow glyphs are readable.
- **Shared runtime, not T3 (for learn-ui):**
  - `GuidedLesson.tsx:323` moves focus to the lesson section on every step or frame change, so keyboard users must Tab back to "Naslednji okvir" (about 22 stops) for each frame. Focus outlines are solid 3 px on every stop.
  - "Zapusti in povrni graf" returns focus to its invoker "Spoznaj to demonstracijo" by design (`GuidedLesson.tsx:192`).
  - Both are recorded as smoke failures but are outside T3's scope.
- **Not run:**
  - perf and focus restore on `voronoi-degenerate` (it subclasses `VoronoiGraph`; the V measurement stands for both);
  - touch and text enlargement;
  - viewing the chapter screenshots (the headings and links were asserted).
- 390 px: about 21 to 30 visible controls are under 44 px in one dimension (header links, grid arrows). This is shared chrome.
