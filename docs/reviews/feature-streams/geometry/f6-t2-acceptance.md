# F6 acceptance: triangulation T2 (B2, B3)

Handler: geometry handler 34 (Opus 5.5), 2026-11-02. Spec: [triangulations and Voronoi](../../../specs/triangulation-voronoi-lessons.md) B2, B3 and its batch-wide gate. Tasks: [triangulation 11–17](../../../tasks/triangulation-voronoi/README.md). Procedure: as the [T1/S1 record](f6-t1-s1-acceptance.md).

**State: accepted 2026-11-02** at `3ce8cc3f` (`origin/master` `e3f90da5` plus the gap commit). This releases T2; T3 task files are next in the triangulation family.

## Evidence

- **Criterion-to-test matrix:** [f6-t2-evidence-matrix.md](f6-t2-evidence-matrix.md), from a Sonnet `bezeg-reviewer` that read the files at `2512429b` without running them. Of 66 rows, 47 were covered, 15 partial and 4 missing. Random tests stay within the spec's bounds (point insertion n ≤ 15, Delaunay oracle n = 4–14, Lawson n = 5–12).
- **Missing rows, fixed in `3ce8cc3f`:**
  - `docs/capabilities.md` now names the Lawson edge-flip trace and the point-set refusals.
  - `docs/current-architecture.md` names `TriangulationGraph`, `DelaunayGraph` and `delaunayRun.ts` (task 14.6).
  - `GLOSSARY.md` adds Triangulation, Edge flip, Illegal edge, Empty circle / incircle test and Delaunay triangulation, and extends Trace. The handler corrected the Delaunay entry to "a triangulation", unique only without four cocircular points.
  - Gate 3 figure export: covered by the smoke below.
- **Partial test rows, fixed in `3ce8cc3f`**, each observed failing under a deliberate mutation and restored byte-identical:
  - B2.6: a legal flip changes the whole sorted angle vector, not only its minimum (`TriangulationGraph.host.test.tsx`).
  - B3.4: the chapter states the illegal-edge quadrilateral is always convex in SL and EN, and the lesson cites de Berg et al. (`triangulationChapter.test.ts`).
  - B3.8: Delaunay triangle selection by keyboard alone (`DelaunayGraph.host.test.tsx`).
  - 14.3: `PresetCatalog.test.tsx` already lists both collection keys; no change.
- **Other partial rows** needed browser evidence; the smoke covers them.
- **`just check`** at `e3f90da5` with the gap edits in the tree (identical to `3ce8cc3f`): typecheck, lint, unit 8641 passed and 5 skipped in 485 files, and the production build all pass ([log](f6-t2-check.log)).
- **Bilingual smoke:** [f6-t2-smoke.md](f6-t2-smoke.md), Sonnet `bezeg-smoke` against the production preview on port 4313 built from that tree. 20 cells passed, 0 failed, 0 blocked, 1 skipped by design (preset on `point-set-triangulation`; run on `delaunay`), 1 not applicable (that route has no trace; the flip workflow was tested instead). No console or page errors.
  - Both routes: deep link and reload, refusals, keyboard-only use with a visible focus ring, SVG/PNG export in SL and EN (Delaunay with its circle overlay), the SL and EN lesson walks with back and exit restoring the scene, the live SL→EN switch mid-lesson, and the chapter page in both languages with all three Learn links.
  - Delaunay: trace Next/Play/Pause/Reset, an edit resets to the first step and pauses, preset save/reopen/delete.
- **Hosted CI:** the runs for `2512429b` and `e3f90da5` were superseded by later pushes (one unit shard cancelled, so the "Require every check job" gate shows failure); every job that ran passed. The run for this record's push, `22254d51` (run 41529409890), passed every job.

## Gaps and notes

- At 1280×720 the app header takes about 320 px, so the board falls below the fold and the trace controls need scrolling; board labels are about 11–12 px. This is the shared shell layout, as in T1.
- In lesson mode at 390 px the Delaunay determinant table is 406 px wide and scrolls inside its panel; the document width stays 390 px.
- After a lesson exit the URL keeps `learnChapter`/`learnSection` (shared Learn runtime, as in T1).
- Fewer than three points and all-collinear points share one refusal message ("fewer than three points or all on one line"). The spec names no separate message, and the matrix rated the refusal rows covered; a split would be a later wording choice, not an acceptance gap.
- Not exercised: mouse drag and board clicks on edges or triangles, touch, the `point-set-triangulation` preset round trip and its lesson at 390 px. PNG was judged by size and dimensions only.
