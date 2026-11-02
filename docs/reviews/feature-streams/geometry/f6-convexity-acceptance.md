# F6 acceptance: convexity Batch 1 (A1, A2, A4, chapter `convexity-hulls`)

Handler: geometry handler 27 (Opus 5.5), 2026-11-02. Spec: [convexity and hulls](../../../specs/convexity-hulls-lessons.md) A1, A2, A4 and its [batch-wide acceptance gate](../../../specs/convexity-hulls-lessons.md#batch-wide-acceptance-gate). Tasks: [convexity 07–15](../../../tasks/convexity-hulls/README.md).

**State: accepted 2026-11-02** at `e9f07099` (the repair below), on top of `0ba214ac`. This releases convexity Batch 1.

## Evidence

- **Criterion-to-test matrix:** [f6-convexity-evidence-matrix.md](f6-convexity-evidence-matrix.md), from a Sonnet `bezeg-reviewer` that read the files without running them, at `8be00ede`.
  - Every A1, A2 and A4 number in the spec is asserted, with no contradiction. That covers +8/−8/0, 21/8/18, the doubled 36/16/11, the pops −2, 0, −5, −2, the counts 72/504/5 and 35/5, and the n<3 and all-collinear cases.
  - The one MISSING row (glossary) and the PARTIAL capabilities row were fixed by handler 25. `GLOSSARY.md` has Orientation, Signed area and Convex hull, and `docs/capabilities.md` describes the three routes.
  - The other PARTIAL rows needed the browser. The smoke below covers them.
- **`just check`** at `8be00ede` (dirty only with docs and untracked logs): typecheck, lint, unit and the production build all pass ([log](../../convexity-hulls/f6-check.log)).
- **Bilingual smoke:** [f6-convexity-smoke.md](f6-convexity-smoke.md), from a Sonnet `bezeg-smoke` against the production preview at `62a18d6a`. Of 33 checks, 28 passed, 0 failed, 0 blocked and 5 were skipped by brief.
  - Covered: deep link, reload and catalog previews; the SL lesson with Back, exit restore and the final frame; the live SL→EN switch of lesson prose; keyboard-only A1 and A4; touch add at 390 px; SVG/PNG export; Presets; the chapter links in both languages; and the exact refusal inputs.
  - It reported two defects as observations, both acceptance problems:
    - The default example's \(P_5=(2,5)\) sat on the board's top edge on `polygon-area` and `convex-hull` at 1366×768 (gate 3, projection).
    - With \(n<3\), step 1 of all three hull algorithms used chain wording (A4.6/A4.7).
- **Repair `e9f07099`** (Sonnet `bezeg-worker`, handler diff review):
  - `HullTraceGraph` and `PolygonAreaGraph` override `initialView()` with the default example plus a half-unit margin.
  - A run that ends in `done-fewer-than-three` labels its output step `output-small`, shown with the new key `hulltrace_note_output_small` in SL and EN. The hull kernels are unchanged.
  - Regression tests:
    - Both graphs joined `compgeoDefaultView.host.test.tsx`. With the overrides removed, it fails for both.
    - A host test covers 1 point, 2 points and a duplicate for all three algorithms, plus the \(n\ge3\) chain note. With the relabel reverted, it fails.
  - `OrientationGraph` needs no override: its points stay at least one unit inside the default box.
  - Checks:
    - tsc, lint on the touched files, `just unit src/graphs/compgeo`, `just unit src/localization` and `just build`. All pass (`f6r-*.log`, untracked).
    - No full `just check` was rerun. The repair touches only these graph files, their tests and two catalog keys, and the focused checks above cover them. Hosted CI runs the full suite on push.
- **Repair recheck:** [f6r-smoke.md](f6r-smoke.md), from a Haiku `bezeg-smoke` against the production preview of the repaired tree (port 4313).
  - At 1366×768 every default point is inside the board, at least 67 px from each edge; \(P_5\) is 67 px from the top, on both routes.
  - With the points (0,0) and (2,1), all three algorithms show "Pri manj kot treh različnih točkah so vse točke oglišča ovojnice." After a live switch they show "With fewer than three distinct points, every point is a hull vertex."
  - The 9-point default still shows the chain note at step 55 of 56.
  - No console errors. In the two-point state the script counted one point marker of two. The screenshot shows both points: the selected one is drawn as a larger ringed marker, so this was a detection artefact.

## Gaps and notes

- On `convex-hull` at 1366×768 the trace step text and hull counts are below the fold (page height about 1755 px). On a projector the learner scrolls the panel to see them.
- On `polygon-area` an interior-point marker overdraws the "+12" label at (1, 1). Not fixed: the repair worker found it was not a one-line change.
- There is no skip link. On `orientation` the board is Tab stop 10 and the point list stop 36.
- The document title is "Bezeg" on every route (shared shell, not this family).
- After a lesson exit the URL keeps `learnChapter`/`learnSection` (shared Learn runtime, as in the T1/S1 record).
- No physical touch device: touch was emulated and tested with add mode only. There was no mouse drag; points were edited by number field and arrow keys.
- Projection readability was judged from screenshots only. The repair recheck ran in SL layout at one viewport and did not repeat keyboard or narrow-screen checks; the repair does not touch either.
