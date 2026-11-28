# Lane L32 (epicycles): partial handoff

## Done
- Pre-conversion markers (text unchanged): status sentence `data-readout-note`, cap and chord-fallback notes `data-readout-note`, playback group, term table and handle fields `data-parity-retained`. Parity recorded: `src/graphs/functions/__parity__/epicycles.json` (9 states), sample in `parity.test.tsx` (end of SAMPLES) with accepted `extra` rows centre/circle-1..3. `BEZEG_PARITY_CHECK=1 BEZEG_PARITY_ID=epicycles` passes.
- `EpicycleGraph.tsx`: `EpicycleIds`, `parameterBindings` (`epicycle-n` count, `epicycle-parametrization` choice), `declaration()` (rows centre + circles 1-3 by rank, notes n-cap/chord-fallback/status in the panel's DOM order, legend of 7 entries, marks = loop box), `drawnObject` (named curves; vertices/controls from the model), `renderLegend` null, N group in `PuckOwnedGroup`, parametrization disclosure in `PuckOwned`, status wrapped in `data-declared-panel`.
- Fragment `src/localization/fragments/epicycles.ts` (5 keys) registered in `fragments/index.ts`.
- `EpicycleGraph.declaration.test.tsx` (9 tests pass). Red check: row value +0.01 failed the rank test (`"0,8106"` vs `"0,8206"`); restored.
- Lessons: `epicyclesGuidedLessons.ts` frames per step (declare via `frameDeclarer<EpicycleIds>`), prose names the controls in epi-diamond and epi-uneven-chord, "tabeli" -> "odčitkih" in epi-radius/epi-add.
- graph-check: contract, parity, declaration, shared pass; golden FAIL (see below).

## Placement
Pucks: N (epi-diamond "povečaj N", epi-explore), parametrization (2 options, epi-uneven-chord compare, epi-explore). Orodja: example (6 options), time, playback, handle fields, table of all terms (lessons also read it).

## Golden diff (not re-recorded)
default / epi-radius / epi-trace: notes golden [] now the status sentence (new `data-readout-note` marker); outputs golden ["0"], ["1,57"], ["3,14"] now [] (time slider under `data-parity-retained`). Other states equal. Handler re-records.

## Unverified / next
1. tsc after my last edit (removed 3 `graph.model` lines from the declaration test; earlier 3 TS2445 errors were there). Other tsc errors are L31 kinematics.
2. `just unit src/graphs/functions src/graphs/analysis src/graphs/base src/learning/content src/localization` was running in the background (log `.command-logs/l32-unit.log`); result not read. Check the declarationContract frames for epicycles, `epicyclesGuidedLessons.test.ts` (prose changed), `EpicycleGraph.host.test.tsx` (tests reading `epicycle-term-count`/N slider inside the owned group, Orodja controls moved), `PlaybackRoutes.test.tsx`.
3. `just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t epicycles`.
4. eslint on changed files; `just graph-check epicycles --route /bezeg-2.0/analysis/epicycles`.
5. Shots at 1440x900 / 1280x720 per lesson step (`.command-logs/l32-*.png`), no "Prizora ni mogoče pripraviti"; check legend/card cover over the loop and circles.
6. `just build`, `just smoke-lesson epicycles --port 4391 --workers=1`, specs naming epicycles.
Minutes: not tracked.

## Session 2
- Host test rewritten for the new layout (`EpicycleGraph.host.test.tsx`): cutoff and parametrization are pucks (`puckControl('epicycle-n')`), cap and chord-fallback notes read from `getDeclaration().notes` (they live in the declaration card, not the panel); first-use test no longer orders the cutoff in Orodja, term count asserted via the status line.
- `EpicycleGraph.tsx` `viewMarks`: box now includes vertex and cubic control handles (the 390px smoke walk found control (0.55, 2.15) outside the view on steps 6, 7, 9 of the uneven loop); smoke-lesson passes after.
- Checks (observed): tsc clean for my files; eslint clean; unit dirs 7577+ passed after last code edit (final run passed; one type-only `!` edit in the host test came after, tsc/eslint clean, host test passed before it); FirstTask, preset round trip epicycles passed; build passed; smoke-lesson epicycles passed (2 tests); graph-check: golden still FAIL (expected, handler re-records, see Golden diff), other rows pass.
- Shots 1440x900 and 1280x720, all 19 frames: no scene error, no board circle/text under a card; viewed steps 5 and 7 at 1280 (pucks N and parametrization sit under the board, card clear of the loop). Shots kept as `.command-logs/l32-*.png`.
- Not run: other specs naming epicycles (only guided-lessons spec does); no smoke beyond the lesson rows.
