# f2a-phase-03 FINAL EVIDENCE (PhasePortraitGraph and LogisticMapGraph)

Everything is uncommitted. Files: `src/dynamics/phaseModel.ts` (+ test), `src/graphs/dynamics/PhasePortraitGraph.tsx` (+ test), `LogisticMapGraph.tsx`, `LogisticMapGraph.test.tsx` (54 tests), `LogisticMapGraph.perf.test.tsx` (opt-in), `phase_graph_*` keys in `sl.ts`/`en.ts`, ADR 0054 section 2 measurement, `docs/tasks/phase-portraits/README.md` and `03-graphs.md` status.

## Defects found by the new tests, fixed in LogisticMapGraph.tsx
1. The "still" curves (frames, diagram, marks; `needsRegularUpdate: false`) were never drawn: JSXGraph skips them in every update, so their data stayed empty. `curve()` now draws a still curve once at creation (`needsUpdate = true; update().updateRenderer()`). Caught by the diagram test (dataX empty) and the rebuild test.
2. A write that changed no stored field (the host's `initialized: true`) paused a playing run. `onStateChange` now pauses only when the stored content changed.
Also corrected in the test expectations (not defects): `formatNumber` trims zeros ("2,9", not "2,90"); the cursor r of R = 310 is the column's 3,1015; the rejected-hint text shows only for an in-range, off-grid value (3,456), a value outside the range shows the range hint.

## Checks (observed, after the last edit)
- `just unit src/dynamics src/graphs/dynamics`: 8 files passed, 2 perf files skipped; 183 tests passed.
- `npx tsc --noEmit --pretty false`: exit 0, empty output. `just lint src/dynamics src/graphs/dynamics`: passed. `just build`: passed (warnings present in its log).
- Trailing whitespace and control characters: 0 in the three graph files, both locale files and ADR 0054. `git diff -U0 -- src/localization | grep -E '^-[^-]'`: no removed lines.

## Mutations on LogisticMapGraph.tsx (each restored, `cmp` against the pre-mutation copy `.command-logs/ph03e-LogisticMapGraph.bak`, identical)
- Still-curve draw removed: diagram and rebuild tests failed. initialized-only pause guard removed: that test failed. Cursor reports R/100 instead of the column: 3 tests failed. Typed r clamped instead of refused: failed. Claimless threshold moved: 6 failed. `outsideWrite` never set: direct setState test failed. Reduced-motion branch removed: failed. Derived cache branch removed: derivation count test failed. Cycle markers shown for all R: failed. Cobweb vertical step wrong: failed. Diagonal caption emptied: failed. Hard-coded kind row string: failed (also the key-usage test). Row label emptied: failed. Marker not owned: ownership failed. Diagram made a regularly updated curve: failed.
- First run survived: the drag snap-back `setPosition` (a snap within the same grid cell was not tested) and the status `cancel()` at unmount (timer check was `<=`). Tests strengthened (drag 0,3704 keeps X = 37 and returns the handle; timer count must fall at unmount); both mutations then failed.
- Equivalent mutant, left: `"complete"` return of the transition (the controller's `maxIterations` ends the run too).

## Measurement (JSDOM PLACEHOLDER, in ADR 0054 section 2)
Raster build 4,9 ms; mount 202 ms; r change median/p95 3,9/6,7 ms (period detector) and 3,1/3,5 ms (cached); step change 2,8/3,3 ms. No browser numbers.

## Decisions and doubts for review
- Raster 400 x 200 (9111-point diagram), not the spec's 800 x 400. Cursor is not draggable; it snaps to a column and reports that column's r.
- Two panels on one board with unequal x/y units; the layout, caption overlap and the caption rows below the frame were not seen in a browser. The board's bounding box in jsdom differs from `VIEW_BOX` (aspect adjustment), so the box is not asserted.
- `locale count`: 51 `phase_graph_logistic_*` keys (the earlier note said 55).
- Period row uses the chaos onset 3,56995 as a cited constant; no period is claimed above it.
- Not verified: any real browser, touch, screen reader, smoke test (no route), real rendering performance. Playback uses a fake clock only.

## Review repairs

1. Done. Reset uses the shared `reset` label; `phase_graph_reset_label` removed from both locales. `phase_graph_time_help` now says Reset returns only the time to t = 0. Test: reset button by `t('reset')`, help contains "t = 0".
2. Not done (controls-stream gap). `PlaybackButtons` takes a graph reason only for `no-run` (`noRunReason`); the `reduced-motion` reason is fixed text ("Parameter premikajte z drsnikom"). Shared files untouched.
3. Done. `LogisticMapGraph.play()` returns under reduced motion (no jump); the Play button gets `reduced-motion` block; Next step stays available. Test rewritten (aria-disabled, step stays 0, reason shown, Next step works).
4. Done. Inset has visible endpoint tick labels (-8, 8, 32, -32; `data-inset-tick`). Test added.
5. Done. Ring legend now says "polna črta"/"solid"; ring-linear label already said "črtkano"/"dashed".
6. Done. `ring_value`, `cap_stops`, `status_parked`, `status_ended` rewritten count-neutral ("...: {value0}"), sl/en in lockstep.
7. Done. Per-instance `helpId` (module counter); test with two mounted graphs.
8. Done. Claimless text uses `r >` in sl and en.
9. Done. `periodAt` throws RangeError for non-grid R before lookup; `periodCacheSize()` exported; test. Note `logisticMap` already threw earlier, so the guard is defence in depth; the test cannot distinguish the two throw sites.
10. Done. `STORED_FIELDS` exported; test compares with an exhaustive `Record<keyof PhaseState, true>`.

Checks: `just unit src/dynamics src/graphs/dynamics` passed; lint passed; build passed; whitespace/control-char greps clean; tsc shows only errors in src/graphs/solids/SolidsGraph.test.tsx (other worker). No pre-fix failures were observed for items 4-10 (tests written with the fix).
