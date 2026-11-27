# Lane L39 (waves): PARTIAL, session 2 hit the HANDOFF budget (175k). Graph converted and its declaration test is green; lessons, old tests, golden, browser, build, smoke not done.

## Done (session 2)
- Parity: markers `data-readout-note=""` on status and note `<p>` (WavesGraph.tsx `WavesReadout`); `functions/__parity__/waves.json` RECORDED (15 states, before conversion). Not yet checked with `BEZEG_PARITY_CHECK=1` / `just graph-check waves`.
- `src/graphs/functions/WavesGraph.tsx` converted:
  - `WavesIds`, `CARD_REFRESH_MS = 100` exported; `parameterBindings` (9 keys `waves-a1 p1 a2 p2 f1 f2 fs half-waves extra`, `DomainError` with `waves_value_rejected`), `declaration()` (pucks per mode, 5 switch actions with `puck: true`, rows from one `declaredRows()`, `status` and `computed` notes, legend per mode, marks = must box of `frameFor(derived)`), `drawnObject` (map `named`, filled by `as(id, element)` in `buildScene`), `performAction` (`runAs('learner')`).
  - Text is Message based: `statusMessage()`, `sentenceMessage()`, `declaredRows()`; `statusText()`, `sentence()`, `readoutRows()` render from them (one source). `notice.text` returns a Message.
  - Captions removed (all `caption(...)`, `captionSources`, `captionLines`, `CAPTION_*`); `frameFor(derived, {heightPx})` now reserves only the y title and tick row (top bare 1.3*peak, was 2.3*peak). Framing size vs master NOT checked in the browser.
  - Orodja: every slider in `PuckOwned` (key per slider), toggles in `PuckOwned` (action id), readout group has `data-declared-panel`. Mode select, playback and time slider stay (no key). Sampling `a1` stays in Orodja only (no step asks for the tone amplitude; wavesSampling... line 369 names the phase).
  - Time-dependent cards: `refreshCards()` = `store.notify()`; called on play, every `halt()` that stops a run, `setTime`, `resetTime`, mode reconcile, restore; while playing every >= 100 ms of accumulated frame time (`sinceCards`).
- `src/localization/fragments/waves.ts` (new) + registered in `fragments/index.ts` (4 spots). Keys: `waves_board_label`, `waves_status_join`, `waves_q_{s,hz,deg,rev}`, `waves_value_rejected`, puck names, legend labels.
- Retired from `sl.ts`/`en.ts` (deleted by `sed`, both languages): all `waves_graph_cap_*` (21 keys) and `waves_graph_board_label`. `docs/localization.md:249` still mentions "ton skozi pike (natančna rekonstrukcija)" in a glossary row (leave or reword).
- `src/graphs/functions/WavesGraph.declaration.test.tsx` (new): 8 states + arbiter snap/refusal + switch puck + 10 Hz card refresh test. GREEN (`just unit`, 11 tests). The red check (break a value) was NOT yet observed: do it next (e.g. change a row value or a legend `visible`, quote the failure).
- `tsc --noEmit`: only error left is `WavesGraph.test.tsx(12)` importing the removed `captionLines`.

