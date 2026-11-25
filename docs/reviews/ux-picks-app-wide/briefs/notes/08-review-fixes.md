
## Batch B (worker)

- Items 1-7 done. Item 1: Bezier splines have knots normalized to [0,1], so only B-splines needed a domain; key adds weights, knots, degree, alpha, computed points. Item 5: Orodja `section` strings are free text (Ids.section is for cards), so Blossom Ids were already consistent; Elevation is now typed via exported BaseCurveIds. PointSet/BaseFunction ids are subclass-defined, no base id type exported.
- Red checks observed: B-spline end [2,2] vs [4,0]; knot memo same object; lease no throw; status idle vs paused.
- Full batch unit: 2 failures (my new tests), fixed; later reran base/runtime/FunctionInverse only: passed.

## Batch D (Taylor stroke)
New `src/graphs/functions/curveViewClip.ts` (+ test) clips the Taylor polynomial functiongraph path on its own line to the view +/- 1 view height (NaN breaks outside); wired in TaylorGraph.tsx. 20 count presses: 8.27 s (build before), master live 8.1 s, after 0.93 s. Board pixels (dash off) at degree 2/6/10: 0 / 792 / 792 px differ, max channel diff 1. Dash phase starts at the clipped point (not compared). Unit src/graphs/functions: all pass except a load-timeout in BisectionGraph.host (unrelated, first run); tsc, lint, build ok. Logs 08d-*.log, measure/count-puck/{before,after,master}.log.

## Batch A - tooling and baselines (PARTIAL, worker stopped at the context budget)

Done (unverified by unit runs except the golden re-record, which passed in `just unit`, 224 s):
- Item 3 markers: `data-readout-note` added (markup only) to the dynamic `<p>`/`<li>` of 22 panels (compgeo controls, euler/inscribed/inversion panels, point-in-polygon, orientation, bspline basis/extraction/insertion/nurbs, projective five-point/pole-polar/three-views; `StepCounter` hooks at the compgeo call sites; `ReadoutDetails` li). Scripted by `.command-logs/mark.cjs` (untracked).
- Item 3 re-record: 52 ids re-recorded (`BEZEG_PARITY_GOLDEN_RECORD=1`, `parityGolden.test.tsx` now accepts `BEZEG_PARITY_GOLDEN_ID="a b c"`). 24 of 52 now hold rows/notes/outputs. Still empty (28): bernstein curve-curvature curve-evolute curve-parametric elevation extrapolation repeated-subdivision subdivision bspline-blossom (declared; ws-note rendered by ReadoutsBody) curve-comb curve-envelope curve-offset spline-c1 spline-c2 spline-cn spline-g1-symmetric spline-g1 spline-parameterization uniform-parameterization weighted-parameterization circle farin rational-elevation rational-extrapolation rational-subdivision rational patch-decasteljau patch-tensor. Their panels show nothing visible besides static help; curvature/evolute/comb/envelope/offset have values only in a visually-hidden live region; rational family values are board labels (captions). Not an empty-golden function graph, so src/graphs/functions untouched.
- Item 2: `parity.ts` gains `goldenShowsNothing`, `parityNotApplicable`; new `goldenStates.ts` (candidateStates/lessonsFor extracted from parityGolden.test.tsx); `parityApplicable.test.tsx` rewritten (golden empty AND declaration empty in every scene). NOT yet run; red check not yet observed.
- Item 4: `inventory/08-partition.cjs`: unused `isSuite` removed, registries `activities.ts`/`guidedExamplePreviews.ts` excluded as lesson files (L45 -> L45, L56, L57; L55 -> L55, L58; ids kept stable), `sharedTests` per lane (SHARED_MAX 15), `done` lanes (L01 L05 L06, round 1) carried, `08-partition.json` regenerated.
- Item 5: priority lanes L38 (root-finding), L40 (bezier-clipping, point-set), L46 (arc-length etc.) are round 2; rounds now 2..22.

Remaining:
1. Item 1: rewrite `scripts/graph-check.cjs` (graph file from `inventory/inventory.json` `graphFile`; declaration test = that file's basename + `.declaration.test.tsx` exactly; parity recordings = names whose SAMPLES `demonstration` equals the id in `parity.test.tsx`, run with filter `parity recording (a|b) `; run the lane's `sharedTests` whole). Add a testable resolver + `scripts/graph-check*.test.cjs` (collision pair circle/circle-construction, per-mode linear-map) and add it to the `tooling-test` list in `scripts/commands.cjs`.
2. Item 4: `08-partition-table.cjs` must print `done` rows (status done) and the new round numbers; run it to refresh the Lane table in `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`.
3. Item 6: add to step 7 of that task file: `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx` (all ids).
4. Verify: `just unit src/graphs/base/declare` (observe parityApplicable red once, e.g. goldenShowsNothing using `some`), golden check on all ids, `just unit src/graphs/compgeo src/graphs/curves src/graphs/projective` (marker edits, not run), `npx tsc --noEmit --pretty false`, `just lint` on changed files, `just graph-check circle|circle-construction|linear-map`.
