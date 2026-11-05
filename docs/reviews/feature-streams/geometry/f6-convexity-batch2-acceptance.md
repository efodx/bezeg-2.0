# F6 acceptance: convexity Batch 2 (A3, A5, chapter sections)

Handler: geometry handler 51 (Opus 5.5), 2026-11-05. Spec: [convexity and hulls](../../../specs/convexity-hulls-lessons.md) A3, A5 and its [batch-wide acceptance gate](../../../specs/convexity-hulls-lessons.md#batch-wide-acceptance-gate). Tasks: [convexity 18–23](../../../tasks/convexity-hulls/README.md).

**State: accepted 2026-11-05** at `a523c029`. This releases convexity Batch 2.

## Evidence

- **Criterion-to-test matrix:** [f6-convexity-batch2-matrix.md](f6-convexity-batch2-matrix.md), from a Sonnet `bezeg-reviewer` that read the files without running them. It has 15 COVERED rows, 6 PARTIAL, 2 MISSING and 1 N/A.
  - Both MISSING rows are closed: `GLOSSARY.md` has Winding number and Even–odd rule, and `docs/capabilities.md` lists the two routes. The reviewer also said Batch 1's routes were absent from `capabilities.md`; that was wrong, they are at its "Computational geometry" rows.
  - The browser PARTIAL rows (both languages, refresh, poster, projection, export) are covered by the smoke below. A5.4 ("not that doubles always fail") is wording, checked by the diff review. Gate 4 is covered by `just check`.
  - The matrix's `docs/current-architecture.md` row: the file named `inexactOrientation.ts` but not `pointInPolygon.ts`, now added. A3.2's "nearby ray" test uses a \(1/1024\) dyadic lift, not a general nearby ray.
- **Diff review:** one Sonnet engineering and mathematics review of lesson A5. It recomputed the Kettner grid with doubles: 112 wrong signs, 2052 false zeros, and at \(i=41,j=48\) the double value \(-5{,}684\times10^{-14}\) against the exact \(84\cdot2^{-53}\approx9{,}33\times10^{-15}\). It found one defect, a Slovenian grammar slip, repaired before the commit.
- **Lesson smoke:** `just smoke-lesson hull-robustness point-in-polygon`, four rows, passed on the rebased tree.
- **Bilingual smoke:** [report](../../convexity-hulls/f6b2-smoke/report.md), from a Sonnet `bezeg-smoke` against the production preview. About 50 checks passed and 2 were reported as failed; neither is an app defect:
  - **Scene restore was a fault in the smoke script.** It clicked Exit, which opens a confirmation, and read the state with the dialog open. [`restore-confirmed.cjs`](../../convexity-hulls/f6b2-smoke/restore-confirmed.cjs) clicks "Exit and restore graph": all five cases restore, including `convex-hull` as a control ([log](../../convexity-hulls/f6b2-smoke/restore-confirmed.log)).
  - **Arrow keys on the "Select point q" button do nothing.** That button only selects. Arrows act on the focused board, and that path passed for the query point and the Kettner cell. Recorded as a note, not repaired.
- **F5 posters:** a Haiku review plus the handler's own view. `hull-robustness` matches its caption. On `point-in-polygon` the crossing number sat on the vertical edge. The cause was in the graph, so it also affected the live board: the number was centred above the crossing. `36e48360` moved it beside the crossing and `a523c029` recaptured the poster, viewed by eye.

## Added during this batch

The `set-panel` lesson action, so that steps 5 and 6 of A5 show the inexact and exact maps from the scene. `lesson: false` is gone from both Demonstrations, and the no-lesson list is empty.

## Gaps and notes

- A5 step 3 scenes `<=`; the learner switches to `<` with the control, because a step has one scene. Step 2 cannot hide the rule line. It hides the trace, hull and output.
- The exact value \(+9{,}33\times10^{-15}\) is not rendered, only the exact sign. The test checks the quoted value against a BigInt reference.
- On `point-in-polygon` at 1366×768 stacked crossing numbers sit beside the \(P_4\) label: cluttered, but not on the edge.
- Focus return was checked through "Return to chapter", not through the lesson's Exit.
- Keyboard, Preset and export checks ran in English only. Lesson text ran in both languages.
- No physical touch device. Projection readability was judged from screenshots.
- `just check` was not rerun after any later rebase; hosted CI covers the pushed commit.

## Final check

`just check` at `a523c029` passed in 969 s: typecheck, lint, all units and the production build (dirty only with docs and untracked logs). A first run failed at lint on three untracked throwaway smoke scripts, which were moved out of the repo; `just lint` scans `docs/reviews`, so a smoke worker's scripts there must lint or be removed before F6.
