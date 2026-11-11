# f2a-rand-03 final evidence (F2a simulation graph)

Files (uncommitted): `src/random/randomModel.ts` (+test), `src/random/samplePaths.ts` (+test), `src/graphs/random/{SimulationGraph.tsx,SimulationGraph.test.tsx,simulationScene.ts,simulationScene.test.ts}`, the `random_graph_*` block of `sl.ts`/`en.ts`, six rows in `docs/tasks/randomness/README.md` (drugo seme, pikčasta črta, cel krog, čas med koraki, stanje, zgrešenih po zakonu), a Status section in `docs/tasks/randomness/03-simulation-graph.md`.

This round: read `rand03d-u4.log` (one failure: the RS2 second-plot test looked up counts 100 and 1000 in an n = 10000 curve that does not sample them; the test now builds one run per spec count, each the end of its own run). Graph tests added to `SimulationGraph.test.tsx` (14 new): overlay switch and second seed (modes offered, describedBy on both, dotted layer and two captions, readout row, refused values with message/aria-invalid/describedBy, `editSeed2` guard), overlay layers in galton/walk/markov, shape select, Slider (value, range, grid, refused values, help linked), faster playback on the fake clock, speed change does not pause (asserted), unavailable under reduced motion with the reason, reason absent otherwise, new captions in sl and en (no keys, no `{value`), frequency status with `value4`, caption-count rebuild with disposal back to the pre-mount count.

## Checks (observed)
- `npx tsc --noEmit --pretty false`: exit 0, 0 errors (combinatorics included).
- `just unit src/random src/graphs/random`: exit 0, 202 tests passed.
- `just lint src/random src/graphs/random`: exit 0. `just build`: exit 0 (warnings present, as before).
- Trailing whitespace (`grep -nP ' +\r?$'`, UTF-8 locale) over owned code and the two task docs: none.

## Mutations (each restored; `cmp` against `.command-logs/rand03e-<name>.bak` identical)
- lawbars (`m / top` scaled by 0.9 in the RS6 law bars): 2 tests failed.
- markovfrac (move caption numerator/denominator swapped): 2 failed.
- discquad (quadrant sign index fixed to 0): 1 failed.
- secondplot (`DIFF_HALF` 0.5 to 0.4): 3 failed.
- overlaylayer (`heap2` forced empty): 1 failed.
- stopinterval (`advance` compares to `PLAYBACK_STEP_MS` instead of `state.stopMs`): 2 failed.
- seed2guard (`editSeed2` without `snapSeedInput`): 1 failed.
- captionrebuild (caption-count condition removed from `syncBoard`): 2 failed.

## Measurements: JSDOM PLACEHOLDER, not performance results
Vitest/jsdom, one machine, temp bench file deleted; 15 runs for tally and first frame, every stop for playback frame (13 to 16 frames). First frame = exactFor + simulate + sceneFor (no drawing).

| mode, n | tally median / p95 | first frame median / p95 | playback frame median / p95 |
| --- | --- | --- | --- |
| galton 1e4 | 10.4 / 14.4 ms | 10.8 / 13.8 ms | 0.29 / 10.4 ms |
| galton 1e5 | 107.0 / 134.3 ms | 104.3 / 114.5 ms | 0.72 / 108.0 ms |
| frequency 1e4 (mode maximum) | 1.1 / 1.9 ms | 1.2 / 5.0 ms | 0.11 / 1.2 ms |
| area 1e4 | 2.1 / 3.4 ms | 2.7 / 3.9 ms | 0.16 / 2.5 ms |
| area 1e5 | 20.7 / 21.9 ms | 20.3 / 21.0 ms | 0.43 / 20.5 ms |

Each stop re-simulates its prefix, so the p95 playback frame is the last stop (the full run). Galton at 1e5 costs about 0.1 s at the final stop: a browser and phone measurement (F2b) decides whether prefix tallies must become incremental. Frequency was not measured at 1e5 (mode limit 1e4).