## Not done / next (order)
1. Red check for the declaration test (break a row text or pressed, quote the failure, restore).
2. Fix `src/graphs/functions/WavesGraph.test.tsx` (imports `captionLines`; caption tests at about 142-153, 194-199, 223, 265-290, 334-347, 395-399 and the "captions on a narrow board" block 409-466: rewrite to assert legend, rows or marks; `frameFor` caption-room tests; slider helpers `field/enter/rangeOf` now find pucks, use `graph.parameters.write(key, v, 'learner')` or `puckControl`; direct `graph.setState`/lesson action calls need `runAs('lesson'|'learner', ...)`), `WavesLessonActions.host.test.tsx`, `wavesPresetCollection.test.tsx`, `wavesSamplingGuidedLessons.test.ts:589` (uses `waves_graph_cap_alias_exact`: assert the legend label `waves_legend_alias_exact` / fragment instead), `FunctionsFirstTask.test.tsx` waves case (first Edit control is the mode select; sliders are pucks on `[data-puck-strip]`).
3. Lesson frames: `frameDeclarer<WavesIds>()` in `wavesGuidedLessons.ts` and `wavesSamplingGuidedLessons.ts` (`declare: {explanation, calculation, observation}`); highlight rows named by the text (at most 3, present in that scene), `uses` the pucks a step asks for (`waves-p2` for wv1-phase and wv1-amplitudes(`waves-a2`), `waves-f2` wv2-difference, `show-envelope`, `waves-half-waves`, `waves-fs`, `waves-f1`, `waves-p1`, `show-alias/join/sinc`, `waves-extra` only where sinc is on). Reword prose that names old sliders/fields to "krmilnik <label>" / "control <label>" (`wavesGuidedLessons.ts` 124, 190, 302, 479; `wavesSamplingGuidedLessons.ts` 138, 159, 201, 222, 302, 323, 344, 365, 386, English twins), then fix pinning tests. Time-slider prompts stay.
4. Checks 1-9 of the dispatch: lint, `just graph-check waves --route <route>` (route in `runtime.ts`), golden diff (`BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t waves`; report, no re-record; expect caption/note differences), unit dirs, `just unit FirstTask`, preset round trip, browser shots 1440x900 and 1280x720 (`.command-logs/l39-*.png`: nothing a step names under a card; board at least two thirds of master), `just build`, `just smoke-lesson waves --port 4391 --workers=1`, specs `tests/guided-lessons.smoke.spec.cjs` and `tests/unified-learning.smoke.spec.cjs`.
5. Playback measurement on the free page at 1440x900, 5 s: average and p95 frame time, this branch vs https://efodx.github.io/bezeg-2.0/ (no master build; `git stash` forbidden). Write numbers here. NOT measured.
6. Unverified: marks box (bare frame, no pixel title/tick room) clears cards in the browser; legend swatch colours (nodes ring uses stroke colour); `waves-a1` etc. strict-mode writes from `applyLessonAction`/restore paths (declaration test ran them under `runAs('lesson')` only).

## Judgements
- Where controls go: pucks for what lesson steps ask to set or flip (see the `declaration()` doc comment); mode, play/pause/reset and time slider stay in Orodja (scene setup / no arbiter key).
- Legend default place: not set (bottom right default); check in shots whether it covers the plot.
- Rows wave1, wave2, sum, envelope, nodes, antinodes link to legend entries (the legend card drops those entries).

## New files
- `src/localization/fragments/waves.ts`
- `src/graphs/functions/WavesGraph.declaration.test.tsx`
- `src/graphs/functions/__parity__/waves.json` (recording)
- scratch (delete by name when done): `.command-logs/l39-edit1.py`, `l39-edit2.py`, `l39-edit3.py`, `l39-edit4.py`, `l39-edit5.py`, `l39-decl.txt`, `l39-record.log`, `l39-decl.log`
## Changed files
`src/graphs/functions/WavesGraph.tsx`, `src/graphs/base/declare/parity.test.tsx` (waves sample), `src/localization/{sl,en}.ts` (keys deleted), `src/localization/fragments/index.ts`.

