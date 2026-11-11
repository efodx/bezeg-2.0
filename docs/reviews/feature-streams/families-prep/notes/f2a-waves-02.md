# f2a-waves-02 final evidence (waves graph)

Files (uncommitted): `src/waves/wavesModel.ts`(+test), `src/graphs/functions/WavesGraph.tsx`, `WavesGraph.test.tsx`, `src/graphs/functions/waves/**` (`wavesDerived.ts`+test), `waves_graph_*` block in `sl.ts`/`en.ts` (lockstep), term rows in `docs/tasks/waves/README.md`, status in `02-waves-graph.md`. Table row 02 set to done (uncommitted, awaiting review).

Fixes this round: removed unused `decimals` (now `_decimals`) and unused `graph` parameter in the test, removed unused `radians` import in `WavesGraph.tsx` (the three lint errors).

## Checks (observed)
- `just unit src/waves src/graphs/functions`: passed (log `.command-logs/wav02c-unit.log`). After the lint edits `just unit src/graphs/functions/WavesGraph.test.tsx` passed again.
- `just lint src/waves src/graphs/functions`: first run 3 errors (above), then passed.
- `npx tsc --noEmit --pretty false`: 0 errors outside `src/graphs/recursion` (other worker). `just build`: passed (warnings present, see log).
- No trailing whitespace and no control characters in owned files, both locale files, the two docs; `git diff -U0 -- src/localization` shows no removed lines; every `waves_graph_*` line is `"key": "value"`.

## Mutations (each restored; `cmp` equal to the `.command-logs/wav02b-<name>.bak` copy; each fails a test)
sampler, envelope, caption, clamp, pause, restore, refuse, antinode (amplitude), alias, dispose, live, cache, reduced (direct `graph.play()` check), help, driver, sumamp. The first antinode mutation (direction sign) was an equivalent mutant at antinodes. Outputs `.command-logs/wav02b-mut-1.out`, `-mut-2.out`.

## Playback measurement
JSDOM PLACEHOLDER, not a performance result; a browser measurement per docs/performance-plan.md is owed when the graph gets a route. Method: vitest/jsdom playback frames, timed with `performance.now()`, no rendering, not a phone. Sum median 3.36 ms, p95 4.73; standing 2.76 / 4.50; sampling with sinc (fs 64, f 40, extra 192) 3.71 / 5.68; a state change with sinc derive plus redraw 41,8 ms (log `.command-logs/wav02b-redraw.log`).

## Open
- Not smoke-tested in a real browser (no route). Arrow circles, panel layout and label placement need a smoke test.

## Decisions and doubts for review
Reviewer pointers: `WavesGraph.tsx:366-390`, `:486`, `:659-667`; the standing-mode resolution wording ("length 2 divided into 2048 parts", 2048 points over length 2, not per unit); the sinc state-change cost of 41,8 ms.
- Time modes plot value against time over a fixed window (sum 1 s, beats 2 s, sampling 1 s) with a playhead; the slider and playback stop at its end. Standing mode plots against position on length 2, period 1 s.
- Sum uses f1 for both waves; beats uses a1 for both and phases 0; sampling uses a1, p1, f1 only. Unused stored fields are kept, not validated against the mode.
- Phases stored in degrees on a 5 degree grid, amplitudes 0 to 4 step 0.25; WV5's 0.4 rad is not on the grid (tests use 25 or 45 degrees).
- Default axes hidden and replaced by an owned axis curve; `equalAxisUnits` false. Untested in a browser; arrow circles, panel layout and label placement need a smoke test.
- Playback at real time; a 23 Hz wheel is shown at real speed (display refresh aliases it); no slow-motion control. Doubt for the owner.
- `waves_graph_notice_rounded` is reachable only through `editNumber` (lesson actions, direct calls); typed input is rounded by NumberInput itself, which shows its own "snapped" hint.
- The notice (mode reset, rounded, time refused) persists in the status text until the next state change.
- Phasor arrow scale is capped by the panel width, so a tip's height equals the plotted value only when the cap does not bind.
- Slovenian: "Vrsta valovanja" for the mode choice, "pojav lažne frekvence (aliasing)" for the alias switch, "Nyquistova frekvenca" row shows fs against 2f (the Nyquist rate in English is 2f; the Slovenian README term kept).

## Review repairs
Observed before the fixes: `just unit src/graphs/functions/WavesGraph.test.tsx` with the new assertions, 6 failed (`.command-logs/wav02d-red.log`).
1. Sum phase: `WavesGraph.tsx` row `sum-phase` (about :739) shows `phasor.phase` (p1 + relative phase) through `wrapDegrees` into (-180, 180], the phase fields' range. Test "the sum phase is the phase of the sum": p1 40, p2 160 gives 100 deg (hand value); p1 170, p2 -150 gives -170; p1 = p2 = -180 gives 180. Failed before the fix; removing the `-180` branch of `wrapDegrees` fails the test (restored, `cmp` equal to `wav02d-wrap.bak`). Note: `docs/specs/waves-sampling-lessons.md:60` still says the phase is relative to component 1; spec not edited (not owned), to update.
2. Sinc: caption and `waves_graph_show_sinc_help` say truncated and approximate; the error row is `waves_graph_sinc_error_value` "0,0253 (na 0,4 do 0,6 s)", the window from the new constants `SINC_ERROR_FROM/TO` in `wavesDerived.ts` (used by `sincError` and the row). The window in the help text is written in the string, not formatted. Test asserts all three.
3. Nyquist row: "2f = 6 Hz; fs = 12 Hz je nad njo" (and "je enaka njej", "je pod njo (pojav lažne frekvence)"); English "is above it / equals it / is below it (aliasing)". Tests compare literal Slovenian strings in the three cases.
4. Reset uses `text("reset")` (`WavesGraph.tsx` PlaybackButtons); `waves_graph_reset_label` removed from both catalogs; the test presses `t('reset')`.

Checks: `just unit src/waves src/graphs/functions` 0, `npx tsc --noEmit --pretty false` 0 errors, `just lint src/waves src/graphs/functions` 0, `just build` 0; no trailing whitespace or control characters; no removed lines in `git diff -U0 -- src/localization`. Logs `.command-logs/wav02d-*.log`. The other three mutations were not repeated: the new assertions failed on the old code instead.
