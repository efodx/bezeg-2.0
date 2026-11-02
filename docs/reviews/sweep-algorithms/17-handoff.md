# Task 17 handoff (partial)

## State per item
1. Trace stepping: done. `monotoneTriangulationRun.ts` (partition steps incl. its `done` = boundary step, then each piece without `phase`/`done`, last piece keeps `done`). C3 example: 44 steps, boundary step 14, first piece starts at 15, second at 29. Tested.
2. Board: done in `MonotoneTriangulationGraph.tsx` (`drawOverlay`, names `monotonetri-*`): piece outline, chain labels (text + marker shape + colour), ring on current vertex, hollow squares on stack, test pair line + label, diagonals, finished triangles. Not seen in a browser.
3. Side lists: done (`MonotoneTriangulationLists`; prefix `monotone-triangulation`; `aria-current`).
4. Readouts and comparison panel: done (`MonotoneTriangulationControls.tsx`), counts shown at done only (C3: monotone 11, ear clipping 21).
5. Monotone input: done; "already monotone" text from the boundary step on.
6. Refusals reused from task 16; Presets: C3 examples 1, 2 plus Example 3 `(4,0),(8,2),(6,4),(9,7),(5,9),(1,8),(3,6),(0,5)` (no partition diagonal, 2 visibility tests, counts 13 vs 58, 6 triangles). Own key `compgeo-monotone-triangulation`.
7. Localization: `monotonetri_*` block after `monotonepartition_invalid_step` in sl.ts and en.ts (CRLF kept).
8. Tests: `monotoneTriangulationRun.test.ts` (9 pass), `MonotoneTriangulationGraph.host.test.tsx` (13 pass).

C3 stacks per step match task 15 ([5],[5,4],[5,1],[] for piece 1; [3],[3,4],[3,4,1],[] for piece 2).

## Files touched
New: `src/graphs/compgeo/MonotoneTriangulation{Graph.tsx,Controls.tsx,Graph.host.test.tsx}`, `monotoneTriangulationRun{.ts,.test.ts}`, `monotoneTriangulationPresetCollection.ts`.
Hooks: `monotonePartitionRun.ts` (`partitionRunOf`), `MonotonePartitionGraph.tsx` (`buildRun`, `sweepControls`), `MonotonePartitionControls.tsx` (exports), `monotonePartitionPresetCollection.ts` (optional `key`). Locale: sl.ts, en.ts.
Backups of the originals: /tmp/mpr.bak, /tmp/mpg.bak, /tmp/mpc.bak, /tmp/mppc.bak.

## Checks run
`npx tsc --noEmit` clean (run before the tests were written). `just unit` on the two new test files passed (logs 17-unit-run.log, 17-unit-host.log).

## Remaining, in order
1. `just unit src/graphs/compgeo --maxWorkers=2` (task 16 tests unchanged must pass).
2. `just lint` on touched files; re-run tsc (tests added since).
3. `just build`.
4. Mutations, each observed failing then reverted and diffed against a backup. Suggested: triangle-ready rule (`removes > 1`), step skipping of piece `phase`/`done`, stack/test readout, already-monotone condition, counts panel.
5. Smoke test of the board and panel by the handler. Nothing visual was verified.

## Mutations done
None.

## Final report (continuation worker)
Checks: `just unit src/graphs/compgeo --maxWorkers=2` passed (task 16 tests unchanged); tsc found one error in the host test (null in a string[]), fixed with `?? ''`, then clean; `just lint src/graphs/compgeo src/localization` passed; `just build` passed. Logs 17-unit-all/tsc/lint/build.log.
Mutations (each backed up, mutated, observed failing, restored from the backup; logs 17-mut-*.log): stack `.slice(1)` (10 failures), dead step `local = 0` (30), alreadyMonotone `=== 1` in run (6), `!alreadyMonotone` in panel (2), counts shown before done (2), resetTrace without step 0 (2), `removes > 0` (34), ready index swapped (2). All caught.
Derivation: exact for every kernel trace. In a vertex group the first status-remove is the bottom of the stack and never closes a triangle. Every later remove closes exactly one, since the kernel pops once more per triangle in all three branches. The diagonal report follows that remove exactly when the stack is not empty (always in the same-chain branch), which the `index + 1` rule reads. Counts and order match the kernel's triangle list, and a mismatch throws.
Open: nothing visual verified in a browser (smoke for the handler). Mutation of the sed-based edit-reset only covers Reset, not the edit path.