## Session 3 (PARTIAL, HANDOFF at 175k)
### Done (observed)
- Red check: legend `visible` of the alias line (WavesGraph.tsx:610) negated, declaration test failed 2 of 11: "AssertionError: alias: expected false to be true". Restored. (A row-value break did NOT fail: row text and declared rows share `declaredRows()`; the legend/pucks/actions are the independent assertions.)
- Old tests fixed, no information check dropped (captions became legend/marks/rows assertions): `WavesGraph.test.tsx` 88/88 green; `WavesLessonActions.host.test.tsx`, `wavesPresetCollection.test.tsx` (runAs learner, puck writes via `parameters.write`); `wavesSamplingGuidedLessons.test.ts` (legend entry `waves_legend_alias_exact`); `FunctionsFirstTask.test.tsx` waves case (pucks `waves-a1 p1 a2 p2 f1 show-phasors` lead the strip; play and mode stay in Edit). `just unit FirstTask` passed.
- Two real fixes in `WavesGraph.tsx`: tick row in sampling mode now sits under the strip tick marks (`Math.max(STRIP_SQUARE_PX/uy, 0.1*peak())`, the shorter top room made the stem overlap the "0" tick); `halt(refresh)` does not refresh cards on disposal (`disposeFigureScene` calls `halt(false)`). Removed unused `PuckOwnedGroup` import.
- Lesson frames: `wavesGuidedLessons.ts`, `wavesSamplingGuidedLessons.ts` have `frameDeclarations(highlight, uses)` and a `DECLARED` table per step id; prose reworded to "krmilnik/control <puck name>" (Faza vala 2, Frekvenca vala 2, Število polvalov, Frekvenca tona, Frekv. vzorčenja, Faza tona, Dodatni vzorci); wv5-alias quotes "v legendi Ton skozi pike". `just unit src/learning/content/declarationContract src/learning/content/waves`: waves frames pass (only linear-map timed out, other worker's). Lesson tests and lessonMathNotation passed.
- `docs/localization.md:249` reworded. `npx tsc --noEmit`: clean. Lint on changed files: passed after two unused-import fixes.
- Scratch files deleted by name (session 2's and mine).

### Not done (next, in order)
1. `just graph-check waves --route <route>`: route not found yet (grep "waves" in `src/graphs/functions/runtime.ts` gave nothing; look in the route registry/`src/runtime`).
2. Golden diff summary (`BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t waves`), report only.
3. Unit dirs (`src/graphs/functions src/learning/content/waves src/learning/content/declarationContract src/localization`); preset round trip `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t waves`.
4. Browser shots 1440x900 and 1280x720 of view-changing steps; `just build`; `just smoke-lesson waves --port 4391 --workers=1`; `tests/guided-lessons.smoke.spec.cjs`, `tests/unified-learning.smoke.spec.cjs`.
5. Playback measurement (dev 4483 vs live site): NOT measured.
6. Still unverified: marks box clears cards in the browser; legend swatch colours; framing size vs master; `waves-*` strict writes from restore paths.
### New files this session
None (all edits to existing files). Remaining scratch in `.command-logs`: `l39-*` logs from this session (wt, o, ft, ls, fr, tsc, lint, red).

## Session 4
- graph-check waves --route functions/waves (.command-logs/l39s4-gc.log): contract, parity, declaration, shared pass; golden FAIL only because the golden is not re-recorded: 12 states differ in `notes` (new declared notes) and `captions` (board captions dropped, tick labels 0,75/1,5 dropped). No curve/point/value difference.
- Unit dirs (l39s4-unit.log), preset round trip (l39s4-rt.log), FirstTask (l39s4-ft.log): passed. build, smoke-lesson waves (2 passed), smoke-built waves rows of both specs, full unified-learning spec: passed (l39s4-*.log).
- Browser (dev 4483, shots .command-logs/l39-wv1-1440-s*.png, master l39-master-1440-s*.png): FAIL in lesson mode. Free page is fine. With the lesson card left and Odcitki right, the free rect is ~474 px wide of a 1320 px canvas, below the director's 1/2.2 limit (fitIntent maxOut), so the fit is clamped: the wheel sits half under the lesson card (step 1) and the plot runs under the Odcitki card (steps 3, 5; axis labels hidden). Plot is about a quarter of master's area. Not fixable in owned paths without changing the director limit or the card widths. 1280x720 shots and WV2-WV5 steps not taken.
- Playback 1440x900, 5 s rAF: dev 4483 avg 16.67 ms p95 16.70; live avg 16.67 p95 16.80 (both vsync bound; dev build is unminified).
- Scratch l39-* logs deleted; scripts l39s4-walk.cjs, l39s4-perf.cjs remain in .command-logs.
