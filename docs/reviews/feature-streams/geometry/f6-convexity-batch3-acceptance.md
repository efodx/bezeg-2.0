# F6 acceptance: convexity Batch 3 (A6 Back to Bézier)

Handler: geometry handler 55 (Opus 5.5), 2026-11-05. Spec: [convexity and hulls](../../../specs/convexity-hulls-lessons.md) A6 and its [batch-wide acceptance gate](../../../specs/convexity-hulls-lessons.md#batch-wide-acceptance-gate). Tasks: [convexity 24–29](../../../tasks/convexity-hulls/README.md).

**State: accepted 2026-11-05.** This releases convexity Batch 3 and completes the family.

## Evidence

- **Hosted CI:** run 41980663752 on `7d13c2b3` succeeded with every job executed: `scope`, `checks`, `build`, both `unit`, four `chromium`, `smoke` and `deploy`. It is the first full hosted run and deploy of Batch 3; earlier runs were cancelled or docs-only ([handoff 54](handler-handoff-54.md)).
- **Criterion-to-test matrix:** [f6-convexity-batch3-matrix.md](f6-convexity-batch3-matrix.md), from a Sonnet `bezeg-reviewer` that read the files without running them. The table has 31 COVERED rows, 9 PARTIAL, 0 MISSING, one COVERED / N/A and one for the handler. Handling of the PARTIAL rows:
  - **Shared-endpoint explanation of the \(8\) pairs:** closed. `compgeoBezierHullsLesson.test.ts` now pins it in both languages. Removing the English wording fails the test ([log](f6-b3-gaps-mut2.log)).
  - **Arrow keys:** closed. `CurvePairGraph.host.test.tsx` now moves a selected control point and reads the redrawn curve. Disabling `ArrowUp` fails the test ([log](f6-b3-gaps-mut1.log)). In the browser, Enter on "Izberi točko A_1" and ArrowUp on the board took \(y\) from \(4\) to \(5\), with no console errors.
  - **Exit restore:** covered generically by `GuidedLesson.test.tsx` (the checkpoint is restored on leaving) and for this lesson by the browser smoke, row 4.
  - **Final-scene handoff:** browser evidence only. The smoke shows the fields work after Skrij, and step 7 names that button.
  - **Step 1 reuse of `curve-visibility: convex-hull`:** not literal. The pair graph is a `PointSetGraph` subclass and draws the whole-curve hull with its own overlay ([task 25](../../../tasks/convexity-hulls/25-curve-pair-graph.md)). The spec's step, a curve inside its control hull, holds and is tested in `BezierHullsGraph.host.test.tsx`.
  - **Both languages, Gate 1, Gate 3, Gate 4:** covered by the browser smoke, `just check` and the hosted run. The poster was captured and viewed by eye in handler 54's F5 step.
- **Bilingual smoke:** [report](../../convexity-hulls/f6b3-smoke/report.md), handler 54, 10 pass, 0 fail: SL and EN, chapter at 1440 and 390, deep link and reload, Preset, drag at the last step, exports, focus return through the chapter link.
- **Pictures on the final build:** the lesson view margin came after those screenshots, so handler 55 recaptured all seven steps from this tree with the card hidden and read steps 1, 5 and 6. Hulls contain their curves, kept pieces thicken at the two crossings, and the single near-miss pair sits near \((5{,}5;\,1{,}7)\), all in view. Readouts: \(1\) of \(1\), \(4\) pairs with no verdict, \(2\) of \(4\), \(8\) of \(256\), \(1\) of \(256\), \(1\) of \(1\).
- **Reviews:** engineering and mathematics reviews per task (24–29, handoffs 52–54); their repairs are in.

## Added during this batch

`src/compgeo/curvePairSubdivision.ts`, `CurvePairGraph` (shared with Curves D2), `BezierHullsGraph`, lesson A6, the `bezier-hulls` chapter section and poster. `set-trace-step` now also serves this graph. `GLOSSARY.md` gains *Piece pair*; `docs/capabilities.md` and `docs/current-architecture.md` are current, including stale "no lesson" and "no poster" text for `hull-robustness`, `point-in-polygon` and `fortune`.

## Gaps and notes

- The lesson card covers part of the board at 1440×900, as in `hull-robustness`: platform behaviour, not an A6 defect.
- Koncaj in the chapter flow returns to the graph, not the chapter; the return link is what goes back with focus.
- The twin example runs \(A_1\) above the lesson view; "Prilagodi točkam" fits it.
- No physical touch device and no drag at 390 px. Projection readability was judged from screenshots.
- The keyboard browser check ran in Slovenian only.

## Final check

`just check` passed in 1102 s (`EXIT=0`, [log](f6-b3-check.log)) on `7d13c2b3` with this batch's two tests and docs in the working tree. A first run failed in 67 s with `'vitest' is not recognized`: `npm test` cannot find local binaries when started from the Bash tool's Git Bash, and the same command passes from PowerShell. That says nothing about the code.
