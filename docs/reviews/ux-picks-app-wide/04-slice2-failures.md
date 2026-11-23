# Task 04 slice 2: unit suites failing after the Orodja card (after slice 2b)

Run: `just unit src/graphs src/learning` with the tools card as a live item (renders in the first commit, never waits for the measure pass): 119 of 768 files fail, 808 of 14938 tests (was 286 files, 4234 tests). `just unit src/workspace src/graphs/base` alone: 3 files fail (BaseGraph.escape 3, CurveWorkspacePoints ~16, sharedControls.graphs 14 tests).

## Cause (one, confirmed on `decasteljau` and by a trial)

The old tests queried controls the moment they mounted; that now works. What remains: in jsdom `installBoardShims` (`src/graphs/base/realGraphTestHarness.tsx:27`) gives EVERY element, the board layer and the cards included, a 600 x 400 rect. Orodja then measures 600 x 400 in a 600 x 400 board, layout rule 5 (no room) folds it, and its body is `hidden`, so role queries ("Predvajaj", "Točka 1, x", "Prikaz", count groups, lesson "Naslednji korak" in the tools card) find nothing. The card is shown, positioned, folded.

Trial (reverted, not committed): in `installBoardShims` replace the rect with
`board-cards-layer` -> 1400 x 900, `[data-card-id]` -> 300 x 300, others 600 x 400. Rerun of `src/graphs/base`, `random/SimulationGraph`, `recursion`, `patches`: 19 failures in 3 files remain (was ~120 in those folders): `patches/TensorPatchExport.test.tsx` 1, `random/SimulationGraph.test.tsx` 3 ("Prikaz" combobox, "Ponovi"), `recursion/GrowthGraph.test.tsx` 15 ("Predvajaj"; probably a declared graph whose tools start folded under the 1-open budget at this size: the test should open Orodja or the harness board should be 1200+ wide, which gives 2 open cards).

## Proposed per-suite / harness change (handler migrates)

1. `realGraphTestHarness.tsx installBoardShims`: the board-layer and card rects above (board >= 1200 wide so the two-card budget applies). Expected to clear most of the 119 files.
2. Remaining files after 1: open Orodja with the helper used in `BoardCards.test.tsx` (`openTools`), or assert on the card, per file.

Files still failing at this run (count of failing tests): see the list kept in the run log `.command-logs/2026-11-23T08-50-02-888Z-40452-952dc344.log`; top: SimulationGraph 36, RecursionCobwebGraph 35, GrowthGraph 32, typedPointPaths 29, LinearMapIteration.host 24, EulerCircleGraph 24, PointSet.sharedControls 22, TriangularPatchGraph 21, ContourMapGraph 20. By folder: `src/learning/content` 15 files, `graphs/compgeo` 14, `functions` 11, `patches` 10, `projective` 7, `curves/bezier` 7, others <= 6.