## Doubts for review
- Speed change does not pause playback (owner decision; asserted by a test).
- Task 03 step 5 supplies no seed field or Replay; `NumberInput` for the seed, `PlaybackButtons` Reset labelled `replay` (sets shown 0, does not play).
- An invalid seed is refused with a message, where the spec snapped it to 42 (shared rule).
- Drawn paths, points and intervals are the first of the run, not the latest (BigInt generator).
- `reduced-motion` playBlock text blames a slider; the slider now explains itself, Play under reduced motion shows the whole run.
- Overlay covers four modes (galton, frequency, walk, markov) and one extra seed, not five as RS2 step 5 suggests.
- The disc picture mirrors the stream's points into quadrants in turn; the tally is the quarter's (same share by symmetry).
- Old stored states without the four new fields are refused with the missing field named (no route or preset exists yet).
- The speed Slider help does not state its range (100 to 2000, grid 50); the range is visible in the slider and in the refusal text only.
- Oracle code (`centresOf`, quadrant counts, band index arithmetic, `missCountWindow`) is covered by the scene and model tests written by the previous worker with hand values; I re-ran them and mutated four of them, but did not re-derive each hand value independently.

## Not verified
- Nothing was looked at in a browser: caption positions on the Markov diagram, the interval law panel, the second plot; text overlaps and stretched boxes unchecked. No smoke test run. Browser and phone timings owed at F2b.

## Review repairs (worker, after three reviews)
Tests: `SimulationGraph.test.tsx` and `simulationScene.test.ts`, describe blocks "review repairs". Failing-before evidence: with `SimulationGraph.tsx` and `simulationScene.ts` restored to their pre-repair copies (`.command-logs/rand03f-*.pre`), 6 new tests failed (`rand03f-m1.log`: speed help, odd-n width, seed2 note, Markov dl, area captions, scene marks); sources then restored, `cmp` identical to `rand03f-*.post`. Tests that depend only on locale strings (95 % band, whole circle, law caption) were not run against the old catalog; the old strings differed literally.
1. Speed help: `SimulationGraph.tsx` Slider help with `dec(STOP_MS_*)`; catalog `random_graph_speed_help` "Dovoljeno: 100-2000 ms, korak 50 ms" (sl/en). Test "speed help states its range and step".
2. 95 % band: `random_graph_cap_band` "Pas 95 %" / "95 % band", `random_graph_r_band` "Pas 95 % za število grbov"; README term row added, "običajno odstopanje" row limited to 1 sd. Test checks caption, readout label and that the `typical` readout keeps "Običajno odstopanje".
3. `random_graph_cap_circle_whole`: "Cel krog: ista vzorčna četrtina, zrcaljena v štiri četrtine" (en "mirrored into the four quarters"). Test in both languages.
4. `random_graph_seed2_help` says same parameters, another seed; new `random_graph_seed2_same` shown by `readoutNotes()` (`[data-random-note]`) when overlay is on and seed2 equals seed. Test: absent, present, absent.
5. Markov note moved from the row list to `ReadoutHelp` via `readoutNotes()`; test A=B=100 and A=B=0: `dl` kept, at least 4 `dt`, note present.
6. Band `value2` now `dec(width, 1)`; test n = 9 gives "(± 4,5)"-style comma value.
7. Area: captions `inside` ("Velik križec: točka v krogu"), `outside` ("Majhen križec: ..."), `errorBar` in `areaScene`; outside plus marks are `OUTSIDE_MARK` = 0.5 of the inside size, stroke width 1 vs 3 (`LAYER_STYLES`). Tests: scene mark arm ratio and caption keys; graph captions present.
8. Law caption "(...; merilo: najvišji stolpec)" / "scale: tallest bar". Mean line at x = 49.5 is left of the law panel (starts at `LAW_LEFT` = 100): no overlap, now asserted in a scene test; the tallest bar reaching `LAW_HEIGHT` asserted too.
9. Hard-coded "A"/"B" replaced by `stateName(state.markovStart)`. The catalog strings equal "A"/"B", so no test can tell the old code apart (refactor only).
10. Verified, no fix needed: `#random-graph-input-help` occurs once per mode (all six modes tested); `ChoiceSelect` renders a visible `label` (tested for mode and start); a blocked Next press shows `[data-playback-reason="no-more-steps"]` with the catalog text (tested). These passed on first run; no mutation done for them.

Checks: `just unit src/random src/graphs/random` exit 0 (after repairs); `npx tsc --noEmit --pretty false` exit 0; `just lint src/random src/graphs/random` exit 0; `just build` exit 0; no trailing whitespace; no control characters in the edited files.
Not verified: browser look of the new captions (positions at x = left, y = 0.5, 0.4 and pi/4 - 0.1 may touch the estimate mark or each other), size contrast of inside and outside marks.
