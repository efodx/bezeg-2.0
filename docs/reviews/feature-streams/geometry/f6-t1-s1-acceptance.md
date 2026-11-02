# F6 acceptance: triangulation T1 (B1) and sweep S1 (C1, C2)

Handler: geometry handler 24 (Opus 5.5), 2026-11-02. Specs: [triangulations and Voronoi](../../../specs/triangulation-voronoi-lessons.md) B1 and its batch-wide gate; [sweep-line algorithms](../../../specs/sweep-algorithms-lessons.md) C1, C2 and its batch-wide gate. Tasks: [triangulation 06–10](../../../tasks/triangulation-voronoi/README.md), [sweep 02–13](../../../tasks/sweep-algorithms/README.md).

**State: accepted 2026-11-02** at `52fcef61`, which is `origin/master` `1b287a24` plus the commits below. This releases T1 and S1.

## Evidence

- **Criterion-to-test matrix:** [f6-evidence-matrix.md](f6-evidence-matrix.md), from a Sonnet `bezeg-reviewer` that read the files without running them, at `1b287a24`. Of 52 rows, 44 were covered by tests, 6 partial and 1 missing.
  - Every kernel item (B1.1–B1.7, C1.1–C1.4, C2.1–C2.6) has a named test that asserts it. The random tests stay within the spec's bounds: n ≤ 15 for ear clipping, n ≤ 10 for intervals, n ≤ 12 for segments.
  - ADR 0035 is accepted.
- **Missing row (batch gate, documentation):** `docs/capabilities.md` and `GLOSSARY.md` did not name the family. Fixed in `52fcef61`: six route rows and a family paragraph, the glossary terms Trace, Ear and Sweep line, and a corrected architecture line (it still said `lesson: false`).
- **Partial rows:** all of them needed browser evidence (English lesson walks and live switch, reload, figure export, keyboard, projection). The smoke below covers them.
- **B1.4 collinear refusal:** the smoke saw the generic non-simple message for its collinear placement. The smoke did not record the coordinates. Its message named touching edges 2 and 3, so the placement probably made adjacent edges overlap, which the kernel correctly classifies `not-simple` (`earClipping.test.ts:167-168`). A simple polygon with three collinear vertices gets the collinear message (`EarClippingGraph.host.test.tsx:268`).
- **`just check`** at `790f8440` (dirty only with docs edits and untracked logs; `src/` identical to `1b287a24`): typecheck, lint, unit 7844 passed and 5 skipped in 441 files, and the production build all pass ([log](f6-check.log)).
- **Bilingual smoke:** [f6-smoke.md](f6-smoke.md), from a Sonnet `bezeg-smoke` against the production preview on port 4313 at `790f8440`. Of 32 checks, 28 passed, 0 failed, 0 blocked, and 4 were skipped by design (export and 390 px were run on one route only).
  - Covered on all three routes: deep link and reload, the trace controls, edit resets and pauses, refusal messages, the SL lesson with a graph action, back, and exit restoring the edited scene, the EN lesson and the live SL→EN switch, keyboard operation, and Preset save/reopen/delete.
  - Covered once: SVG/PNG export on ear clipping, 390 px with no overflow, and both chapter pages in SL and EN.
  - No console errors. Screenshots are kept locally and not committed.
- **Hosted CI:** on `fb1d09e1` it fails only in `GraphTransientState.part2` (`inscribed-angle`, Maps) and `part3` (`patch-coons`, Curves), the same failures as on `b434374c`, before this run. Build, checks and every chromium smoke shard pass.
- **Test-only follow-up:** `b208e4aa` bounds the compgeo trace host tests' Next-step loops (mutation evidence in its message).

## Gaps and notes

- After a lesson exit the URL keeps `learnChapter`/`learnSection` (only `learn=1` is dropped). This is shared Learn-runtime behaviour, not this family's.
- Touch and mouse drag were not exercised; points were edited by numeric field and arrow keys.
- Projection readability was judged from screenshots only.
- The `segment-intersections` link on the sweep chapter page was checked by href, not clicked.
- Not done: convexity Batch 1 has no F6 record yet.
