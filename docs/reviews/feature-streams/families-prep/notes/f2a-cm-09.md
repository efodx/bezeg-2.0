# F2a complex-maps task 09 (ComplexPowerGraph, M6) - worker note

HANDOFF (partial, budget signal at about 136k). Nothing is committed. No test, lint or mutation has been run yet.

## Done (files, all new unless stated)
- src/complex/complexPowerModel.ts: state {A, B, n} (z = (A+Bi)/20, A,B in [-40,40], n in 1..8), DEFAULT (1+i, n=5), parse(unknown) with error codes (not-an-object, not-finite, off-grid, out-of-range, missing; with min/max/step), serialize ({re, im, n}), typedCoordinate/typedExponent (refuse), snapDragCoordinate, scene actions set-z/set-n/step (applyComplexPowerAction, strict), exact fractions/radical modulus, deriveComplexPower (uses the F1 kernel unchanged), insideView/arrowToward, superscript.
- src/graphs/complex/complexPowerPresetCollection.ts: Preset key 'complex-power', entry ['ComplexPower', {re, im, n}], localized actionable errors.
- src/graphs/complex/ComplexPowerGraph.tsx: graph (handle snapping, typed inputs, IterationController play/step/Reset=n to 1, pause rule incl. direct setState, status region, readout rows with data-readout ids z, n, re, im, modulus, angle, principal, real, unit, one; captions; legend rows with style words; `act(action)` for set-z/set-n/step, not registered in the shared LessonAction union).
- Locale: block `complex_power_graph_*` (57 keys) inserted after `levelsets_graph_lp_error_graph_state` in src/localization/en.ts and sl.ts with the Edit tool (other workers insert nearby, so anchor on that key, not on line numbers).

## Remaining, in order
1. Fix the one tsc error: ComplexPowerGraph.tsx ~line 209 `element.setArrow(...)` does not exist on JXG.Curve typings. Before that edit, the error was that the `curve` attributes object with `lastArrow: options.arrow ? ARROW : false` made `board.create` fall to the generic overload. Options: pass `lastArrow` only in a separate attribute spread typed as the create attributes, or draw the arrow as a `segment`/`arrow` between owned points. Then `npx tsc --noEmit --pretty false` (log .command-logs/cm09-tsc.log, only the 7 earlier errors were in this file).
2. Check `dec(num, 0)` for numerators up to 1.05e14 (formatNumber grouping) and the `sl` text.
3. Tests (none written): src/complex/complexPowerModel.test.ts (defaults, parse codes, serialize round trip, typed refusal, drag snap, actions in one tick, exactModulus against hypot**n, z^5 of 1+i = -4-4i, (1+i)^8 = 16 isReal, unit circle 0,8+0,6i, z=0); preset collection test (round trip, errors in both languages); src/graphs/complex/ComplexPowerGraph.test.tsx on the Logistic template (src/graphs/dynamics/LogisticMapGraph.test.tsx): mount, rows labelled, step/play/pause/reduced motion (`playback_block_reduced_motion`), pause on every stored change incl. direct setState, typed refusal and describedBy help, drag snap and NaN, status announcement, captions (legend text tied to curve dash > 0 for unit circle, 0 for path, face diamond/circle), out-of-view arrow and caption, ownership (mount, dispose/rebuild, unmount with the timer baseline as in src/graphs/recursion/RecursionCobwebGraph.test.tsx ~545, state change), cache not recomputed for language, locale lockstep + used-keys test over both the graph and the preset collection source, no hard-coded JSX text, `act` sequence set-z, set-n, step in one synchronous `act`.
4. `just unit src/complex src/graphs/complex/ComplexPower src/graphs/complex/complexPower`, `just lint` on those dirs, `git diff --check`, trailing-space and control-char greps, no blank line at end of files; one mutation per assertion group (backups .command-logs/cm09-<name>.bak).
5. docs/tasks/complex-maps/09-batch-d.md status line (F2a ComplexPowerGraph done, EulerCircleGraph open) after the checks pass.

