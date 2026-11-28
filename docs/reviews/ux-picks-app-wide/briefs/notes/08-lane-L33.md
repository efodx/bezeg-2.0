# 08 lane L33 (mechanics-descent): HANDOFF, partial (budget signal)

## Done (observed)
- Parity recorded BEFORE the conversion: SAMPLES entry `mechanics-descent` (14 states, `scene(mode, params, t)` over `applyDescentAction`) in `src/graphs/base/declare/parity.test.tsx`, recording `src/graphs/mechanics/__parity__/mechanics-descent.json`. Old panel markers added: `data-readout-note` on the status `<p>` and the depth hint (text unchanged). `descentAccepted` is an EMPTY placeholder array (to fill).
- `DescentGraph.tsx` converted (not yet exercised by any test run): `DescentIds`, `declaration()` (params `descent-time` when tEnd>0, `descent-radius` off the track mode; rows = old rows with legend links; notes result/notice/ended/hint; legend line/arc/track/polygon/cycloid via `drawnElements` + `drawnObject`; actions play-pause, reset-time, puck actions show-cycloid (track) and show-arc (tautochrone); marks + followView = `frameFor`), `parameterBindings`, `performAction`, animation lease in `play()` (time listeners via `notifyHost`), caption stack and its helpers deleted, `frameAround` has no caption room, `showFrame/viewOf/reframeToSize/ResizeObserver/fitBoundingBox` removed (intent = frame, followView carries it), `notice` holds a `Message`, Orodja radius/cycloid/arc/time controls wrapped in `PuckOwned`, readout panel `data-declared-panel`.
- Fragment `src/localization/fragments/mechanics-descent.ts` (new), registered in `fragments/index.ts`.
- `just typecheck` passed (72 s) after all of the above (including old tests, which still compile).

## Not done
- Declaration test `DescentGraph.declaration.test.tsx` (new; red once), `descentAccepted` reasons (the sentence note lost the "Čas t s." prefix and the points sentence; tautochrone differ/bottom/arc sentences and the track status sentence are only rows now; captions gone), rewrite of the caption/frame/resize tests in `DescentGraph.test.tsx` (captions, "the view follows the board size" describe, `frameFor` top margin, owned object count, playback/slider tests need `runAs('learner')` or `puckControl`), `DescentLessonActions.host.test.tsx`, `descentPresetCollection.test.tsx` (runAs), `CurveGeometryFirstTask.test.tsx` descent case (time/radius leave Orodja), `sharedControls.graphs.test.tsx` / `PlaybackRoutes.test.tsx` check, lessons (`declare` frames: time puck steps mc1-release, mc3-release; radius mc1-explore, mc3-theorem, mc3-explore; cycloid switch mc2-cycloid, mc2-explore; arc mc3-arc, mc3-explore; thetas stay in Orodja, `open: ['tools']` in mc3-starts, mc3-explore, mode choice not asked; prose "drsnik časa" -> "krmilnik Čas"), eslint, all checks 2-7, shots.
- Not run: any unit test, graph-check, golden, preset round trip, build, smoke.

## Decisions
- Pucks: time, radius (race, tautochrone), show-cycloid (track), show-arc (tautochrone): at most 3 at once. Thetas (3 sliders, also draggable beads), points B/P1/P2 and the mode choice stay in Orodja.
- Route for graph-check: look up in `src/graphs/mechanics/registration.ts`.

## Files
Edited: `DescentGraph.tsx`, `parity.test.tsx`, `fragments/index.ts`. New: `mechanics-descent.ts` fragment, `__parity__/mechanics-descent.json`. Scratch to delete: `.command-logs/l33-*`.

# Session 2 (HANDOFF at the budget signal, partial)

