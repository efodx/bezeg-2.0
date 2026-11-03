# F6 acceptance: sweep S3 (C5 Fortune's algorithm)

Handler: geometry handler 47 (Opus 5.5), 2026-11-03. Spec: [sweep-line algorithms](../../../specs/sweep-algorithms-lessons.md) C5 and the batch-wide gate. Tasks: [sweep-algorithms 22–26](../../../tasks/sweep-algorithms/README.md). Template: [f6-t3-acceptance.md](f6-t3-acceptance.md).

**State: accepted 2026-11-03 (geometry handler 48).** The one open item from handler 47, the `fortune` poster recapture after the C-7 current-event highlight, is done (see Poster below). S3 is released.

## Evidence

- **Criterion-to-test matrix:** [f6-s3-evidence-matrix.md](f6-s3-evidence-matrix.md). It was drafted by a Sonnet `bezeg-worker`, which handed off at its budget. It has 108 rows: 76 covered, 24 partial, 4 missing and 4 browser. Its Gaps table is closed as follows.
- **Spec contradictions, settled by the handler (`7a6e650e`):**
  - C-1 says an edit resets the step to 0. Task 23 had already decided that a drag or edit keeps the step, clamped, and pauses playback; the graph and its tests do that. The spec now states this as the C5 exception to C-1.
  - Acceptance 3 now allows a cancelled event with an empty circumcircle only for four or more cocircular sites, when an executed event with exactly the same centre gives the vertex. This is acceptance 4's "one vertex". The kernel's `checkRun` asserts exactly this disjunction.
- **Docs gaps (`7a6e650e`):** in `docs/capabilities.md`, the stale "route registration is sweep task 24" cell is now `/compgeo/fortune`, and the row names the lesson and chapter section. `GLOSSARY.md` gains *Fortune's algorithm (Fortunov algoritem)* and *Site event (dogodek mesta)*, using the lesson's terms.
- **Test gaps:** two `bezeg-worker` slices (Sonnet). Every new assertion failed on a deliberate product mutation that was then reverted; the logs are `f6-s3-g1-mut1..12`, `f6-s3-g2-mut1..8` and `f6-s3-g3-mut1..5`.
  - **G1 (`1a16beb2`, `FortuneGraph.host.test.tsx`):**
    - every example button (A–D, without D, collinear: 3 lines and 0 vertices; cocircular: vertex (0,0) of high degree with 4 rays; random: 12 sites);
    - the "drawn approximately" note in SL and EN;
    - C-1: a drag during Play stops playback and keeps the step;
    - C-2: Reset, and Preset import with a stale step clamped (through the importer and through `importPresetData`);
    - C-5: an arrow key moves a site one grid step, and a 13th site is refused in SL and EN.
  - **G2 (`b4311e6e`):**
    - C-3: Play equals Next at all 8 steps;
    - C-4: the seven scenes in English;
    - acceptance 5: beach-line continuity over 9 site sets (arcs meet at breakpoints, no gap above the sampling step, the box width is covered);
    - breakpoint comparison at \(10^{-12}\) from irrational roots, against BigInt squaring;
    - the tie-rule sentence, pinned in SL and EN.
- **C-7 defect, found by G1 and fixed in `1a16beb2` (G3, a Sonnet `bezeg-worker`, reviewed by the handler):**
  - **The gap:** the board marked nothing for the event processed at the current step.
  - **The fix:**
    - A site event now gets a ring in `constructionAccent`.
    - An executed circle event gets its circle drawn thickest (width 5, following the Bentley–Ottmann convention) and a ring on the new vertex.
    - The side list shows a separate "Trenutni dogodek (pravkar obdelan)" / "Current event (just processed)" item, with `aria-current`.
    - Step 0 and `done` show nothing.
  - **Ownership:** the highlight objects come from three reuse pools of 0 or 1 object each, created once, so drags add no objects; the pools are removed on dispose.
  - **Why the current event is computed correctly:** a step is exactly one pop plus its consequences (`fortuneSteps`), so `steps[at-1]+1` is the event of step `at`.
  - **Checks:** focused unit 77 files and 1279 tests passed; tsc, eslint and the build passed.
- **Degenerate inputs (acceptance 4):**
  - Collinear and cocircular sites are shown by the example buttons.
  - The lesson edge case states the note in SL and EN: parallel lines and no vertex for collinear sites; one vertex of degree 4 for four sites on a circle; the buttons named.
  - Equal sites are refused with "Mesti B in D sta enaki; premakni eno od njiju." / "Sites B and D coincide; move one of them.". The point stays where it was put, and the run is refused (C-6).
  - The graph itself shows no separate note for the collinear and cocircular cases. This is optional and was not done.
- **Bilingual smoke:** [f6-s3-smoke.md](f6-s3-smoke.md), a Sonnet `bezeg-smoke` worker against the production preview of `1a16beb2` on port 4323.
  - **Overall:** 10 of 11 checks passed in SL and EN. Check 5 is partial only for the two observations above. There were no console or page errors and no horizontal scroll at 390×844, and the exports have valid PNG signatures.
  - **C-7, seen in both languages:** a ring on the site at site steps; the thick executed circle with a ring on the vertex at step 6 of 8, while the cancelled circle stays dashed.
- **Chapter and focus return:** [26-acceptance.md](../../sweep-algorithms/26-acceptance.md), at 1440×900 and 390×844 in SL and EN.
- **Performance:** [23-perf.md](../../sweep-algorithms/23-perf.md) gives a median of 16.7 ms.
  - Rerun with the highlight on the `1a16beb2` build (`node scripts/fortune-browser-perf.cjs current-event`, 3 runs, [raw](f6-s3-perf-raw.txt)): median 16.7 ms, p95 16.7 ms, max 33.3 ms (one dropped frame in run 1), move-to-frame median 7.8 ms. The beach line is still one board object.
- **Poster:** handler 48 recaptured `fortune` selectively against a production preview of `f124a3b3` (with `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`, jointly with Curves' pending `bspline-nurbs`; [log](48-capture.log)). The recipe is unchanged, and the capture now frames 25 objects. Viewed by eye: the C-7 ring is on D's site on the sweep line, the dashed false-alarm circle is crossed, and the circles are round.
- **Checks:** `just check` at `b070f202`, before the F6 changes: 546 files passed (2 skipped), 9951 tests passed (7 skipped), and the build passed ([log](f6-s3-check.log)). The post-rebase checks for the push are in the stream row.

## Notes

- Graph Reset returns to step 0 and keeps dragged sites. C-2's "default example" applies to lesson Reset, which the shared lesson runtime owns.
- An aria-live announcement may lag briefly after adding sites (smoke observation, unconfirmed).