## Decisions and doubts for review
- Reset sets n to 1 and keeps z (as the Logistic Reset keeps r); default n is 5 (the spec's first example).
- "on the unit circle" is decided by A^2+B^2 = 400 (equivalent for every n; squaring the entries of z^n would pass 2^53); "real" and "= 1" use the exact entries of `exactIntegerPower`.
- The file holds z as real `re`, `im` (0.05 grid) rather than integer units.
- Slovenian help and error texts use the second person singular ("povleci", "vnesi"), copied from the isometry block; check against the neighbouring blocks (solids uses "Vnesite").
- Unchecked: everything runtime (no test, lint or browser run yet); the arrow-head attribute; legend spacing below the board.

## FINAL EVIDENCE, ComplexPowerGraph (worker 2)
- tsc clean for the power files; `just unit src/complex src/graphs/complex` 124 passed (9 files); `just lint` passed; diff/whitespace/control-char checks clean. No build, no browser.
- Product defects found and fixed: (1) arrow end points created implicitly by `board.create("arrow")` outlived the scene (+14 objects after dispose); now owned (ComplexPowerGraph.tsx, after the arrow). (2) tsc: arrows are `arrow` elements (curve attributes lack `lastArrow`).
- Mutations (14, each failed the tests, restored, cmp identical): snap floor, radicand parity, off-grid check, step clamp, unit circle (first survived; added the (10,10) case), outside-write pause, dash, reduced-motion block, arrow-point ownership, cache, face, drag listener, preset entries, graph-state check.
- Test finding: the preset file errors show range and step in point notation in both languages (by design in the collection); an out-of-range typed value shows the field's built-in hint, the off-grid one the `z_rejected` text.

### Decisions and doubts for review
- Earlier decisions (Reset n=1, unit circle via A^2+B^2=400, second-person Slovenian help) stand and are unreviewed.
- Number fields are labelled plain ("Re z"), not with `number_field_label`.
- Unverified: browser look of arrows and legend spacing, the Slovenian wording.

## Review repairs

Checks: `just unit src/complex src/graphs/complex` passed, `just unit src/localization` passed, `just lint` passed, `npx tsc --noEmit` 0 errors, whitespace and control-char greps clean. Not run: build, browser. Not observed failing before the fix except the changed old assertions (velocity/acceleration decimals, legend scale text); the new tests passed on first run.

1. Done. ComplexPowerGraph.tsx statusText: "=" only when Re and Im of z^n are whole numbers, else new key `complex_power_graph_status_approx` ("≈") with 4 significant digits (`significantComplex`). Test: "a tiny power is never rounded to a bare 0" (z = 0,05 + 0,05i, n = 8 reads "z⁸ ≈ 6,25·10⁻¹⁰").
2. Done. `exactWithDecimal` uses `formatSignificant(…, 7)`; same test checks the re readout.
3. Done. Euler `vectorText` (7 decimals) for velocity and acceleration rows; tests updated (`−1 + 1,7320508i`, `−3,4641016 − 2i`).
4. Done. `accelerationScale(ω) = 0,9/ω²` in eulerCircleModel.ts (replaces the fixed 0,1 constant); the arrow is always 0,9 long, tip at 0,1·point; legend states the scale (0,225 at ω = 2, 0,05625 at ω = 4). Tests: model "drawn acceleration arrow is 0,9 long", graph tip test over ω 1..4 and four angles.
5. Done. Both preset collections format bounds with `currentLanguage()`. Test: sl off-grid message has "0,05". Euler ranges are whole non-negative numbers, so its text is unchanged; no extra test.
6. Done. φ field stays hidden outside product mode; `euler_circle_graph_mode_help` now names it (sl/en). Test: field absent, help contains "φ".
7. Done. Playback group "Enakomerno kroženje" / "Uniform circular motion"; power readout title "Moivreova formula: potenca števila z" / "De Moivre's formula: power of z".
8. Done. Euler legend stacks only visible rows (`rowOffset`, pitch shrinks to keep the last row inside the board); VIEW_BOX bottom -4,8, ROW_PX 16. Power legend is always four rows (no hidden rows); VIEW_BOX bottom -3,9, ROW_PX 16. Tests: even pitch, no gap, last row inside the 400 px shim board, five Euler modes. Real default board height not measured.
9. Done. Unit circle dash 4 (long dashes), projections 1 (dotted), acceleration 5 (dash-dot), velocity solid; legend words "dolgo črtkano" and "črtkano-pikčasta puščica". Test: four distinct patterns and words.
10. Kept: playback helpers stay duplicated between the two graphs; extract when a third graph needs them.