## Done (observed)
- New `src/graphs/mechanics/DescentGraph.declaration.test.tsx` (11 tests; first run red 2 of 11 on wrong expectations of the default legend, fixed; now green). Actions `show-cycloid`/`show-arc` carry `help` (DescentGraph.tsx declaration).
- `descentAccepted` filled (parity.test.tsx: one missing and one extra note); `BEZEG_PARITY_CHECK=1 BEZEG_PARITY_ID=mechanics-descent` passes.
- Tests rewritten with replacements: `DescentGraph.test.tsx` (declared rows/notes/legend replace captions, `learner`/`lesson` helpers, puck assertions for time and radius, frame test replaces the resize and "follows board size" tests: the workspace follows the declared `followView`, asserted equal to `frameFor`; timer-count test now `toBeLessThanOrEqual`), `DescentLessonActions.host.test.tsx` (time/radius/switch writes as learner), `descentPresetCollection.test.tsx` (runAs), `CurveGeometryFirstTask.test.tsx` descent plan (time leaves Orodja). `sharedControls.graphs.test.tsx`, `PlaybackRoutes.test.tsx` name no descent: unchanged.
- Lessons (`mechanicalCurvesGuidedLessons.ts`): `declare` frames on mc1-release, mc1-explore, mc2-cycloid, mc2-explore, mc3-release, mc3-theorem, mc3-arc, mc3-starts (open tools), mc3-explore; prose "drsnik časa" -> "krmilnik Čas" (en "Time control"), theta sliders "v kartici Orodja".
- Observed passes: `just unit src/learning/content src/localization src/graphs/base src/graphs/mechanics` (1035 s), `just unit FirstTask` + sharedControls + PlaybackRoutes, preset round trip (mechanics-descent), `just typecheck`, `just lint` on mechanics dir and lesson file, `just build` (passed; 5 s, check freshness), graph-check contract/parity/declaration/shared/fuzz.
- Golden check FAILS as expected (not re-recorded): per state the notes gain the declared status sentence (no "Čas" prefix split, end-of-run and reset notice as own notes) and the depth hint; the captions lose "<track>: <time>", "Najhitrejša: ..", "Konec B (izračunan): ..", "Kroglica: t s", "g = 9,81 m/s²", the "Razlika do cikloide", "Tir: brez časa", bead rows ("Kroglica n, θ = ..: t s") and "Zaprta formula: .." (all are rows now); remaining captions: A, B, track names, bead tags, point tags.
- Screenshot (1440x900, warm) of /curve-geometry/descent: board with three tracks and name tags, Odčitki card with legend dashes on the three time rows, Orodja folded, puck strip with Čas t and Polmer r. Page needed more than 20 s on first load: first graph-check probe failed with a 20 s waitForFunction timeout (cold dev server).

## Not done / unverified
- graph-check probe rerun (a background run b64lrdj1z was started with `MSYS_NO_PATHCONV=1`; result not read: cat `.command-logs/l33-gc2.log`).
- Per-lesson-step shots at 1440x900 and 1280x720 and the "Prizora ni mogoče pripraviti" check; `just smoke-lesson mechanics-descent --port 4391 --workers=1`; specs naming descent (grep `tests/*.spec.cjs` found none checked); final rerun of declaration test and unit dirs after the last edit (the lint fix to the unused `settle` import was the last edit; mechanics dir not rerun after it); eslint was run only on mechanics dir and the lesson file.
- Tip: on Git Bash pass routes with `MSYS_NO_PATHCONV=1`.

## New files
`src/graphs/mechanics/DescentGraph.declaration.test.tsx`; (session 1) `src/localization/fragments/mechanics-descent.ts`, `src/graphs/mechanics/__parity__/mechanics-descent.json`. Scratch deleted: l33-edit1.cjs, l33-fix.py, l33-rec.log, l33-tsc.log and my l33-edit*.py/l33-lessons.py.

# Session 3 (all owed checks run; no source edits)
- `just unit src/graphs/mechanics src/graphs/base/declare`: passed (l33-unit3.log). `just lint` on all lane files: clean (l33-lint3.log). `tsc --noEmit`: clean (l33-tsc3.log).
- graph-check (l33-gc2.log, route /bezeg-2.0/curve-geometry/descent, base :4483): contract, parity, declaration (11), shared (12), probe, fuzz pass; golden FAILS as expected (handler re-records).
- Shots: `.command-logs/l33-steps.cjs` (own Playwright walk, since `just shot` cannot step lessons) -> `.command-logs/l33-shots/{mc1,mc2,mc3}-{1440,1280}-s*.png`, log l33-steps.log: no "Prizora ni mogoče pripraviti" on any frame; viewed mc1 s3 and mc2/mc3 at 1280: tracks, tags, key points visible, card left of A.
- `just build` then `just smoke-lesson mechanics-descent --port 4391 --workers=1`: passed (l33-smoke.log).
